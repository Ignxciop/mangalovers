import { prisma } from "../config/prisma.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.js";
import { canViewProfile, canViewContent, getFriendStatusBetween } from "../utils/profileVisibility.js";
import { getUserFavorites } from "../favorite/favoriteService.js";

export class UserService {
  static async getProfileByAlias(alias, viewerId) {
    const user = await prisma.user.findUnique({
      where: { alias },
      select: {
        id: true, name: true, lastname: true, alias: true, avatarUrl: true,
        profileVisibility: true, createdAt: true,
      },
    });

    if (!user) throw new NotFoundError("Usuario no encontrado");

    if (!canViewProfile(viewerId, user)) {
      throw new ForbiddenError("Este perfil es privado");
    }

    const [friendCount, friendStatus] = await Promise.all([
      prisma.friend.count({
        where: {
          status: "ACCEPTED",
          OR: [{ senderId: user.id }, { receiverId: user.id }],
        },
      }),
      getFriendStatusBetween(viewerId, user.id),
    ]);

    return {
      ...user,
      friendCount,
      friendStatus,
      isOwner: viewerId === user.id,
    };
  }

  static async getProfileFavorites(alias, viewerId) {
    const user = await prisma.user.findUnique({
      where: { alias },
      select: {
        id: true, profileVisibility: true,
      },
    });

    if (!user) throw new NotFoundError("Usuario no encontrado");
    if (!canViewProfile(viewerId, user)) throw new ForbiddenError("Este perfil es privado");

    const canView = await canViewContent(viewerId, user);
    if (!canView) return [];

    return getUserFavorites(user.id);
  }

  static async getProfileActivity(alias, viewerId, page = 1, limit = 20) {
    const user = await prisma.user.findUnique({
      where: { alias },
      select: {
        id: true, profileVisibility: true,
      },
    });

    if (!user) throw new NotFoundError("Usuario no encontrado");
    if (!canViewProfile(viewerId, user)) throw new ForbiddenError("Este perfil es privado");

    const canView = await canViewContent(viewerId, user);
    if (!canView) return { data: [], total: 0 };

    const where = {
      userId: user.id,
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
