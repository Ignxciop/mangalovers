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

export async function registerPresenceOnConnect(io, socket) {
  const userId = socket.data.userId;
  if (!userId) return;

  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);

  const friends = await getFriendIds(userId);

  for (const friendId of friends) {
    if (onlineUsers.has(friendId)) {
      io.to(`user:${friendId}`).emit("friend:online", { userId });
    }
  }

  const onlineFriendIds = friends.filter((fid) => onlineUsers.has(fid));
  socket.emit("presence:online_list", { userIds: onlineFriendIds });

  socket.on("disconnect", () => {
    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        onlineUsers.delete(userId);
        friends.forEach((friendId) => {
          io.to(`user:${friendId}`).emit("friend:offline", { userId });
        });
      }
    }
  });
}
