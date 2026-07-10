import { SEO } from "@/components/seo";
import { useState, useEffect, useCallback } from "react";
import { useHeader } from "@/context/headerContext";
import { SearchBar } from "@/components/search-bar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import { timeAgo } from "@/lib/date";
import { cn } from "@/lib/utils";
import {
    Bell,
    BookOpen,
    MessageSquare,
    Link2,
    UserPlus,
    UserCheck,
    Sparkles,
    CheckCheck,
    Search,
} from "lucide-react";
import {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getUnreadNotificationCount,
    type AppNotification,
} from "@/api/notifications";
import { MangaPagination } from "@/components/MangaPagination";
import { useNavigate } from "react-router-dom";

function NotificationIcon({ type }: { type: AppNotification["type"] }) {
    const map: Record<string, { icon: typeof Bell; className: string }> = {
        FRIEND_REQUEST: { icon: UserPlus, className: "text-blue-400" },
        FRIEND_ACCEPTED: { icon: UserCheck, className: "text-emerald-400" },
        SUGGESTION_RESOLVED: { icon: MessageSquare, className: "text-amber-400" },
        NEW_CHAPTER: { icon: BookOpen, className: "text-brand-cyan" },
        COMMENT_REPLY: { icon: MessageSquare, className: "text-purple-400" },
        SERIES_RELATION: { icon: Link2, className: "text-emerald-400" },
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
        } else if (notification.type === "SERIES_RELATION" && notification.data?.slug) {
            navigate(`/manga/${notification.data.slug}`);
        } else if (notification.type === "SUGGESTION_RESOLVED") {
            navigate("/configuracion", { state: { tab: "soporte" } });
        } else if (notification.type === "FRIEND_REQUEST" || notification.type === "FRIEND_ACCEPTED") {
            navigate("/amigos");
        } else if (notification.type === "COMMENT_REPLY" && notification.data?.seriesSlug && notification.data?.chapterId && notification.data?.replyId) {
            navigate(`/manga/${notification.data.seriesSlug}/capitulo/${notification.data.chapterId}#comment-${notification.data.replyId}`);
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
    const [unreadCount, setUnreadCount] = useState(0);
    const ITEMS_PER_PAGE = 24;

    const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

    const fetch = useCallback(async (p: number) => {
        try {
            setLoading(true);
            const res = await getNotifications(p, ITEMS_PER_PAGE);
            setNotifications(res.data);
            setTotal(res.total);
            setPage(p);
        } catch {
            toast.error("Error al cargar notificaciones");
        } finally {
            setLoading(false);
        }
    }, []);

    const setStoreUnreadCount = useNotificationStore((s) => s.setUnreadCount);

    useEffect(() => {
        fetch(1);
        getUnreadNotificationCount().then(setUnreadCount).catch(() => {});

        markAllNotificationsAsRead()
            .then(() => {
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                setUnreadCount(0);
                setStoreUnreadCount(0);
            })
            .catch(() => {});
    }, [fetch, setStoreUnreadCount]);

    const handleMarkAsRead = async (id: string) => {
        try {
            await markNotificationAsRead(id);
            setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
            setUnreadCount((prev) => Math.max(0, prev - 1));
            setStoreUnreadCount(Math.max(0, useNotificationStore.getState().unreadCount - 1));
        } catch {
            // silenciar
        }
    };

    const handleMarkAllAsRead = useCallback(async () => {
        try {
            await markAllNotificationsAsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
            setStoreUnreadCount(0);
            toast.success("Notificaciones marcadas como leídas");
        } catch {
            toast.error("Error al marcar notificaciones");
        }
    }, [setStoreUnreadCount]);

    const { setContent, setSearchMode } = useHeader();
    const isMobile = useIsMobile();

    useEffect(() => {
        if (isMobile) {
            setContent({
                right: (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSearchMode(true)}
                            className="p-2 rounded-lg hover:bg-accent transition-colors"
                            aria-label="Buscar"
                        >
                            <Search className="h-5 w-5" />
                        </button>
                        {notifications.length > 0 && unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleMarkAllAsRead}
                                className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground"
                            >
                                <CheckCheck className="size-3.5" />
                            </Button>
                        )}
                    </div>
                ),
            });
        } else {
            setContent({
                center: <SearchBar />,
                right: notifications.length > 0 && unreadCount > 0 ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAllAsRead}
                        className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground"
                    >
                        <CheckCheck className="size-3.5" />
                        Leer todo
                    </Button>
                ) : undefined,
            });
        }
        return () => setContent({});
    }, [isMobile, setContent, setSearchMode, notifications.length, unreadCount, handleMarkAllAsRead]);

    useEffect(() => {
        return () => setSearchMode(false);
    }, [setSearchMode]);

    if (!user) return null;

    return (
        <>
            <SEO
                title="Notificaciones"
                description="Tus notificaciones de Mangalovers: actividad de amigos, nuevos capítulos y más."
                canonicalPath="/notificaciones"
            />
            <div className="bg-background min-h-full">

                <main className="w-full px-4 lg:px-6 py-8">
                    {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {Array.from({ length: 24 }).map((_, i) => (
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {notifications.map((n, i) => (
                                    <NotificationItem
                                        key={n.id}
                                        notification={n}
                                        index={i}
                                        onRead={handleMarkAsRead}
                                    />
                                ))}
                            </div>
                            <div className="flex justify-center pt-6">
                                <MangaPagination
                                    page={page}
                                    totalPages={totalPages}
                                    setPage={(p) => fetch(p)}
                                />
                            </div>
                        </>
                    )}
                </main>
            </div>
        </>
    );
}
