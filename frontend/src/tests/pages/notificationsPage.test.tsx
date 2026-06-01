import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { SidebarProvider } from "@/components/ui/sidebar";
import NotificationsPage from "@/pages/notificationsPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/api/notifications", () => ({
    getNotifications: vi.fn(),
    getUnreadNotificationCount: vi.fn(),
    markNotificationAsRead: vi.fn(),
    markAllNotificationsAsRead: vi.fn(),
}));

let authState = { user: { id: "u1" } };
const mockAuthStore = vi.hoisted(() => vi.fn((selector) => selector ? selector(authState) : authState));
vi.mock("@/store/authStore", () => ({
    useAuthStore: mockAuthStore,
}));

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

import { getNotifications, getUnreadNotificationCount, markNotificationAsRead, markAllNotificationsAsRead } from "@/api/notifications";

const NOTIFICATIONS_MOCK = [
    { id: "1", userId: "u1", type: "FRIEND_REQUEST", title: "Solicitud de amistad", body: "Juan te envió una solicitud", data: null, read: false, createdAt: "2026-05-28T10:00:00Z" },
    { id: "2", userId: "u1", type: "NEW_CHAPTER", title: "Nuevo capítulo", body: "One Piece capítulo 1124 disponible", data: { slug: "one-piece" }, read: false, createdAt: "2026-05-28T09:00:00Z" },
    { id: "3", userId: "u1", type: "FRIEND_ACCEPTED", title: "Solicitud aceptada", body: "María aceptó tu solicitud", data: null, read: true, createdAt: "2026-05-27T08:00:00Z" },
];

function renderPage() {
    return render(
        <HelmetProvider>
            <SidebarProvider>
                <MemoryRouter>
                    <NotificationsPage />
                </MemoryRouter>
            </SidebarProvider>
        </HelmetProvider>,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    authState = { user: { id: "u1" } };
    vi.mocked(getNotifications).mockResolvedValue({ data: [], total: 0 });
    vi.mocked(getUnreadNotificationCount).mockResolvedValue(0);
});

it("muestra loading skeletons inicialmente", async () => {
    vi.mocked(getNotifications).mockReturnValue(new Promise(() => {}));
    renderPage();
    await waitFor(() => {
        const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
        expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });
});

it("muestra empty state cuando no hay notificaciones", async () => {
    renderPage();
    await waitFor(() => {
        expect(screen.getByText("Sin notificaciones")).toBeInTheDocument();
    });
});

it("muestra lista de notificaciones", async () => {
    vi.mocked(getNotifications).mockResolvedValue({ data: NOTIFICATIONS_MOCK, total: 3 });
    renderPage();

    await waitFor(() => {
        expect(screen.getByText("Solicitud de amistad")).toBeInTheDocument();
        expect(screen.getByText("Nuevo capítulo")).toBeInTheDocument();
        expect(screen.getByText("Solicitud aceptada")).toBeInTheDocument();
    });
});

it("muestra botón 'Leer todo' cuando hay no leídas", async () => {
    vi.mocked(getNotifications).mockResolvedValue({ data: NOTIFICATIONS_MOCK, total: 3 });
    vi.mocked(getUnreadNotificationCount).mockResolvedValue(2);

    renderPage();

    await waitFor(() => {
        expect(screen.getByText("Leer todo")).toBeInTheDocument();
    });
});

it("no muestra 'Leer todo' cuando todas están leídas", async () => {
    vi.mocked(getNotifications).mockResolvedValue({ data: [NOTIFICATIONS_MOCK[2]], total: 1 });

    renderPage();

    await waitFor(() => {
        expect(screen.queryByText("Leer todo")).not.toBeInTheDocument();
    });
});

it("marca todas como leídas al hacer click en 'Leer todo'", async () => {
    const user = userEvent.setup();
    vi.mocked(getNotifications).mockResolvedValue({ data: NOTIFICATIONS_MOCK, total: 3 });
    vi.mocked(getUnreadNotificationCount).mockResolvedValue(2);
    vi.mocked(markAllNotificationsAsRead).mockResolvedValue(undefined);

    renderPage();

    await waitFor(() => {
        expect(screen.getByText("Leer todo")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Leer todo"));

    await waitFor(() => {
        expect(markAllNotificationsAsRead).toHaveBeenCalledOnce();
    });
});

it("llama a markAsRead al hacer click en notificación no leída", async () => {
    const user = userEvent.setup();
    vi.mocked(getNotifications).mockResolvedValue({ data: [NOTIFICATIONS_MOCK[0]], total: 1 });
    vi.mocked(markNotificationAsRead).mockResolvedValue(undefined);

    renderPage();

    await waitFor(() => {
        expect(screen.getByText("Solicitud de amistad")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Solicitud de amistad"));

    await waitFor(() => {
        expect(markNotificationAsRead).toHaveBeenCalledWith("1");
    });
});

it("muestra botón 'Cargar más' cuando hay más páginas", async () => {
    vi.mocked(getNotifications).mockResolvedValue({ data: NOTIFICATIONS_MOCK, total: 50 });

    renderPage();

    await waitFor(() => {
        expect(screen.getByText("Cargar más")).toBeInTheDocument();
    });
});

it("navega al hacer click en notificación de nuevo capítulo", async () => {
    const user = userEvent.setup();
    vi.mocked(getNotifications).mockResolvedValue({ data: [NOTIFICATIONS_MOCK[1]], total: 1 });

    renderPage();

    await waitFor(() => {
        expect(screen.getByText("Nuevo capítulo")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Nuevo capítulo"));

    expect(mockNavigate).toHaveBeenCalledWith("/manga/one-piece");
});

it("no renderiza notificaciones cuando no hay usuario autenticado", () => {
    authState = { user: null as { id: string } | null };
    renderPage();
    expect(screen.queryByText("Notificaciones")).not.toBeInTheDocument();
});
