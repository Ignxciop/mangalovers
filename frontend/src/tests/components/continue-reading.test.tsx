import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ContinueReadingSection, ContinueSkeleton } from "@/components/continue-reading";
import type { ContinueReadingItem } from "@/components/continue-reading";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return { ...actual, useNavigate: () => mockNavigate };
});

const MOCK_ITEMS: ContinueReadingItem[] = [
    { id: 1, name: "One Piece", slug: "one-piece", cover: null, lastReadChapterName: "1120", lastAvailableChapterName: "1124", chaptersLeft: 4 },
    { id: 2, name: "Naruto", slug: "naruto", cover: null, lastReadChapterName: "700", lastAvailableChapterName: "700", chaptersLeft: 0 },
    { id: 3, name: "Attack on Titan", slug: "aot", cover: null, lastReadChapterName: "139", lastAvailableChapterName: "139", chaptersLeft: 0 },
];

function renderSection(items = MOCK_ITEMS) {
    return render(
        <MemoryRouter>
            <ContinueReadingSection items={items} />
        </MemoryRouter>,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    window.innerWidth = 1024;
    window.dispatchEvent(new Event("resize"));
});

it("muestra empty state cuando no hay items", () => {
    renderSection([]);
    expect(screen.getByText("Continuar leyendo")).toBeInTheDocument();
    expect(screen.getByText("Aún no has empezado a leer ninguna serie")).toBeInTheDocument();
    expect(screen.getByText("Explorar catálogo")).toBeInTheDocument();
});

it("navega al catálogo desde empty state", async () => {
    const user = userEvent.setup();
    renderSection([]);
    await user.click(screen.getByText("Explorar catálogo"));
    expect(mockNavigate).toHaveBeenCalledWith("/mangas");
});

it("muestra los nombres de las series", () => {
    renderSection();
    expect(screen.getByText("One Piece")).toBeInTheDocument();
    expect(screen.getByText("Naruto")).toBeInTheDocument();
});

it("muestra capítulos pendientes", () => {
    renderSection();
    expect(screen.getByText("4 cap. pendientes")).toBeInTheDocument();
});

it("muestra 'Al día' para series completadas", () => {
    renderSection();
    expect(screen.getAllByText("Al día")).toHaveLength(2);
});

it("muestra botón 'Ver todos'", () => {
    renderSection();
    expect(screen.getByText("Ver todos")).toBeInTheDocument();
});

it("navega a favoritos al hacer click en 'Ver todos'", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByText("Ver todos"));
    expect(mockNavigate).toHaveBeenCalledWith("/favoritos");
});

it("muestra skeleton loader con ContinueSkeleton", () => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(1024);
    const { container } = render(
        <MemoryRouter>
            <ContinueSkeleton />
        </MemoryRouter>,
    );
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(5);
});

it("en mobile (< 640px) muestra 6 skeletons", () => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(400);
    window.dispatchEvent(new Event("resize"));
    const { container } = render(
        <MemoryRouter>
            <ContinueSkeleton />
        </MemoryRouter>,
    );
    const skeletonGroups = container.querySelectorAll(".grid > div");
    expect(skeletonGroups.length).toBe(6);
});

it("muestra badges de capítulo leído", () => {
    renderSection();
    expect(screen.getByText("1120")).toBeInTheDocument();
});
