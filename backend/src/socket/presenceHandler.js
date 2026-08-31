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

async function getUserPresenceFlags(userId) {
  const { prisma } = await import("../config/prisma.js");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hideOnline: true, profileVisibility: true },
  });
  if (!user) return { hideOnline: false, profileVisibility: "PUBLIC" };
  return {
    hideOnline: user.hideOnline,
    profileVisibility: user.profileVisibility,
  };
}

function isUserVisible({ hideOnline, profileVisibility }) {
  return !hideOnline && profileVisibility !== "PRIVATE";
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

async function leavePresence(io, userId) {
  const entry = onlineUsers.get(userId);
  if (!entry) return;
  onlineUsers.delete(userId);
  const friends = await getFriendIds(userId);
  friends.forEach((friendId) => {
    io.to(`user:${friendId}`).emit("friend:offline", {
      userId,
      displayName: entry.displayName,
    });
  });
}

async function refreshPresence(io, socket) {
  const flags = await getUserPresenceFlags(socket.data.userId);
  const visible = isUserVisible(flags);

  if (visible && !socket._presenceVisible) {
    await joinPresence(io, socket, socket.data.userId);
  } else if (!visible && socket._presenceVisible) {
    await leavePresence(io, socket.data.userId);
  }

  socket._presenceVisible = visible;
}

export async function registerPresenceOnConnect(io, socket) {
  const userId = socket.data.userId;
  if (!userId) return;

  socket._presenceVisible = false;

  await refreshPresence(io, socket);

  socket.on("presence:toggle-visibility", () => {
    refreshPresence(io, socket);
  });

  socket.on("presence:refresh", () => {
    refreshPresence(io, socket);
  });

  socket.on("disconnect", async () => {
    if (!socket._presenceVisible) return;
    const entry = onlineUsers.get(userId);
    if (!entry) return;
    entry.sockets.delete(socket.id);
    if (entry.sockets.size === 0) {
      onlineUsers.delete(userId);
      const friends = await getFriendIds(userId);
      friends.forEach((friendId) => {
        io.to(`user:${friendId}`).emit("friend:offline", {
          userId,
          displayName: entry.displayName,
        });
      });
    }
  });
}
