import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useNotificationPrompt } from "@/hooks/useNotificationPrompt";
import { usePushNotifications } from "@/hooks/usePushNotifications";

/**
 * Modal que aparece UNA sola vez cuando el usuario entra autenticado por primera vez.
 * Después de su decisión (activar o no), no vuelve a aparecer.
 *
 * El usuario puede gestionar las notificaciones en cualquier momento desde /perfil.
 */
export function NotificationPromptModal() {
    const { shouldShow, dismiss } = useNotificationPrompt();
    const { subscribe, loading, isIOSInstallRequired } = usePushNotifications();

    // No renderizar nada si no toca mostrar
    if (!shouldShow) return null;

    // iOS sin instalar: no tiene sentido mostrar el modal todavía
    if (isIOSInstallRequired) return null;

    async function handleAccept() {
        await subscribe();
        dismiss(); // Marcar como visto independientemente de si aceptó o no el browser dialog
    }

    function handleDecline() {
        dismiss();
    }

    return (
        <Dialog
            open={shouldShow}
            onOpenChange={(open) => {
                if (!open) dismiss();
            }}
        >
            <DialogContent
                className="sm:max-w-sm"
                // Evitar que se cierre al hacer clic fuera — forzar decisión explícita
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                {/* Botón X manual para no bloquear del todo */}
                <button
                    onClick={handleDecline}
                    className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                    aria-label="Cerrar"
                >
                    <X className="h-4 w-4" />
                </button>

                <DialogHeader className="items-center text-center gap-3 pt-2">
                    <div className="flex items-center justify-center size-14 rounded-2xl bg-primary/10 text-primary">
                        <Bell className="size-7" />
                    </div>
                    <div className="space-y-1">
                        <DialogTitle className="text-base">
                            ¿Quieres recibir notificaciones?
                        </DialogTitle>
                        <DialogDescription className="text-xs leading-relaxed">
                            Te avisamos cuando se publique un nuevo capítulo de
                            tus series favoritas. Puedes cambiar esto cuando
                            quieras desde tu perfil.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="flex flex-col gap-2 pt-2">
                    <Button
                        onClick={handleAccept}
                        disabled={loading}
                        className="w-full"
                        size="sm"
                    >
                        <Bell className="h-4 w-4 mr-2" />
                        {loading
                            ? "Activando..."
                            : "Sí, activar notificaciones"}
                    </Button>
                    <Button
                        onClick={handleDecline}
                        variant="ghost"
                        size="sm"
                        className="w-full text-muted-foreground"
                    >
                        <BellOff className="h-4 w-4 mr-2" />
                        Ahora no
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
