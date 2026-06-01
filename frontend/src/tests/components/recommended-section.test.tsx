import { it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RecommendedSection } from "@/components/recommended-section";

const MOCK_ITEMS = [
    { id: 1, name: "One Piece", slug: "one-piece", cover: null, status: "Activo", chapterCount: 1124, type: "Manga", genres: ["Acción", "Aventura", "Shonen"], score: 3, rotation: 123 },
    { id: 2, name: "Naruto", slug: "naruto", cover: null, status: "Finalizado", chapterCount: 700, type: "Manga", genres: ["Acción", "Shonen"], score: 2, rotation: 456 },
    { id: 3, name: "Attack on Titan", slug: "aot", cover: null, status: "Finalizado", chapterCount: 139, type: "Manga", genres: ["Acción", "Drama"], score: 2, rotation: 789 },
];

function renderSection(props = {}) {
    return render(
        <MemoryRouter>
            <RecommendedSection
                items={[]}
                basedOn={[]}
                loading={false}
                friendActivity={{}}
                {...props}
            />
        </MemoryRouter>,
    );
}

it("muestra skeleton loading", () => {
    renderSection({ loading: true });
    const skeletons = document.querySelectorAll(".rounded-xl");
    expect(skeletons.length).toBeGreaterThanOrEqual(6);
});

it("retorna null cuando no hay items y no está cargando", () => {
    const { container } = renderSection();
    expect(container.innerHTML).toBe("");
});

it("muestra el título 'Recomendados para ti'", () => {
    renderSection({ items: MOCK_ITEMS, basedOn: ["Acción", "Aventura"] });
    expect(screen.getByText("Recomendados para ti")).toBeInTheDocument();
});

it("muestra 'Basado en' con los géneros", () => {
    renderSection({ items: MOCK_ITEMS, basedOn: ["Acción", "Aventura"] });
    expect(screen.getByText(/Basado en:/)).toBeInTheDocument();
    expect(screen.getByText(/Acción, Aventura/)).toBeInTheDocument();
});

it("no muestra 'Basado en' si está vacío", () => {
    renderSection({ items: MOCK_ITEMS, basedOn: [] });
    expect(screen.queryByText(/Basado en:/)).not.toBeInTheDocument();
});

it("renderiza los nombres de las series", () => {
    renderSection({ items: MOCK_ITEMS, basedOn: ["Acción"] });
    expect(screen.getByText("One Piece")).toBeInTheDocument();
    expect(screen.getByText("Naruto")).toBeInTheDocument();
});

it("renderiza los badges de género", () => {
    renderSection({ items: MOCK_ITEMS, basedOn: ["Acción"] });
    expect(screen.getByText("Aventura")).toBeInTheDocument();
    expect(screen.getByText("Shonen")).toBeInTheDocument();
});

it("muestra badge +N cuando hay más de 2 géneros", () => {
    renderSection({ items: MOCK_ITEMS, basedOn: ["Acción"] });
    expect(screen.getByText("+1")).toBeInTheDocument();
});

it("muestra enlace 'Ver catálogo'", () => {
    renderSection({ items: MOCK_ITEMS, basedOn: ["Acción"] });
    expect(screen.getByText("Ver catálogo")).toBeInTheDocument();
});

it("limita a 6 items", () => {
    const manyItems = Array.from({ length: 10 }, (_, i) => ({
        ...MOCK_ITEMS[0],
        id: i + 1,
        name: `Serie ${i + 1}`,
        slug: `serie-${i + 1}`,
    }));
    renderSection({ items: manyItems, basedOn: ["Acción"] });
    const names = screen.getAllByText(/^Serie \d+$/);
    expect(names).toHaveLength(6);
});
