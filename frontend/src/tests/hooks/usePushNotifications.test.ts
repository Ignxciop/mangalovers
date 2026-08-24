import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const mockApiGet = vi.fn();
const mockApiPost = vi.fn();
const mockApiDelete = vi.fn();

vi.mock("@/api/axios", () => ({
    api: {
        get: (...args: unknown[]) => mockApiGet(...args),
        post: (...args: unknown[]) => mockApiPost(...args),
        delete: (...args: unknown[]) => mockApiDelete(...args),
    },
}));

import { usePushNotifications } from "@/hooks/usePushNotifications";

const mockRequestPermission = vi.fn();
const mockGetSubscription = vi.fn();
const mockPushSubscribe = vi.fn();
const mockUnsubscribeSub = vi.fn();

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/test-endpoint";

const mockSubscription = {
    endpoint: ENDPOINT,
    toJSON: () => ({
        endpoint: ENDPOINT,
        keys: { p256dh: "p256dh-key", auth: "auth-key" },
    }),
};

const mockRegistration = {
    pushManager: {
        getSubscription: (...args: unknown[]) => mockGetSubscription(...args),
        subscribe: (...args: unknown[]) => mockPushSubscribe(...args),
    },
};

class MockPushManager {}

function installBrowserMocks() {
    Object.defineProperty(navigator, "serviceWorker", {
        configurable: true,
        value: { ready: Promise.resolve(mockRegistration) },
    });
    Object.defineProperty(window, "PushManager", {
        configurable: true,
        value: MockPushManager,
    });
    Object.defineProperty(window, "Notification", {
        configurable: true,
        value: {
            permission: "default",
            requestPermission: (...args: unknown[]) =>
                mockRequestPermission(...args),
        },
    });
}

describe("usePushNotifications", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        installBrowserMocks();
        mockApiPost.mockResolvedValue({ data: { success: true } });
        mockApiDelete.mockResolvedValue({ data: { success: true } });
    });

    describe("checkExistingSubscription (montaje)", () => {
        it("extrae subscribed de la respuesta anidada { success, data }", async () => {
            mockGetSubscription.mockResolvedValueOnce(mockSubscription);
            mockApiGet.mockResolvedValueOnce({
                data: { success: true, data: { subscribed: true } },
            });

            const { result } = renderHook(() => usePushNotifications());

            await waitFor(() => expect(result.current.subscribed).toBe(true));
            expect(mockApiGet).toHaveBeenCalledWith("/notifications/status", {
                params: { endpoint: ENDPOINT },
            });
            expect(mockApiPost).not.toHaveBeenCalled();
        });

        it("re-registra en el backend cuando subscribed es false", async () => {
            mockGetSubscription.mockResolvedValueOnce(mockSubscription);
            mockApiGet.mockResolvedValueOnce({
                data: { success: true, data: { subscribed: false } },
            });

            const { result } = renderHook(() => usePushNotifications());

            await waitFor(() => expect(result.current.subscribed).toBe(true));
            expect(mockApiPost).toHaveBeenCalledWith(
                "/notifications/subscribe",
                {
                    endpoint: ENDPOINT,
                    keys: { p256dh: "p256dh-key", auth: "auth-key" },
                },
            );
        });

        it("no consulta el backend si no hay suscripción local", async () => {
            mockGetSubscription.mockResolvedValueOnce(null);

            renderHook(() => usePushNotifications());

            await waitFor(() => expect(mockGetSubscription).toHaveBeenCalled());
            expect(mockApiGet).not.toHaveBeenCalled();
        });
    });

    describe("subscribe", () => {
        it("extrae publicKey de la respuesta anidada y la convierte a Uint8Array", async () => {
            mockRequestPermission.mockResolvedValueOnce("granted");
            // "AQIDBA" en base64url decodifica a los bytes [1, 2, 3, 4]
            mockApiGet.mockResolvedValueOnce({
                data: { success: true, data: { publicKey: "AQIDBA" } },
            });
            mockPushSubscribe.mockResolvedValueOnce(mockSubscription);

            const { result } = renderHook(() => usePushNotifications());

            await act(async () => {
                await result.current.subscribe();
            });

            expect(result.current.error).toBeNull();
            expect(result.current.subscribed).toBe(true);
            expect(result.current.loading).toBe(false);
            expect(result.current.permission).toBe("granted");

            expect(mockApiGet).toHaveBeenCalledWith(
                "/notifications/vapid-public-key",
            );

            const options = mockPushSubscribe.mock.calls[0][0] as {
                userVisibleOnly: boolean;
                applicationServerKey: Uint8Array;
            };
            expect(options.userVisibleOnly).toBe(true);
            expect(Array.from(options.applicationServerKey)).toEqual([
                1, 2, 3, 4,
            ]);

            expect(mockApiPost).toHaveBeenCalledWith(
                "/notifications/subscribe",
                {
                    endpoint: ENDPOINT,
                    keys: { p256dh: "p256dh-key", auth: "auth-key" },
                },
            );
        });

        it("no consulta la clave VAPID si el permiso es denegado", async () => {
            mockRequestPermission.mockResolvedValueOnce("denied");

            const { result } = renderHook(() => usePushNotifications());

            await act(async () => {
                await result.current.subscribe();
            });

            expect(result.current.permission).toBe("denied");
            expect(mockApiGet).not.toHaveBeenCalled();
            expect(mockPushSubscribe).not.toHaveBeenCalled();
            expect(result.current.error).toContain("Permiso denegado");
        });

        it("expone error si falla la petición de la clave VAPID", async () => {
            mockRequestPermission.mockResolvedValueOnce("granted");
            mockApiGet.mockRejectedValueOnce(new Error("network down"));

            const { result } = renderHook(() => usePushNotifications());

            await act(async () => {
                await result.current.subscribe();
            });

            expect(result.current.error).toBe("network down");
            expect(result.current.loading).toBe(false);
            expect(mockPushSubscribe).not.toHaveBeenCalled();
        });

        it("sanea comillas, espacios y padding de la clave antes de decodificar", async () => {
            mockRequestPermission.mockResolvedValueOnce("granted");
            mockApiGet.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: { publicKey: ' "AQIDBA=\n" ' },
                },
            });
            mockPushSubscribe.mockResolvedValueOnce(mockSubscription);

            const { result } = renderHook(() => usePushNotifications());

            await act(async () => {
                await result.current.subscribe();
            });

            expect(result.current.error).toBeNull();
            expect(result.current.subscribed).toBe(true);
            const options = mockPushSubscribe.mock.calls[0][0] as {
                applicationServerKey: Uint8Array;
            };
            expect(Array.from(options.applicationServerKey)).toEqual([
                1, 2, 3, 4,
            ]);
        });

        it("expone error claro si la clave VAPID tiene formato inválido", async () => {
            mockRequestPermission.mockResolvedValueOnce("granted");
            // 21 caracteres: longitud % 4 === 1, imposible decodificar
            mockApiGet.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: { publicKey: "test-vapid-public-key" },
                },
            });

            const { result } = renderHook(() => usePushNotifications());

            await act(async () => {
                await result.current.subscribe();
            });

            expect(result.current.error).toContain(
                "clave pública VAPID del servidor es inválida",
            );
            expect(mockPushSubscribe).not.toHaveBeenCalled();
        });
    });

    describe("unsubscribe", () => {
        it("elimina la suscripción del backend y del navegador", async () => {
            const sub = { ...mockSubscription, unsubscribe: mockUnsubscribeSub };
            // 1ª llamada: efecto de montaje (sin suscripción previa)
            // 2ª llamada: unsubscribe() del usuario
            mockGetSubscription
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(sub);

            const { result } = renderHook(() => usePushNotifications());

            await act(async () => {
                await result.current.unsubscribe();
            });

            expect(mockApiDelete).toHaveBeenCalledWith(
                "/notifications/unsubscribe",
                { data: { endpoint: ENDPOINT } },
            );
            expect(mockUnsubscribeSub).toHaveBeenCalledTimes(1);
            expect(result.current.subscribed).toBe(false);
            expect(result.current.loading).toBe(false);
        });
    });
});
