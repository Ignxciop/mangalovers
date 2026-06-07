import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: {
    series: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    seriesRelation: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "../../../src/config/prisma.js";
import { resolveSeriesCluster, resolvePrimaryBySlug, batchResolveFallbackCovers } from "../../../src/manga/seriesCluster.js";

function makeSeries(id, overrides = {}) {
  return {
    id,
    name: `Series ${id}`,
    slug: `series-${id}`,
    cover: null,
    status: "En emisión",
    summary: "A test series",
    type: "Manga",
    providerSeries: [],
    primaryRelations: [],
    fallbackRelations: [],
    ...overrides,
  };
}

function makeProvider(name, priority = 99) {
  return { id: 1, name, priority };
}

describe("resolveSeriesCluster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna null si la serie no existe", async () => {
    prisma.seriesRelation.findMany.mockResolvedValue([]);
    prisma.series.findMany.mockResolvedValue([]);

    const result = await resolveSeriesCluster(999);
    expect(result).toBeNull();
  });

  it("retorna cluster con un solo miembro si no hay relaciones", async () => {
    const series = makeSeries(1);
    prisma.seriesRelation.findMany.mockResolvedValue([]);
    prisma.series.findMany.mockResolvedValue([series]);

    const result = await resolveSeriesCluster(1);

    expect(result).not.toBeNull();
    expect(result.primary.id).toBe(1);
    expect(result.fallbacks).toHaveLength(0);
    expect(result.allIds).toEqual([1]);
  });

  it("usa provider priority como fallback si no hay relaciones", async () => {
    const providerA = makeProvider("olympus", 1);
    const providerB = makeProvider("manhwaweb", 2);

    const seriesA = makeSeries(1, { providerSeries: [{ provider: providerA }] });
    const seriesB = makeSeries(2, { providerSeries: [{ provider: providerB }] });

    prisma.seriesRelation.findMany.mockResolvedValue([
      { primarySeriesId: 1, fallbackSeriesId: 2 },
    ]);
    prisma.series.findMany.mockResolvedValue([seriesA, seriesB]);

    const result = await resolveSeriesCluster(1);

    expect(result.primary.id).toBe(1);
    expect(result.fallbacks).toHaveLength(1);
    expect(result.fallbacks[0].id).toBe(2);
  });

  it("respeta la direccion de SeriesRelation como primaria", async () => {
    const providerA = makeProvider("olympus", 99);
    const providerB = makeProvider("manhwaweb", 1);

    const seriesA = makeSeries(1, { providerSeries: [{ provider: providerA }] });
    const seriesB = makeSeries(2, { providerSeries: [{ provider: providerB }] });

    prisma.seriesRelation.findMany.mockResolvedValue([
      { primarySeriesId: 1, fallbackSeriesId: 2 },
    ]);
    prisma.series.findMany.mockResolvedValue([seriesA, seriesB]);

    const result = await resolveSeriesCluster(1);

    expect(result.primary.id).toBe(1);
    expect(result.fallbacks[0].id).toBe(2);
  });

  it("ignora provider priority cuando hay SeriesRelation", async () => {
    const providerA = makeProvider("olympus", 99);
    const providerB = makeProvider("manhwaweb", 1);

    const seriesA = makeSeries(10, { providerSeries: [{ provider: providerA }] });
    const seriesB = makeSeries(5, { providerSeries: [{ provider: providerB }] });

    prisma.seriesRelation.findMany.mockResolvedValue([
      { primarySeriesId: 10, fallbackSeriesId: 5 },
    ]);
    prisma.series.findMany.mockResolvedValue([seriesA, seriesB]);

    const result = await resolveSeriesCluster(10);

    expect(result.primary.id).toBe(10);
    expect(result.fallbacks[0].id).toBe(5);
  });

  it("maneja entrada desde el fallback y resuelve la primaria correcta", async () => {
    const seriesA = makeSeries(1);
    const seriesB = makeSeries(2);

    prisma.seriesRelation.findMany.mockResolvedValue([
      { primarySeriesId: 1, fallbackSeriesId: 2 },
    ]);
    prisma.series.findMany.mockResolvedValue([seriesA, seriesB]);

    const result = await resolveSeriesCluster(2);

    expect(result.primary.id).toBe(1);
    expect(result.fallbacks[0].id).toBe(2);
  });

  it("incluye multiples fallbacks en el cluster", async () => {
    const primary = makeSeries(1);
    const fb1 = makeSeries(2);
    const fb2 = makeSeries(3);

    prisma.seriesRelation.findMany.mockResolvedValue([
      { primarySeriesId: 1, fallbackSeriesId: 2 },
      { primarySeriesId: 1, fallbackSeriesId: 3 },
    ]);
    prisma.series.findMany.mockResolvedValue([primary, fb1, fb2]);

    const result = await resolveSeriesCluster(1);

    expect(result.primary.id).toBe(1);
    expect(result.fallbacks).toHaveLength(2);
    expect(result.allIds).toEqual(expect.arrayContaining([1, 2, 3]));
  });

  it("incluye allIds con todos los miembros del cluster", async () => {
    const primary = makeSeries(1);
    const fb = makeSeries(2);

    prisma.seriesRelation.findMany.mockResolvedValue([
      { primarySeriesId: 1, fallbackSeriesId: 2 },
    ]);
    prisma.series.findMany.mockResolvedValue([primary, fb]);

    const result = await resolveSeriesCluster(1);

    expect(result.allIds).toEqual(expect.arrayContaining([1, 2]));
    expect(result.allIds.length).toBe(2);
  });
});

describe("resolvePrimaryBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna null si el slug no existe", async () => {
    prisma.series.findUnique.mockResolvedValue(null);

    const result = await resolvePrimaryBySlug("no-existe");
    expect(result).toBeNull();
  });

  it("resuelve el cluster desde un slug", async () => {
    const series = makeSeries(1, { slug: "mi-serie" });

    prisma.series.findUnique.mockResolvedValueOnce(series);
    prisma.seriesRelation.findMany.mockResolvedValue([]);
    prisma.series.findMany.mockResolvedValue([series]);

    const result = await resolvePrimaryBySlug("mi-serie");

    expect(result).not.toBeNull();
    expect(result.primary.slug).toBe("mi-serie");
  });
});

describe("batchResolveFallbackCovers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna Map vacio con array vacio", async () => {
    const result = await batchResolveFallbackCovers([]);
    expect(result.size).toBe(0);
  });

  it("retorna cover de fallback para una primaria", async () => {
    prisma.seriesRelation.findMany.mockResolvedValue([
      {
        primarySeriesId: 1,
        fallbackSeriesId: 2,
        primarySeries: { cover: null },
        fallbackSeries: { cover: "https://example.com/cover.jpg" },
      },
    ]);

    const result = await batchResolveFallbackCovers([1]);

    expect(result.get(1)).toBe("https://example.com/cover.jpg");
  });

  it("retorna cover de primaria para una fallback", async () => {
    prisma.seriesRelation.findMany.mockResolvedValue([
      {
        primarySeriesId: 1,
        fallbackSeriesId: 2,
        primarySeries: { cover: "https://example.com/primary.jpg" },
        fallbackSeries: { cover: null },
      },
    ]);

    const result = await batchResolveFallbackCovers([2]);

    expect(result.get(2)).toBe("https://example.com/primary.jpg");
  });

  it("ignora urls invalidas", async () => {
    prisma.seriesRelation.findMany.mockResolvedValue([
      {
        primarySeriesId: 1,
        fallbackSeriesId: 2,
        primarySeries: { cover: null },
        fallbackSeries: { cover: "not-a-url" },
      },
    ]);

    const result = await batchResolveFallbackCovers([1]);

    expect(result.has(1)).toBe(false);
  });
});
