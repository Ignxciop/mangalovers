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
  return [...new Set(
    friendships.map((f) =>
      f.senderId === userId ? f.receiverId : f.senderId,
    ),
  )];
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

async function getUserHideOnline(userId) {
  const { prisma } = await import("../config/prisma.js");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hideOnline: true },
  });
  return user?.hideOnline ?? false;
}

async function joinPresence(io, socket, userId) {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, { sockets: new Set(), displayName: null });
  }
  onlineUsers.get(userId).sockets.add(socket.id);

  const userDisplayName = await getUserName(userId);
  onlineUsers.get(userId).displayName = userDisplayName;

  const friends = await getFriendIds(userId);

  for (const friendId of friends) {
    io.to(`user:${friendId}`).emit("friend:online", {
      userId,
      displayName: userDisplayName,
    });
  }

  const onlineFriendIds = friends.filter((fid) => onlineUsers.has(fid));
  socket.emit("presence:online_list", { userIds: onlineFriendIds });

  return friends;
}

async function leavePresence(io, userId, friends) {
  const entry = onlineUsers.get(userId);
  if (!entry) return;
  onlineUsers.delete(userId);
  friends.forEach((friendId) => {
    io.to(`user:${friendId}`).emit("friend:offline", {
      userId,
      displayName: entry.displayName,
    });
  });
}

export async function registerPresenceOnConnect(io, socket) {
  const userId = socket.data.userId;
  if (!userId) return;

  socket.hideOnline = await getUserHideOnline(userId);

  let friends = [];
  if (!socket.hideOnline) {
    friends = await joinPresence(io, socket, userId);
  }

  // Escuchar cambio de visibilidad online en vivo
  socket.on("presence:toggle-visibility", async ({ hideOnline: newValue }) => {
    if (typeof newValue !== "boolean") return;
    socket.hideOnline = newValue;

    if (newValue) {
      friends = await getFriendIds(userId);
      await leavePresence(io, userId, friends);
    } else {
      // Mostrar: entrar a presencia
      friends = await joinPresence(io, socket, userId);
    }
  });

  socket.on("disconnect", () => {
    if (socket.hideOnline) return;
    const entry = onlineUsers.get(userId);
    if (entry) {
      entry.sockets.delete(socket.id);
      if (entry.sockets.size === 0) {
        onlineUsers.delete(userId);
        friends.forEach((friendId) => {
          io.to(`user:${friendId}`).emit("friend:offline", {
            userId,
            displayName: entry.displayName,
          });
        });
      }
    }
  });
}
