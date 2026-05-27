import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ChapterNav } from "@/pages/chapterReader";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const PREV = { id: 1, name: "1" };
const NEXT = { id: 3, name: "3" };

interface ChapterNavProps {
    slug: string;
    prev: { id: number; name: string } | null;
    next: { id: number; name: string } | null;
    from: string;
    onNext?: (chapterId: number) => void;
}

function renderNav(props: Partial<ChapterNavProps> = {}) {
    const defaultProps: ChapterNavProps = {
        slug: "test-serie",
        prev: PREV,
        next: NEXT,
        from: "/manga/test-serie",
    };
    return render(
        <MemoryRouter>
            <ChapterNav {...defaultProps} {...props} />
        </MemoryRouter>,
    );
}

describe("ChapterNav", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renderiza botones con nombres de capítulos", () => {
        renderNav();
        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("botón prev deshabilitado si no hay anterior", () => {
        renderNav({ prev: null });
        expect(screen.getByText("Sin anterior").closest("button")).toBeDisabled();
    });

    it("botón next deshabilitado si no hay siguiente", () => {
        renderNav({ next: null });
        expect(screen.getByText("Sin siguiente").closest("button")).toBeDisabled();
    });

    it("navega a capítulo anterior al hacer click", async () => {
        const user = userEvent.setup();
        renderNav();
        await user.click(screen.getByText("1"));
        expect(mockNavigate).toHaveBeenCalledWith(
            "/manga/test-serie/capitulo/1",
            expect.objectContaining({ state: { from: "/manga/test-serie" } }),
        );
    });

    it("llama onNext antes de navegar al siguiente", async () => {
        const onNext = vi.fn();
        const user = userEvent.setup();
        renderNav({ onNext });
        await user.click(screen.getByText("3"));
        expect(onNext).toHaveBeenCalledWith(3);
        expect(mockNavigate).toHaveBeenCalledWith(
            "/manga/test-serie/capitulo/3",
            expect.anything(),
        );
    });

    it("no llama onNext si no se pasa prop", async () => {
        const user = userEvent.setup();
        renderNav({ onNext: undefined });
        await user.click(screen.getByText("3"));
        expect(mockNavigate).toHaveBeenCalledWith(
            "/manga/test-serie/capitulo/3",
            expect.anything(),
        );
    });

    it("no hace nada al hacer click en prev sin capítulo anterior", async () => {
        const user = userEvent.setup();
        renderNav({ prev: null });
        await user.click(screen.getByText("Sin anterior").closest("button")!);
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("no hace nada al hacer click en next sin capítulo siguiente", async () => {
        const user = userEvent.setup();
        renderNav({ next: null });
        await user.click(screen.getByText("Sin siguiente").closest("button")!);
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
