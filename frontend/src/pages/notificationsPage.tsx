import { SEO } from "@/components/seo";
import { useState, useEffect, useCallback } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { timeAgo } from "@/lib/date";
import { cn } from "@/lib/utils";
import {
    Bell,
    BellRing,
    BookOpen,
    MessageSquare,
    UserPlus,
    UserCheck,
    Sparkles,
    CheckCheck,
} from "lucide-react";
import {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getUnreadNotificationCount,
    type AppNotification,
} from "@/api/notifications";
import { useNavigate } from "react-router-dom";

function NotificationIcon({ type }: { type: AppNotification["type"] }) {
    const map: Record<string, { icon: typeof Bell; className: string }> = {
        FRIEND_REQUEST: { icon: UserPlus, className: "text-blue-400" },
        FRIEND_ACCEPTED: { icon: UserCheck, className: "text-emerald-400" },
        SUGGESTION_RESOLVED: { icon: MessageSquare, className: "text-amber-400" },
        NEW_CHAPTER: { icon: BookOpen, className: "text-brand-cyan" },
    };
    const { icon: Icon, className } = map[type] ?? { icon: Bell, className: "text-muted-foreground" };
    return (
        <div className={cn(
            "flex items-center justify-center size-9 rounded-xl shrink-0 bg-muted border border-border",
            className,
        )}>
            <Icon className="size-4" />
        </div>
    );
}

function NotificationItem({ notification, index, onRead }: { notification: AppNotification; index: number; onRead: (id: string) => void }) {
    const navigate = useNavigate();

    const handleClick = () => {
        if (!notification.read) {
            onRead(notification.id);
        }

        if (notification.type === "NEW_CHAPTER" && notification.data?.slug) {
            navigate(`/manga/${notification.data.slug}`);
        } else if (notification.type === "FRIEND_REQUEST" || notification.type === "FRIEND_ACCEPTED") {
            navigate("/amigos");
        }
    };

    return (
        <button
            onClick={handleClick}
            className={cn(
                "flex items-start gap-3 p-4 rounded-xl border w-full text-left transition-all duration-200",
                "hover:bg-muted/30 hover:shadow-[0_0_15px_-8px] hover:shadow-brand/10",
                notification.read
                    ? "bg-card border-border"
                    : "bg-muted/20 border-brand/20 shadow-[0_0_10px_-6px] shadow-brand/20",
                "animate-fade-in-up",
            )}
            style={{ animationDelay: `${index * 40}ms` }}
        >
            <NotificationIcon type={notification.type} />
            <div className="flex flex-col min-w-0 gap-0.5 flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">
                        {notification.title}
                    </span>
                    {!notification.read && (
                        <span className="size-2 rounded-full bg-brand shrink-0 animate-pulse" />
                    )}
                </div>
                {notification.body && (
                    <p className="text-xs text-muted-foreground leading-snug">
                        {notification.body}
                    </p>
                )}
                <span className="text-[10px] text-muted-foreground/50 mt-0.5">
                    {timeAgo(notification.createdAt)}
                </span>
            </div>
        </button>
    );
}

function NotificationSkeleton() {
    return (
        <div className="flex items-start gap-3 p-4 rounded-xl border bg-card">
            <Skeleton className="size-9 rounded-xl shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
                <Skeleton className="h-2.5 w-16" />
            </div>
        </div>
    );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-xl opacity-60" />
                <div className="relative flex items-center justify-center size-16 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
                    <Icon className="size-7 text-muted-foreground" />
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground max-w-64 leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

export default function NotificationsPage() {
    const user = useAuthStore((s) => s.user);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetch = useCallback(async (p: number, append: boolean) => {
        try {
            const res = await getNotifications(p, 20);
            setNotifications((prev) => append ? [...prev, ...res.data] : res.data);
            setTotal(res.total);
            setPage(p);
        } catch {
            toast.error("Error al cargar notificaciones");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        fetch(1, false);
        getUnreadNotificationCount().then(setUnreadCount).catch(() => {});
    }, [fetch]);

    const handleLoadMore = () => {
        setLoadingMore(true);
        fetch(page + 1, true);
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await markNotificationAsRead(id);
            setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch {
            // silenciar
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllNotificationsAsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
            toast.success("Notificaciones marcadas como leídas");
        } catch {
            toast.error("Error al marcar notificaciones");
        }
    };

    if (!user) return null;

    return (
        <>
            <SEO
                title="Notificaciones"
                description="Tus notificaciones de Mangalovers: actividad de amigos, nuevos capítulos y más."
                canonicalPath="/notificaciones"
            />
            <div className="min-h-screen bg-background">
                <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border shadow-[0_1px_0_0] shadow-brand/5">
                    <div className="container mx-auto grid grid-cols-[auto_1fr_auto] items-center h-16 px-4 gap-4">
                        <SidebarTrigger />
                        <div className="flex justify-center min-w-0">
                            <div className="flex items-center gap-2.5">
                                <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
                                    <BellRing className="h-3.5 w-3.5 text-primary/80" />
                                </div>
                                <span className="text-sm font-semibold tracking-tight">Notificaciones</span>
                            </div>
                        </div>
                        {notifications.length > 0 && unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleMarkAllAsRead}
                                className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground"
                            >
                                <CheckCheck className="size-3.5" />
                                Leer todo
                            </Button>
                        )}
                    </div>
                </header>

                <main className="container mx-auto px-4 py-6">
                    {loading ? (
                        <div className="flex flex-col gap-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <NotificationSkeleton key={i} />
                            ))}
                        </div>
                    ) : notifications.length === 0 ? (
                        <EmptyState
                            icon={Sparkles}
                            title="Sin notificaciones"
                            description="Cuando recibas solicitudes de amistad, nuevos capítulos o respuestas a tus sugerencias, aparecerán aquí."
                        />
                    ) : (
                        <>
                            <div className="flex flex-col gap-2">
                                {notifications.map((n, i) => (
                                    <NotificationItem
                                        key={n.id}
                                        notification={n}
                                        index={i}
                                        onRead={handleMarkAsRead}
                                    />
                                ))}
                            </div>
                            {notifications.length < total && (
                                <div className="flex justify-center pt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleLoadMore}
                                        disabled={loadingMore}
                                        className="gap-1.5 min-w-[130px]"
                                    >
                                        {loadingMore ? (
                                            <>
                                                <div className="size-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                                                Cargando...
                                            </>
                                        ) : (
                                            "Cargar más"
                                        )}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </>
    );
}
