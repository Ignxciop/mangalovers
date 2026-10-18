import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockProviderSeriesFindFirst, mockPageCreateMany, mockChapterUpdate } = vi.hoisted(() => ({
    mockProviderSeriesFindFirst: vi.fn(),
    mockPageCreateMany: vi.fn(),
    mockChapterUpdate: vi.fn(),
}));

vi.mock("../../../src/config/prisma.js", () => ({
    prisma: {
        providerSeries: { findFirst: mockProviderSeriesFindFirst },
        page: { createMany: mockPageCreateMany },
        chapter: { update: mockChapterUpdate, findUnique: vi.fn() },
        scraperConfig: { findFirst: vi.fn().mockResolvedValue(null) },
        provider: { findUnique: vi.fn() },
        $disconnect: vi.fn(),
    },
}));

vi.mock("../../../src/config/logger.js", () => ({
    default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../../src/manga/scrapers/scraperAbort.js", () => ({
    getAbortSignal: () => ({ aborted: false }),
}));

vi.mock("../../../src/notifications/pushService.js", () => ({
    notifyNewChapter: vi.fn(),
}));

vi.mock("axios", () => ({
    default: { get: vi.fn() },
}));

import axios from "axios";
import logger from "../../../src/config/logger.js";
import {
    buildOlympusChapterPagesUrl,
    processChapterPages,
} from "../../../src/manga/scrapers/olympus/pages_scraper.js";

const basePc = (overrides = {}) => ({
    id: 77,
    chapterId: 5,
    providerId: 1,
    externalId: "134192",
    externalName: "184",
    chapter: {
        id: 5,
        name: "999",
        seriesId: 10,
        createdAt: new Date("2020-01-01"),
    },
    ...overrides,
});

describe("olympus pages_scraper.buildOlympusChapterPagesUrl", () => {
    it("usa el nombre del capítulo como segmento", () => {
        expect(buildOlympusChapterPagesUrl("20-225-2sabueso13424", "184")).toBe(
            "https://olympusxyz.com/api/capitulo/20-225-2sabueso13424/184",
        );
    });

    it("escapa caracteres especiales del nombre", () => {
        expect(buildOlympusChapterPagesUrl("mi-slug", "cap 5/a")).toBe(
            "https://olympusxyz.com/api/capitulo/mi-slug/cap%205%2Fa",
        );
    });

    it("conserva puntos en nombres decimales (114.1)", () => {
        expect(buildOlympusChapterPagesUrl("mi-slug", "114.1")).toBe(
            "https://olympusxyz.com/api/capitulo/mi-slug/114.1",
        );
    });

    it("no incluye type=comic ni otros parámetros", () => {
        const url = buildOlympusChapterPagesUrl("mi-slug", "184");
        expect(url).not.toContain("type=");
        expect(url).not.toContain("?");
    });
});

describe("olympus pages_scraper.processChapterPages", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockProviderSeriesFindFirst.mockResolvedValue({ slug: "mi-slug" });
        mockPageCreateMany.mockResolvedValue({ count: 2 });
        mockChapterUpdate.mockResolvedValue({});
        axios.get.mockResolvedValue({ data: { chapter: { pages: ["https://img/1", "https://img/2"] } } });
    });

    it("usa externalName como segmento aunque chapter.name difiera", async () => {
        await processChapterPages(basePc(), 1);

        expect(axios.get).toHaveBeenCalledWith(
            "https://olympusxyz.com/api/capitulo/mi-slug/184",
            { timeout: 30000 },
        );
        expect(mockChapterUpdate).toHaveBeenCalledWith({
            where: { id: 5 },
            data: { pagesScraped: true },
        });
    });

    it("usa chapter.name como respaldo cuando externalName es null", async () => {
        await processChapterPages(basePc({ externalName: null }), 1);

        expect(axios.get).toHaveBeenCalledWith(
            "https://olympusxyz.com/api/capitulo/mi-slug/999",
            { timeout: 30000 },
        );
        expect(mockChapterUpdate).toHaveBeenCalledWith({
            where: { id: 5 },
            data: { pagesScraped: true },
        });
    });

    it("loguea url, slug, segmento y status en el error", async () => {
        axios.get.mockRejectedValue(
            Object.assign(new Error("Request failed with status code 404"), {
                response: { status: 404 },
            }),
        );

        await processChapterPages(basePc(), 1);

        expect(logger.error).toHaveBeenCalledTimes(1);
        const [payload, msg] = logger.error.mock.calls[0];
        expect(msg).toBe("Error capítulo olympus");
        expect(payload).toMatchObject({
            chapterId: 5,
            slug: "mi-slug",
            segment: "184",
            url: "https://olympusxyz.com/api/capitulo/mi-slug/184",
            status: 404,
            err: "Request failed with status code 404",
        });
    });

    it("omite el capítulo con warn si providerSeries es null (sin llamada HTTP)", async () => {
        mockProviderSeriesFindFirst.mockResolvedValue(null);

        await processChapterPages(basePc(), 1);

        expect(axios.get).not.toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalledTimes(1);
        const [payload, msg] = logger.warn.mock.calls[0];
        expect(msg).toContain("ProviderSeries no encontrado");
        expect(payload).toMatchObject({ chapterId: 5, seriesId: 10 });
        expect(mockChapterUpdate).not.toHaveBeenCalled();
    });

    it("mantiene la semántica sin páginas → warn de reintento sin marcar", async () => {
        axios.get.mockResolvedValue({ data: { chapter: { pages: [] } } });

        await processChapterPages(basePc(), 1);

        expect(logger.warn).toHaveBeenCalledTimes(1);
        const [, msg] = logger.warn.mock.calls[0];
        expect(msg).toBe("Sin páginas olympus, se reintentará");
        expect(mockPageCreateMany).not.toHaveBeenCalled();
        expect(mockChapterUpdate).not.toHaveBeenCalled();
    });
});
