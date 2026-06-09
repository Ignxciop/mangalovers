import logger from "../config/logger.js";

const onlineUsers = new Map();

export function getOnlineUsers() {
  return onlineUsers;
}

async function getFriendIds(userId) {
  const { prisma } = await import("../config/prisma.js");
  const friendships = await prisma.friend.findMany({
    where: {
      OR: [
        { senderId: userId, status: "ACCEPTED" },
        { receiverId: userId, status: "ACCEPTED" },
      ],
    },
    select: { senderId: true, receiverId: true },
  });
  return friendships.map((f) =>
    f.senderId === userId ? f.receiverId : f.senderId,
  );
}

async function getUserName(userId) {
  const { prisma } = await import("../config/prisma.js");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, lastname: true, alias: true },
  });
  if (!user) return userId;
  return user.alias || `${user.name} ${user.lastname}`;
}

export async function registerPresenceOnConnect(io, socket) {
  const userId = socket.data.userId;
  if (!userId) return;

  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, { sockets: new Set(), displayName: null });
  }
  onlineUsers.get(userId).sockets.add(socket.id);

  const userDisplayName = await getUserName(userId);
  onlineUsers.get(userId).displayName = userDisplayName;

  const friends = await getFriendIds(userId);

  for (const friendId of friends) {
    if (onlineUsers.has(friendId)) {
      io.to(`user:${friendId}`).emit("friend:online", {
        userId,
        displayName: userDisplayName,
      });
    }
  }

  const onlineFriendIds = friends.filter((fid) => onlineUsers.has(fid));
  socket.emit("presence:online_list", { userIds: onlineFriendIds });

  socket.on("disconnect", () => {
    const entry = onlineUsers.get(userId);
    if (entry) {
      entry.sockets.delete(socket.id);
      if (entry.sockets.size === 0) {
        onlineUsers.delete(userId);
        friends.forEach((friendId) => {
          io.to(`user:${friendId}`).emit("friend:offline", { userId });
        });
      }
    }
  });
}
