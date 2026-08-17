export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "America/Santiago";

export function getZonedParts(date, tz = APP_TIMEZONE) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(date).map((p) => [p.type, p.value]),
  );
  const y = Number(parts.year);
  const m = Number(parts.month);
  const d = Number(parts.day);
  const h = Number(parts.hour);
  const min = Number(parts.minute);
  const s = Number(parts.second);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { y, m, d, h, min, s, weekday };
}

function zonedDateTimeToInstant(y, m, d, h, min, s, tz) {
  let guess = Date.UTC(y, m - 1, d, h, min, s);
  for (let i = 0; i < 3; i++) {
    const p = getZonedParts(new Date(guess), tz);
    const wall = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
    guess = Date.UTC(y, m - 1, d, h, min, s) - (wall - guess);
  }
  return guess;
}

export function startOfDay(date = new Date(), tz = APP_TIMEZONE) {
  const { y, m, d } = getZonedParts(date, tz);
  return new Date(zonedDateTimeToInstant(y, m, d, 0, 0, 0, tz));
}

export function startOfWeek(date = new Date(), tz = APP_TIMEZONE) {
  const { y, m, d, weekday } = getZonedParts(date, tz);
  const daysSinceMonday = (weekday + 6) % 7;
  return new Date(zonedDateTimeToInstant(y, m, d - daysSinceMonday, 0, 0, 0, tz));
}

export function startOfMonth(date = new Date(), tz = APP_TIMEZONE) {
  const { y, m } = getZonedParts(date, tz);
  return new Date(zonedDateTimeToInstant(y, m, 1, 0, 0, 0, tz));
}

export function getWeekSeed(date = new Date(), tz = APP_TIMEZONE) {
  const { y, m, d } = getZonedParts(date, tz);
  const start = new Date(Date.UTC(y, 0, 1));
  const diff = Date.UTC(y, m - 1, d) - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);
  const week = Math.ceil((dayOfYear + start.getUTCDay() + 1) / 7);
  return `${y}-${String(week).padStart(2, "0")}`;
}
