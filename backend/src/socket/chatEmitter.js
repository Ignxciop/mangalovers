let io = null;

export function setChatEmitterIO(instance) {
  io = instance;
}

export function emitChatEvent(event, data) {
  if (!io) return;
  io.to("chat:global").emit(event, data);
}