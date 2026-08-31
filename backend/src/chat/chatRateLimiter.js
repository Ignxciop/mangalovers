const MAX_MESSAGES = 5;
const WINDOW_MS = 10_000;
const timestamps = new Map(); // userId -> number[]

export function checkRateLimit(userId) {
  const now = Date.now();
  const arr = (timestamps.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_MESSAGES) return false;
  arr.push(now);
  timestamps.set(userId, arr);
  return true;
}