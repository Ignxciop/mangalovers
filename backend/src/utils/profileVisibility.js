import { prisma } from "../config/prisma.js";

export function canViewProfile(viewerId, targetUser) {
  if (viewerId === targetUser.id) return true;
  if (targetUser.profileVisibility === "PUBLIC") return true;
  if (targetUser.profileVisibility === "FRIENDS") return true;
  return false;
}

export async function canViewContent(viewerId, targetUser) {
  if (viewerId === targetUser.id) return true;
  if (targetUser.profileVisibility === "PUBLIC") return true;
  if (targetUser.profileVisibility === "FRIENDS") {
    return viewerId != null && areFriends(viewerId, targetUser.id);
  }
  return false;
}

export async function getFriendStatusBetween(viewerId, targetUserId) {
  if (!viewerId || viewerId === targetUserId) return null;

  const friendship = await prisma.friend.findFirst({
    where: {
      OR: [
        { senderId: viewerId, receiverId: targetUserId },
        { senderId: targetUserId, receiverId: viewerId },
      ],
    },
    select: { senderId: true, status: true },
  });

  if (!friendship) return null;
  return friendship.status;
}

export async function areFriends(viewerId, targetUserId) {
  if (!viewerId) return false;

  const friendship = await prisma.friend.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { senderId: viewerId, receiverId: targetUserId },
        { senderId: targetUserId, receiverId: viewerId },
      ],
    },
    select: { id: true },
  });

  return !!friendship;
}
