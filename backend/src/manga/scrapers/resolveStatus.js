import { prisma } from "../../config/prisma.js";

const STATUS_PRIORITY = [
  "Abandonado por el scan",
  "Pausado por el autor (Hiatus)",
  "En pausa",
  "Finalizado",
  "En emisión",
  "Activo",
];

const PRIORITY_MAP = Object.fromEntries(
  STATUS_PRIORITY.map((s, i) => [s.toLowerCase(), i]),
);

export function resolveStatus(current, incoming) {
  if (!current && !incoming) return null;
  if (!current) return incoming;
  if (!incoming) return current;

  const curP = PRIORITY_MAP[current.toLowerCase()] ?? -1;
  const incP = PRIORITY_MAP[incoming.toLowerCase()] ?? -1;

  return incP >= curP ? incoming : current;
}

export function isActiveStatus(status) {
  if (!status) return false;
  const p = PRIORITY_MAP[status.toLowerCase()];
  return p !== undefined && p >= (PRIORITY_MAP["en emisión"] ?? -1);
}

export async function updateSeriesStatus(seriesId, newStatus) {
  if (!newStatus) return;

  const series = await prisma.series.findUnique({
    where: { id: seriesId },
    select: { status: true },
  });

  if (!series) return;

  const resolved = resolveStatus(series.status, newStatus);
  if (resolved !== series.status) {
    await prisma.series.update({
      where: { id: seriesId },
      data: { status: resolved },
    });
  }
}

export async function promoteStatusIfInactive(seriesId, newChaptersFound) {
  if (!newChaptersFound) return;

  const series = await prisma.series.findUnique({
    where: { id: seriesId },
    select: { status: true },
  });

  if (!series?.status) return;
  if (isActiveStatus(series.status)) return;

  await prisma.series.update({
    where: { id: seriesId },
    data: { status: "Activo" },
  });
}
