import { describe, it, expect, vi, beforeEach } from "vitest";

const {
    mockProviderSeriesFindUnique,
    mockSeriesFindUnique,
    mockSeriesUpdate,
    mockSeriesUpsert,
    mockProviderSeriesUpdate,
    mockProviderSeriesUpsert,
} = vi.hoisted(() => ({
    mockProviderSeriesFindUnique: vi.fn(),
    mockSeriesFindUnique: vi.fn(),
    mockSeriesUpdate: vi.fn(),
    mockSeriesUpsert: vi.fn(),
    mockProviderSeriesUpdate: vi.fn(),
    mockProviderSeriesUpsert: vi.fn(),
}));

vi.mock("../../../src/config/prisma.js", () => ({
    prisma: {
        providerSeries: {
            findUnique: mockProviderSeriesFindUnique,
            update: mockProviderSeriesUpdate,
            upsert: mockProviderSeriesUpsert,
        },
        series: {
            findUnique: mockSeriesFindUnique,
            update: mockSeriesUpdate,
            upsert: mockSeriesUpsert,
        },
        provider: { findUnique: vi.fn() },
        $transaction: vi.fn(async (cb) => {
            const tx = {
                series: {
                    update: mockSeriesUpdate,
                    upsert: mockSeriesUpsert,
                },
                providerSeries: {
                    update: mockProviderSeriesUpdate,
                    upsert: mockProviderSeriesUpsert,
                },
            };
            return cb(tx);
        }),
    },
}));

vi.mock("../../../src/config/logger.js", () => ({
    default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../../src/manga/scrapers/syncGenres.js", () => ({
    syncGenres: vi.fn(),
}));

vi.mock("axios", () => ({
    default: { get: vi.fn() },
}));

import { processSeries } from "../../../src/manga/scrapers/olympus/series_scraper.js";

const baseProviderSeries = {
    providerId: 1,
    externalId: "42",
    seriesId: 10,
    slug: "academia-20260718-110225617",
    series: {
        id: 10,
        slug: "academia-20260718-110225617",
        name: "Academia",
        metadataFetchedAt: new Date(),
        summary: "Resumen",
    },
};

describe("olympus series_scraper.processSeries", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("no sobrescribe series.slug cuando el slug del proveedor cambia", async () => {
        mockProviderSeriesFindUnique.mockResolvedValue(baseProviderSeries);

        await processSeries(
            {
                id: 42,
                slug: "academia-20260816-110435072",
                name: "Academia",
                chapter_count: 120,
                status: { name: "En emisión" },
                cover: null,
            },
            1,
        );

        const updateCall = mockSeriesUpdate.mock.calls[0];
        expect(updateCall).toBeDefined();
        expect(updateCall[0].where).toEqual({ id: 10 });
        expect(updateCall[0].data).not.toHaveProperty("slug");

        const providerUpdateCall = mockProviderSeriesUpdate.mock.calls[0];
        expect(providerUpdateCall[0].data).toEqual({
            slug: "academia-20260816-110435072",
        });
    });

    it("actualiza series.slug solo al crear la serie", async () => {
        mockProviderSeriesFindUnique.mockResolvedValue(null);
        mockSeriesFindUnique.mockResolvedValue(null);
        mockSeriesUpsert.mockResolvedValue({ id: 10 });

        await processSeries(
            {
                id: 42,
                slug: "academia-nueva",
                name: "Academia",
                chapter_count: 5,
                status: { name: "En emisión" },
                cover: null,
            },
            1,
        );

        const upsertCall = mockSeriesUpsert.mock.calls[0];
        expect(upsertCall).toBeDefined();
        expect(upsertCall[0].create.slug).toBe("academia-nueva");
        expect(upsertCall[0].update).not.toHaveProperty("slug");

        const providerUpsertCall = mockProviderSeriesUpsert.mock.calls[0];
        expect(providerUpsertCall[0].create.slug).toBe("academia-nueva");
    });
});