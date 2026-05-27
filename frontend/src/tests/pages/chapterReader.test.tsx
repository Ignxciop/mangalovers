import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { SidebarProvider } from "@/components/ui/sidebar";
import ChapterReader from "@/pages/chapterReader";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return { ...actual, useNavigate: () => mockNavigate };
});

const mockMarkUntil = vi.fn(() => Promise.resolve());
let mockReadIds = new Set([1]);

vi.mock("@/hooks/useReadChapters", () => ({
    useReadChapters: vi.fn(() => ({
        readIds: mockReadIds,
        markUntil: mockMarkUntil,
        refetch: vi.fn(),
        loading: false,
    })),
}));

let mockChapterData: {
    chapter: typeof MOCK_CHAPTER | null;
    loading: boolean;
    error: string | null;
} = { chapter: null, loading: true, error: null };

vi.mock("@/hooks/useChapterPages", () => ({
    useChapterPages: vi.fn(() => mockChapterData),
}));

let mockSeriesDetail: {
    series: typeof MOCK_SERIES | null;
    loading: boolean;
    error: string | null;
} = { series: null, loading: true, error: null };

vi.mock("@/hooks/useSeriesDetail", () => ({
    useSeriesDetail: vi.fn(() => mockSeriesDetail),
}));

vi.mock("@/hooks/usePullToRefresh", () => ({
    usePullToRefresh: vi.fn(() => ({
        pull: vi.fn(),
        refreshing: false,
    })),
}));

const MOCK_SERIES = {
    id: 1,
    name: "Test Serie",
    slug: "test-serie",
    cover: null,
    status: "Activo",
    type: "Manga",
    summary: "Una serie de prueba",
    chapterCount: 3,
    genres: ["Acción"],
    providers: [],
    chapters: [
        { id: 1, name: "1", publishedAt: "2024-01-01", createdAt: "2024-01-01", chapterNumber: 1 },
        { id: 2, name: "2", publishedAt: "2024-01-02", createdAt: "2024-01-02", chapterNumber: 2 },
        { id: 3, name: "3", publishedAt: "2024-01-03", createdAt: "2024-01-03", chapterNumber: 3 },
    ],
};

const MOCK_CHAPTER = {
    chapterId: 2,
    name: "2",
    publishedAt: "2024-01-02",
    series: { id: 1, name: "Test Serie", slug: "test-serie" },
    prev: { id: 1, name: "1" },
    next: { id: 3, name: "3" },
    pages: [
        { id: 10, url: "https://example.com/page1.jpg" },
        { id: 11, url: "https://example.com/page2.jpg" },
    ],
};

function renderPage() {
    return render(
        <HelmetProvider>
            <SidebarProvider>
                <MemoryRouter initialEntries={["/manga/test-serie/capitulo/2"]}>
                    <Routes>
                        <Route
                            path="/manga/:slug/capitulo/:chapterId"
                            element={<ChapterReader />}
                        />
                    </Routes>
                </MemoryRouter>
            </SidebarProvider>
        </HelmetProvider>,
    );
}

describe("ChapterReader", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockReadIds = new Set([1]);
        mockChapterData = { chapter: MOCK_CHAPTER, loading: false, error: null };
        mockSeriesDetail = { series: MOCK_SERIES, loading: false, error: null };
    });

    describe("loading", () => {
        beforeEach(() => {
            mockChapterData = { chapter: null, loading: true, error: null };
        });

        it("muestra skeleton mientras carga", () => {
            const { container } = renderPage();
            const skeletons = container.querySelectorAll(".animate-pulse");
            expect(skeletons.length).toBeGreaterThan(0);
        });
    });

    describe("error", () => {
        beforeEach(() => {
            mockChapterData = { chapter: null, loading: false, error: "Not found" };
        });

        it("muestra mensaje de no encontrado", () => {
            renderPage();
            expect(screen.getByText("Capítulo no encontrado")).toBeInTheDocument();
        });
    });

    describe("data normal", () => {
        it("renderiza nombre del capítulo en el header", () => {
            renderPage();
            expect(screen.getByText("Cap. 2")).toBeInTheDocument();
        });

        it("renderiza nombre de la serie", () => {
            renderPage();
            expect(screen.getAllByText("Test Serie").length).toBeGreaterThanOrEqual(1);
        });

        it("renderiza botones prev y next (ChapterNav aparece 2 veces)", () => {
            renderPage();
            const prevButtons = screen.getAllByText("1");
            const nextButtons = screen.getAllByText("3");
            expect(prevButtons.length).toBe(2);
            expect(nextButtons.length).toBe(2);
        });

        it("llama markUntil en mount (auto-mark) si el capítulo no está leído", async () => {
            mockReadIds = new Set([1]);
            renderPage();
            await waitFor(() => {
                expect(mockMarkUntil).toHaveBeenCalledWith(2);
            });
        });

        it("no llama markUntil si el capítulo ya está leído", async () => {
            mockReadIds = new Set([1, 2]);
            renderPage();
            await waitFor(() => {
                expect(mockMarkUntil).not.toHaveBeenCalled();
            });
        });

        it("llama markUntil al hacer click en siguiente desde ChapterNav", async () => {
            const user = userEvent.setup();
            renderPage();
            const [firstNext] = screen.getAllByText("3");
            await user.click(firstNext);
            expect(mockMarkUntil).toHaveBeenCalledWith(3);
        });

        it("navega al hacer click en capítulo anterior", async () => {
            const user = userEvent.setup();
            renderPage();
            const [firstPrev] = screen.getAllByText("1");
            await user.click(firstPrev);
            expect(mockNavigate).toHaveBeenCalledWith(
                "/manga/test-serie/capitulo/1",
                expect.anything(),
            );
        });

        it("renderiza el progreso", () => {
            renderPage();
            expect(screen.getByText(/Progreso/)).toBeInTheDocument();
        });

        it("muestra los controles de modo de lectura", () => {
            renderPage();
            expect(screen.getByText("Cascada")).toBeInTheDocument();
            expect(screen.getByText("Página")).toBeInTheDocument();
        });
    });
});
