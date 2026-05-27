import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { SidebarProvider } from "@/components/ui/sidebar";
import MangaDetail from "@/pages/mangaDetail";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return { ...actual, useNavigate: () => mockNavigate };
});

let mockReadIds = new Set([1]);
const mockMarkUntil = vi.fn();
vi.mock("@/hooks/useReadChapters", () => ({
    useReadChapters: vi.fn(() => ({
        readIds: mockReadIds,
        toggle: vi.fn(),
        markUntil: mockMarkUntil,
        refetch: vi.fn(),
        loading: false,
    })),
}));

let mockSeriesDetail: {
    series: typeof SERIES_DATA | null;
    loading: boolean;
    error: string | null;
} = { series: null, loading: true, error: null };

vi.mock("@/hooks/useSeriesDetail", () => ({
    useSeriesDetail: vi.fn(() => mockSeriesDetail),
}));

vi.mock("@/hooks/useFavorite", () => ({
    useFavorite: vi.fn(() => ({
        status: "Siguiendo" as string | null,
        loading: false,
        save: vi.fn(),
        remove: vi.fn(),
    })),
}));

vi.mock("@/hooks/usePullToRefresh", () => ({
    usePullToRefresh: vi.fn(() => ({
        pull: vi.fn(),
        refreshing: false,
    })),
}));

const SERIES_DATA = {
    id: 1,
    name: "One Piece",
    slug: "one-piece",
    cover: null,
    status: "Activo",
    type: "Manga",
    summary: "Aventuras en el mar",
    chapterCount: 3,
    genres: ["Acción", "Aventura"],
    providers: [{ provider: "LectorManga", externalSlug: "one-piece", externalUrl: null as string | null }],
    chapters: [
        { id: 1, name: "1", publishedAt: "2024-01-01", createdAt: "2024-01-01", chapterNumber: 1 },
        { id: 2, name: "2", publishedAt: "2024-01-02", createdAt: "2024-01-02", chapterNumber: 2 },
        { id: 3, name: "3", publishedAt: "2024-01-03", createdAt: "2024-01-03", chapterNumber: 3 },
    ],
};

function renderPage() {
    return render(
        <HelmetProvider>
            <SidebarProvider>
                <MemoryRouter initialEntries={["/manga/one-piece"]}>
                    <Routes>
                        <Route path="/manga/:slug" element={<MangaDetail />} />
                    </Routes>
                </MemoryRouter>
            </SidebarProvider>
        </HelmetProvider>,
    );
}

describe("MangaDetail", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockReadIds = new Set([1]);
        mockSeriesDetail = { series: SERIES_DATA, loading: false, error: null };
    });

    describe("loading", () => {
        beforeEach(() => {
            mockSeriesDetail = { series: null, loading: true, error: null };
        });

        it("muestra skeleton mientras carga", () => {
            const { container } = renderPage();
            const skeletons = container.querySelectorAll(".animate-pulse");
            expect(skeletons.length).toBeGreaterThan(0);
        });
    });

    describe("error", () => {
        beforeEach(() => {
            mockSeriesDetail = { series: null, loading: false, error: "Not found" };
        });

        it("muestra mensaje de no encontrada", () => {
            renderPage();
            expect(screen.getByText("Serie no encontrada")).toBeInTheDocument();
        });
    });

    describe("data normal", () => {
        it("renderiza nombre de la serie", () => {
            renderPage();
            expect(screen.getAllByText("One Piece").length).toBeGreaterThanOrEqual(1);
        });

        it("renderiza sinopsis", () => {
            renderPage();
            expect(screen.getByText("Aventuras en el mar")).toBeInTheDocument();
        });

        it("renderiza botón Seguir leyendo cuando hay capítulos leídos", () => {
            renderPage();
            expect(screen.getByText(/Seguir leyendo/)).toBeInTheDocument();
        });

        it("Seguir leyendo llama markUntil y navega", async () => {
            const user = userEvent.setup();
            renderPage();
            await user.click(screen.getByText(/Seguir leyendo/));
            expect(mockMarkUntil).toHaveBeenCalledWith(2);
            expect(mockNavigate).toHaveBeenCalledWith(
                "/manga/one-piece/capitulo/2",
                expect.anything(),
            );
        });

        it("renderiza lista de capítulos", () => {
            renderPage();
            expect(screen.getByText("3 disponibles")).toBeInTheDocument();
        });

        it("renderiza badge de estado Activo", () => {
            renderPage();
            expect(screen.getByText("En emisión")).toBeInTheDocument();
        });

        it("renderiza géneros", () => {
            renderPage();
            expect(screen.getByText("Acción")).toBeInTheDocument();
            expect(screen.getByText("Aventura")).toBeInTheDocument();
        });

        it("renderiza fuentes", () => {
            renderPage();
            expect(screen.getByText("LectorManga")).toBeInTheDocument();
        });

        it("botón Desde el inicio navega al primer capítulo", async () => {
            const user = userEvent.setup();
            renderPage();
            await user.click(screen.getByText("Desde el inicio"));
            expect(mockNavigate).toHaveBeenCalledWith(
                "/manga/one-piece/capitulo/1",
                expect.anything(),
            );
        });

        it("no muestra Seguir leyendo si readIds está vacío", () => {
            mockReadIds = new Set();
            renderPage();
            expect(screen.queryByText(/Seguir leyendo/)).not.toBeInTheDocument();
        });
    });
});
