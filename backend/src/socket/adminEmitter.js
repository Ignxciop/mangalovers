let io = null;

export function setAdminEmitterIO(instance) {
  io = instance;
}

export function emitAdminEvent(event, data) {
  if (!io) return;
  io.to("admin").emit(event, data);
}
