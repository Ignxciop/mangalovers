import { it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CoverImage } from "@/components/coverImage";

let imageInstances = 0;

class FailingImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 0;
    naturalHeight = 0;
    constructor() {
        imageInstances++;
    }
    set src(_value: string) {
        queueMicrotask(() => this.onerror?.());
    }
}

function renderCover(props: Partial<Parameters<typeof CoverImage>[0]> = {}) {
    const onNavigate = vi.fn();
    render(
        <div onClick={onNavigate} role="link">
            <CoverImage src="http://invalid/cover.jpg" alt="portada" priority {...props} />
        </div>,
    );
    return { onNavigate };
}

async function reachErrorState() {
    await vi.advanceTimersByTimeAsync(5000);
}

beforeEach(() => {
    imageInstances = 0;
    vi.useFakeTimers();
    vi.stubGlobal("Image", FailingImage);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

it("clic en Reintentar no navega al contenedor y reintenta la carga", async () => {
    const { onNavigate } = renderCover();

    await reachErrorState();
    const retryButton = screen.getByRole("button", { name: /Reintentar/i });
    const callsBefore = imageInstances;

    fireEvent.click(retryButton);

    expect(onNavigate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(0);
    expect(imageInstances).toBeGreaterThan(callsBefore);
});

it("el resto del contenedor sigue propagando clics (no se rompió la navegación)", () => {
    const { onNavigate } = renderCover();
    fireEvent.click(screen.getByAltText("portada"));
    expect(onNavigate).toHaveBeenCalledTimes(1);
});