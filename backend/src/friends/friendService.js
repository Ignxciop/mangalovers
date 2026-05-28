import { prisma } from "../config/prisma.js";
import { ConflictError, NotFoundError, ForbiddenError, ValidationError } from "../utils/errors.js";

export class FriendService {
  static async searchUsers(query, currentUserId) {
    if (!query || query.length < 2) {
      throw new ValidationError("La búsqueda debe tener al menos 2 caracteres");
    }

    const blockedUserIds = new Set();

    const blockedByMe = await prisma.friend.findMany({
      where: { senderId: currentUserId, status: "BLOCKED" },
      select: { receiverId: true },
    });
    blockedByMe.forEach((f) => blockedUserIds.add(f.receiverId));

    const blockedMe = await prisma.friend.findMany({
      where: { receiverId: currentUserId, status: "BLOCKED" },
      select: { senderId: true },
    });
    blockedMe.forEach((f) => blockedUserIds.add(f.senderId));

    const friendIds = new Set();
    const friendships = await prisma.friend.findMany({
      where: {
        OR: [
          { senderId: currentUserId, status: { in: ["PENDING", "ACCEPTED"] } },
          { receiverId: currentUserId, status: { in: ["PENDING", "ACCEPTED"] } },
        ],
      },
      select: { senderId: true, receiverId: true },
    });
    friendships.forEach((f) => {
      const otherId = f.senderId === currentUserId ? f.receiverId : f.senderId;
      friendIds.add(otherId);
    });

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { alias: { contains: query, mode: "insensitive" } },
              { name: { contains: query, mode: "insensitive" } },
              { lastname: { contains: query, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        lastname: true,
        alias: true,
        avatarUrl: true,
      },
      take: 20,
    });

    return users
      .filter((u) => !blockedUserIds.has(u.id))
      .map((u) => ({
        ...u,
        _friendStatus: friendIds.has(u.id)
          ? (friendships.find(
              (f) =>
                (f.senderId === currentUserId && f.receiverId === u.id) ||
                (f.receiverId === currentUserId && f.senderId === u.id),
            )?.status ?? null)
          : null,
      }));
  }

  static async sendRequest(currentUserId, receiverId) {
    if (currentUserId === receiverId) {
      throw new ValidationError("No puedes enviarte una solicitud a ti mismo");
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });
    if (!receiver) throw new NotFoundError("Usuario no encontrado");

    const existing = await prisma.friend.findFirst({
      where: {
        OR: [
          { senderId: currentUserId, receiverId },
          { senderId: receiverId, receiverId: currentUserId },
        ],
      },
    });

    if (existing) {
      if (existing.status === "ACCEPTED") {
        throw new ConflictError("Ya son amigos");
      }
      if (existing.status === "PENDING") {
        if (existing.senderId === currentUserId) {
          throw new ConflictError("Ya enviaste una solicitud a este usuario");
        }
        throw new ConflictError("Este usuario ya te envió una solicitud");
      }
      if (existing.status === "BLOCKED") {
        throw new ForbiddenError("No puedes enviar una solicitud a este usuario");
      }
    }

    return prisma.friend.create({
      data: { senderId: currentUserId, receiverId, status: "PENDING" },
    });
  }

  static async acceptRequest(userId, requestId) {
    const request = await prisma.friend.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundError("Solicitud no encontrada");
    if (request.receiverId !== userId) {
      throw new ForbiddenError("No puedes aceptar esta solicitud");
    }
    if (request.status !== "PENDING") {
      throw new ConflictError("La solicitud ya fue procesada");
    }

    return prisma.friend.update({
      where: { id: requestId },
      data: { status: "ACCEPTED" },
    });
  }

  static async rejectRequest(userId, requestId) {
    const request = await prisma.friend.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundError("Solicitud no encontrada");
    if (request.receiverId !== userId) {
      throw new ForbiddenError("No puedes rechazar esta solicitud");
    }
    if (request.status !== "PENDING") {
      throw new ConflictError("La solicitud ya fue procesada");
    }

    await prisma.friend.delete({ where: { id: requestId } });
  }

  static async blockUser(currentUserId, targetUserId) {
    if (currentUserId === targetUserId) {
      throw new ValidationError("No puedes bloquearte a ti mismo");
    }

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });
    if (!target) throw new NotFoundError("Usuario no encontrado");

    const existing = await prisma.friend.findFirst({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: currentUserId },
        ],
      },
    });

    if (existing) {
      return prisma.friend.update({
        where: { id: existing.id },
        data: { status: "BLOCKED", blockedById: currentUserId },
      });
    }

    return prisma.friend.create({
      data: {
        senderId: currentUserId,
        receiverId: targetUserId,
        status: "BLOCKED",
        blockedById: currentUserId,
      },
    });
  }

  static async unblockUser(currentUserId, targetUserId) {
    const existing = await prisma.friend.findFirst({
      where: {
        senderId: currentUserId,
        receiverId: targetUserId,
        status: "BLOCKED",
      },
    });
    if (!existing) throw new NotFoundError("No tienes bloqueado a este usuario");

    await prisma.friend.delete({ where: { id: existing.id } });
  }

  static async removeFriend(currentUserId, friendUserId) {
    const friendship = await prisma.friend.findFirst({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: friendUserId, status: "ACCEPTED" },
          { senderId: friendUserId, receiverId: currentUserId, status: "ACCEPTED" },
        ],
      },
    });
    if (!friendship) throw new NotFoundError("Amistad no encontrada");

    await prisma.friend.delete({ where: { id: friendship.id } });
  }

  static async getFriends(userId) {
    const friendships = await prisma.friend.findMany({
      where: {
        OR: [
          { senderId: userId, status: "ACCEPTED" },
          { receiverId: userId, status: "ACCEPTED" },
        ],
      },
      include: {
        sender: { select: { id: true, name: true, lastname: true, alias: true, avatarUrl: true } },
        receiver: { select: { id: true, name: true, lastname: true, alias: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return friendships.map((f) => {
      const friend = f.senderId === userId ? f.receiver : f.sender;
      return { friendshipId: f.id, ...friend, friendSince: f.updatedAt };
    });
  }

  static async getReceivedRequests(userId) {
    const requests = await prisma.friend.findMany({
      where: { receiverId: userId, status: "PENDING" },
      include: {
        sender: { select: { id: true, name: true, lastname: true, alias: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return requests.map((r) => ({
      id: r.id,
      sender: r.sender,
      createdAt: r.createdAt,
    }));
  }

  static async getSentRequests(userId) {
    const requests = await prisma.friend.findMany({
      where: { senderId: userId, status: "PENDING" },
      include: {
        receiver: { select: { id: true, name: true, lastname: true, alias: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return requests.map((r) => ({
      id: r.id,
      receiver: r.receiver,
      createdAt: r.createdAt,
    }));
  }

  static async getFriendReadsForSeries(userId, seriesId) {
    const friendships = await prisma.friend.findMany({
      where: {
        OR: [
          { senderId: userId, status: "ACCEPTED" },
          { receiverId: userId, status: "ACCEPTED" },
        ],
      },
      select: { senderId: true, receiverId: true },
    });

    if (friendships.length === 0) return [];

    const friendIds = friendships.map((f) =>
      f.senderId === userId ? f.receiverId : f.senderId,
    );

    const reads = await prisma.userChapterRead.findMany({
      where: {
        userId: { in: friendIds },
        chapter: { seriesId: Number(seriesId) },
      },
      include: {
        user: {
          select: { id: true, name: true, lastname: true, alias: true, avatarUrl: true },
        },
        chapter: {
          select: { id: true, name: true, number: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const latestPerFriend = new Map();
    for (const read of reads) {
      if (!latestPerFriend.has(read.userId)) {
        latestPerFriend.set(read.userId, {
          userId: read.user.id,
          name: read.user.name,
          lastname: read.user.lastname,
          alias: read.user.alias,
          avatarUrl: read.user.avatarUrl,
          chapterId: read.chapter.id,
          chapterNumber: read.chapter.number,
          chapterName: read.chapter.name,
          readAt: read.createdAt,
        });
      }
    }

    return Array.from(latestPerFriend.values());
  }

  static async getBlockedUsers(userId) {
    const blocks = await prisma.friend.findMany({
      where: { senderId: userId, status: "BLOCKED" },
      include: {
        receiver: { select: { id: true, name: true, lastname: true, alias: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return blocks.map((b) => ({
      id: b.id,
      user: b.receiver,
      blockedAt: b.updatedAt,
    }));
  }
}
