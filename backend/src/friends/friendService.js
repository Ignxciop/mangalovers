import { prisma } from "../config/prisma.js";
import logger from "../config/logger.js";
import { ConflictError, NotFoundError, ForbiddenError, ValidationError } from "../utils/errors.js";
import { sendFriendRequestPush } from "../notifications/pushService.js";
import { createNotification } from "../notifications/notificationService.js";

export class FriendService {
  static async searchUsers(query, currentUserId) {
    if (!query || query.length < 2) {
      throw new ValidationError("La búsqueda debe tener al menos 2 caracteres");
    }

    const blockedMe = new Set();
    const blockedByMeResult = await prisma.friend.findMany({
      where: { receiverId: currentUserId, status: "BLOCKED" },
      select: { senderId: true },
    });
    blockedByMeResult.forEach((f) => blockedMe.add(f.senderId));

    const friendships = await prisma.friend.findMany({
      where: {
        OR: [
          { senderId: currentUserId },
          { receiverId: currentUserId },
        ],
      },
      select: { senderId: true, receiverId: true, status: true },
    });

    const friendStatus = new Map();
    friendships.forEach((f) => {
      const otherId = f.senderId === currentUserId ? f.receiverId : f.senderId;
      friendStatus.set(otherId, f.status);
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
      .filter((u) => !blockedMe.has(u.id))
      .map((u) => ({
        ...u,
        _friendStatus: friendStatus.get(u.id) ?? null,
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

    const friend = await prisma.friend.create({
      data: { senderId: currentUserId, receiverId, status: "PENDING" },
    });

    sendFriendRequestPush(currentUserId, receiverId).catch((err) =>
      logger.warn({ err }, "Error en push de solicitud de amistad"),
    );

    const sender = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { name: true, lastname: true },
    });

    if (sender) {
      createNotification({
        userId: receiverId,
        type: "FRIEND_REQUEST",
        title: "Nueva solicitud de amistad",
        body: `${sender.name} ${sender.lastname} te envió una solicitud de amistad`,
        data: { requestId: friend.id, senderId: currentUserId },
      }).catch((err) => logger.warn({ err }, "Error creando notificación"));
    }

    return friend;
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

    const updated = await prisma.friend.update({
      where: { id: requestId },
      data: { status: "ACCEPTED" },
      select: {
        id: true,
        status: true,
        sender: { select: { name: true, lastname: true } },
      },
    });

    const receiver = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, lastname: true },
    });

    if (receiver) {
      createNotification({
        userId: request.senderId,
        type: "FRIEND_ACCEPTED",
        title: "Solicitud de amistad aceptada",
        body: `${receiver.name} ${receiver.lastname} aceptó tu solicitud de amistad`,
        data: { friendId: userId },
      }).catch((err) => logger.warn({ err }, "Error creando notificación"));
    }

    return updated;
  }

  static async rejectRequest(userId, requestId) {
    await prisma.friend.deleteMany({
      where: { id: requestId, receiverId: userId, status: "PENDING" },
    });
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
    await prisma.friend.deleteMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: friendUserId, status: "ACCEPTED" },
          { senderId: friendUserId, receiverId: currentUserId, status: "ACCEPTED" },
        ],
      },
    });
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

  static async countReceivedRequests(userId) {
    return prisma.friend.count({
      where: { receiverId: userId, status: "PENDING" },
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
      distinct: ["userId"],
    });

    return reads.map((read) => ({
      userId: read.user.id,
      name: read.user.name,
      lastname: read.user.lastname,
      alias: read.user.alias,
      avatarUrl: read.user.avatarUrl,
      chapterId: read.chapter.id,
      chapterNumber: read.chapter.number,
      chapterName: read.chapter.name,
      readAt: read.createdAt,
    }));
  }

  static async getSeriesActivity(userId, seriesIds) {
    const friendships = await prisma.friend.findMany({
      where: {
        OR: [
          { senderId: userId, status: "ACCEPTED" },
          { receiverId: userId, status: "ACCEPTED" },
        ],
      },
      select: { senderId: true, receiverId: true },
    });

    if (friendships.length === 0) return {};

    const friendIds = friendships.map((f) =>
      f.senderId === userId ? f.receiverId : f.senderId,
    );

    const ids = seriesIds.map(Number);

    const [reads, favorites] = await Promise.all([
      prisma.userChapterRead.findMany({
        where: {
          userId: { in: friendIds },
          chapter: { seriesId: { in: ids } },
        },
        include: {
          user: {
            select: { id: true, name: true, lastname: true, alias: true, avatarUrl: true },
          },
          chapter: { select: { seriesId: true } },
        },
        distinct: ["userId", "chapterId"],
      }),
      prisma.userFavorite.findMany({
        where: {
          userId: { in: friendIds },
          seriesId: { in: ids },
        },
        include: {
          user: {
            select: { id: true, name: true, lastname: true, alias: true, avatarUrl: true },
          },
        },
      }),
    ]);

    const map = {};

    for (const read of reads) {
      const sid = read.chapter.seriesId;
      if (!map[sid]) map[sid] = new Map();
      if (!map[sid].has(read.user.id)) {
        map[sid].set(read.user.id, {
          userId: read.user.id,
          name: read.user.name,
          lastname: read.user.lastname,
          alias: read.user.alias,
          avatarUrl: read.user.avatarUrl,
        });
      }
    }

    for (const fav of favorites) {
      const sid = fav.seriesId;
      if (!map[sid]) map[sid] = new Map();
      if (!map[sid].has(fav.user.id)) {
        map[sid].set(fav.user.id, {
          userId: fav.user.id,
          name: fav.user.name,
          lastname: fav.user.lastname,
          alias: fav.user.alias,
          avatarUrl: fav.user.avatarUrl,
        });
      }
    }

    const result = {};
    for (const [sid, userMap] of Object.entries(map)) {
      result[sid] = Array.from(userMap.values());
    }

    return result;
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

  static async getActivityFeed(userId, page = 1, limit = 20, scope = "friends") {
    if (scope === "own") {
      const where = {
        userId,
        event: { in: ["MARK_READ", "ADD_FAVORITE", "REMOVE_FAVORITE"] },
      };

      const [data, total] = await Promise.all([
        prisma.userActivity.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            user: {
              select: { id: true, name: true, lastname: true, alias: true, avatarUrl: true },
            },
          },
        }),
        prisma.userActivity.count({ where }),
      ]);

      return { data, total };
    }

    const friends = await prisma.friend.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      select: { senderId: true, receiverId: true },
    });

    const friendIds = friends.map((f) =>
      f.senderId === userId ? f.receiverId : f.senderId,
    );

    const where = {
      userId: { in: friendIds },
      event: { in: ["MARK_READ", "ADD_FAVORITE", "REMOVE_FAVORITE"] },
    };

    const [data, total] = await Promise.all([
      prisma.userActivity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, lastname: true, alias: true, avatarUrl: true },
          },
        },
      }),
      prisma.userActivity.count({ where }),
    ]);

    return { data, total };
  }
}
