import { describe, it, expect, vi, beforeEach } from "vitest";

const {
    mockProviderChapterFindUnique,
    mockProviderChapterCreate,
    mockProviderChapterUpdate,
    mockChapterFindFirst,
    mockChapterCreate,
} = vi.hoisted(() => ({
    mockProviderChapterFindUnique: vi.fn(),
    mockProviderChapterCreate: vi.fn(),
    mockProviderChapterUpdate: vi.fn(),
    mockChapterFindFirst: vi.fn(),
    mockChapterCreate: vi.fn(),
}));

vi.mock("../../../src/config/prisma.js", () => ({
    prisma: {
        provider: { findUnique: vi.fn().mockResolvedValue({ id: 1 }) },
        providerChapter: {
            findUnique: mockProviderChapterFindUnique,
            create: mockProviderChapterCreate,
            update: mockProviderChapterUpdate,
        },
        chapter: {
            findFirst: mockChapterFindFirst,
            create: mockChapterCreate,
        },
        providerSeries: { findMany: vi.fn().mockResolvedValue([]) },
        $disconnect: vi.fn(),
    },
}));

vi.mock("../../../src/config/logger.js", () => ({
    default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../../src/manga/scrapers/scraperAbort.js", () => ({
    getAbortSignal: () => ({ aborted: false }),
}));

vi.mock("../../../src/manga/scrapers/updateSeriesMetadata.js", () => ({
    updateSeriesMetadata: vi.fn(),
}));

vi.mock("../../../src/manga/scrapers/resolveStatus.js", () => ({
    promoteStatusIfInactive: vi.fn(),
}));

vi.mock("axios", () => ({
    default: { get: vi.fn() },
}));

import axios from "axios";
import { processSeriesChapters } from "../../../src/manga/scrapers/olympus/chapters_scraper.js";

const olympusChapter = {
    id: 134192,
    name: "184",
    published_at: "2026-01-01T00:00:00Z",
};

const providerSeries = { id: 7, slug: "20-225-2sabueso13424", seriesId: 743 };

const onePageResponse = {
    data: {
        data: [olympusChapter],
        meta: { last_page: 1 },
    },
};

describe("olympus chapters_scraper.processSeriesChapters (externalName)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        axios.get.mockResolvedValue(onePageResponse);
        mockProviderChapterCreate.mockResolvedValue({});
        mockProviderChapterUpdate.mockResolvedValue({});
        mockChapterCreate.mockResolvedValue({ id: 50 });
    });

    it("persiste externalName al crear un providerChapter nuevo", async () => {
        mockProviderChapterFindUnique.mockResolvedValue(null);
        mockChapterFindFirst.mockResolvedValue(null);

        await processSeriesChapters(providerSeries, 1);

        expect(mockProviderChapterCreate).toHaveBeenCalledTimes(1);
        expect(mockProviderChapterCreate).toHaveBeenCalledWith({
            data: {
                providerId: 1,
                externalId: "134192",
                externalName: "184",
                chapterId: 50,
            },
        });
    });

    it("persiste externalName al vincular un chapter existente", async () => {
        mockProviderChapterFindUnique.mockResolvedValue(null);
        mockChapterFindFirst.mockResolvedValue({ id: 33, name: "184" });

        await processSeriesChapters(providerSeries, 1);

        expect(mockProviderChapterCreate).toHaveBeenCalledWith({
            data: {
                providerId: 1,
                externalId: "134192",
                externalName: "184",
                chapterId: 33,
            },
        });
    });

    it("sana externalName cuando la fila existente lo tiene en null", async () => {
        mockProviderChapterFindUnique.mockResolvedValue({
            id: 9,
            externalId: "134192",
            externalName: null,
            chapterId: 33,
        });

        await processSeriesChapters(providerSeries, 1);

        expect(mockProviderChapterUpdate).toHaveBeenCalledTimes(1);
        expect(mockProviderChapterUpdate).toHaveBeenCalledWith({
            where: { id: 9 },
            data: { externalName: "184" },
        });
        expect(mockProviderChapterCreate).not.toHaveBeenCalled();
    });

    it("no escribe cuando externalName ya está seteado", async () => {
        mockProviderChapterFindUnique.mockResolvedValue({
            id: 9,
            externalId: "134192",
            externalName: "184",
            chapterId: 33,
        });

        await processSeriesChapters(providerSeries, 1);

        expect(mockProviderChapterUpdate).not.toHaveBeenCalled();
        expect(mockProviderChapterCreate).not.toHaveBeenCalled();
    });
});
