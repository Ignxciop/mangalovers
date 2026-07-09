import { SEO } from "@/components/seo";
import { useState, useEffect, useCallback } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { useFriendStore } from "@/store/friendStore";
import { useHeader } from "@/context/headerContext";
import { Link } from "react-router-dom";
import {
    Search,
    UserPlus,
    UserCheck,
    UserX,
    Ban,
    X,
    Clock,
    Send,
    Users,
    UserRound,
    HeartHandshake,
    BookOpen,
    Heart,
    BookMarked,
    Sparkles,
    UserRoundSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/date";
import {
    getFriends,
    getReceivedRequests,
    getReceivedRequestsCount,
    getSentRequests,
    getBlockedUsers,
    searchUsers,
    sendRequest,
    acceptRequest,
    rejectRequest,
    blockUser,
    unblockUser,
    removeFriend,
    getActivityFeed,
    type SearchUserResult,
    type Friend,
    type FriendRequest,
    type SentRequest,
    type BlockedUser,
    type FriendActivity,
} from "@/api/friends";
import type { AxiosError } from "axios";

const AVATAR_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "";

function FriendAvatar({
    name,
    avatarUrl,
    className,
}: {
    name: string;
    avatarUrl?: string | null;
    className?: string;
}) {
    return (
        <Avatar
            className={cn(
                "size-10 rounded-xl ring-2 ring-border shrink-0",
                className,
            )}
        >
            {avatarUrl && (
                <AvatarImage
                    src={`${AVATAR_BASE}/uploads/avatars/${avatarUrl}`}
                    alt={name}
                    className="rounded-xl object-cover"
                />
            )}
            <AvatarFallback className="rounded-xl text-xs font-bold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                {name ? (
                    name[0].toUpperCase()
                ) : (
                    <UserRound className="size-4" />
                )}
            </AvatarFallback>
        </Avatar>
    );
}

function UserInfo({
    name,
    lastname,
    alias,
}: {
    name: string;
    lastname: string;
    alias?: string | null;
}) {
    return (
        <div className="flex flex-col min-w-0 leading-tight">
            <span className="text-sm font-medium truncate text-foreground">
                {name} {lastname}
            </span>
            {alias && (
                <span className="text-xs text-muted-foreground/70 truncate">
                    @{alias}
                </span>
            )}
        </div>
    );
}

function FriendCardWrapper({
    children,
    className,
    style,
}: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}) {
    return (
        <div
            className={cn(
                "flex items-center justify-between gap-3 p-3 rounded-xl border bg-card",
                "transition-all duration-200 hover:bg-muted/30 hover:shadow-[0_0_15px_-6px] hover:shadow-brand/15 hover:border-brand/10",
                "animate-fade-in-up",
                className,
            )}
            style={style}
        >
            {children}
        </div>
    );
}

function EmptyState({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
}) {
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
                <p className="text-xs text-muted-foreground max-w-64 leading-relaxed">
                    {description}
                </p>
            </div>
        </div>
    );
}

function ActivityItem({
    activity,
    index,
}: {
    activity: FriendActivity;
    index: number;
}) {
    const { user, event, metadata, createdAt } = activity;
    const fullName = `${user.name} ${user.lastname}`;
    const icon =
        event === "MARK_READ" ? (
            <BookOpen className="size-3.5" />
        ) : event === "ADD_FAVORITE" ? (
            <Heart className="size-3.5" />
        ) : (
            <BookMarked className="size-3.5" />
        );

    const accentBorder =
        event === "MARK_READ"
            ? "hover:border-brand-cyan/20 hover:shadow-brand-cyan/10"
            : event === "ADD_FAVORITE"
              ? "hover:border-rose-300/40 dark:hover:border-rose-800/40 hover:shadow-rose-500/10"
              : "hover:border-amber-300/40 dark:hover:border-amber-800/40 hover:shadow-amber-500/10";

    return (
        <div
            className={cn(
                "flex items-start gap-3 p-3.5 rounded-xl border bg-card transition-all duration-200",
                "hover:bg-muted/30 hover:shadow-[0_0_15px_-8px]",
                accentBorder,
                "animate-fade-in-up",
            )}
            style={{ animationDelay: `${index * 40}ms` }}
        >
            {user.alias ? (
                <Link to={`/usuario/${user.alias}`} className="shrink-0">
                    <FriendAvatar name={user.name} avatarUrl={user.avatarUrl} className="mt-0.5" />
                </Link>
            ) : (
                <FriendAvatar name={user.name} avatarUrl={user.avatarUrl} className="mt-0.5" />
            )}
            <div className="flex flex-col min-w-0 gap-0.5 flex-1">
                <div className="flex items-center gap-1.5 text-xs leading-snug">
                    {activity.user.alias ? (
                        <Link to={`/usuario/${activity.user.alias}`} className="font-semibold text-foreground truncate hover:text-brand transition-colors">
                            {fullName}
                        </Link>
                    ) : (
                        <span className="font-semibold text-foreground truncate">
                            {fullName}
                        </span>
                    )}
                    <span
                        className={cn(
                            "shrink-0",
                            event === "MARK_READ" && "text-brand-cyan",
                            event === "ADD_FAVORITE" && "text-rose-400",
                            event === "REMOVE_FAVORITE" && "text-amber-400",
                        )}
                    >
                        {icon}
                    </span>
                </div>
                <p className="text-xs text-muted-foreground leading-snug">
                    {event === "MARK_READ"
                        ? `Leyó capítulo ${metadata.chapterName ?? "x"} de "${metadata.seriesName ?? "una serie"}"`
                        : event === "ADD_FAVORITE"
                          ? `Añadió "${metadata.seriesName ?? "una serie"}" a favoritos`
                          : `Quitó "${metadata.seriesName ?? "una serie"}" de favoritos`}
                </p>
                <span className="text-[10px] text-muted-foreground/50 mt-0.5">
                    {timeAgo(createdAt)}
                </span>
            </div>
        </div>
    );
}

function ActivityFeed() {
    const [activities, setActivities] = useState<FriendActivity[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetch = useCallback(async (p: number, append: boolean) => {
        try {
            const res = await getActivityFeed(p, 20);
            setActivities((prev) =>
                append ? [...prev, ...res.data] : res.data,
            );
            setTotal(res.total);
            setPage(p);
        } catch {
            toast.error("Error al cargar actividad");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        fetch(1, false);
    }, [fetch]);

    const handleLoadMore = () => {
        setLoadingMore(true);
        fetch(page + 1, true);
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className="flex items-start gap-3 p-3.5 rounded-xl border bg-card"
                    >
                        <Skeleton className="size-10 rounded-xl shrink-0" />
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                            <Skeleton className="h-3.5 w-32" />
                            <Skeleton className="h-3 w-48" />
                            <Skeleton className="h-2.5 w-16" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <EmptyState
                icon={Sparkles}
                title="Sin actividad reciente"
                description="Cuando tus amigos lean capítulos o añadan series a favoritos, aparecerá aquí."
            />
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {activities.map((a, i) => (
                <ActivityItem key={a.id} activity={a} index={i} />
            ))}
            {activities.length < total && (
                <div className="flex justify-center pt-2 col-span-full">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="gap-1.5 min-w-[130px] transition-all duration-200 hover:border-brand/30 hover:shadow-[0_0_12px_-6px] hover:shadow-brand/20"
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
        </div>
    );
}

function SearchSection() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchUserResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const debouncedSearch = useCallback(async (value: string) => {
        if (value.length < 2) {
            setResults([]);
            setSearched(false);
            return;
        }
        setLoading(true);
        setSearched(true);
        try {
            const data = await searchUsers(value);
            setResults(data);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => debouncedSearch(query), 300);
        return () => clearTimeout(timer);
    }, [query, debouncedSearch]);

    const handleSendRequest = async (receiverId: string) => {
        try {
            await sendRequest(receiverId);
            toast.success("Solicitud enviada");
            setResults((prev) => prev.filter((r) => r.id !== receiverId));
        } catch (e) {
            const err = e as AxiosError<{ message: string }>;
            toast.error(
                err.response?.data?.message ?? "Error al enviar solicitud",
            );
        }
    };

    return (
        <div className="space-y-4">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                <Input
                    placeholder="Buscar por nombre, apellido o apodo..."
                    className="pl-9 bg-secondary/50 border-transparent focus-within:bg-background transition-all duration-200"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            {query.length < 2 && !loading && !searched && (
                <EmptyState
                    icon={UserRoundSearch}
                    title="Buscar usuarios"
                    description="Escribe al menos 2 caracteres para encontrar otros lectores."
                />
            )}

            {loading && (
                <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 p-3 rounded-xl border bg-card"
                        >
                            <Skeleton className="size-10 rounded-xl" />
                            <div className="flex flex-col gap-1.5">
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && searched && results.length === 0 && (
                <EmptyState
                    icon={UserX}
                    title="Sin resultados"
                    description="No se encontraron usuarios con ese nombre."
                />
            )}

            {!loading && results.length > 0 && (
                <div className="flex flex-col gap-2">
                    {results.map((user) => (
                        <FriendCardWrapper key={user.id}>
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                {user.alias ? (
                                    <Link to={`/usuario/${user.alias}`} className="flex items-center gap-3 min-w-0 flex-1">
                                        <FriendAvatar name={user.name} avatarUrl={user.avatarUrl} />
                                        <UserInfo name={user.name} lastname={user.lastname} alias={user.alias} />
                                    </Link>
                                ) : (
                                    <>
                                        <FriendAvatar name={user.name} avatarUrl={user.avatarUrl} />
                                        <UserInfo name={user.name} lastname={user.lastname} alias={user.alias} />
                                    </>
                                )}
                            </div>
                            {user._friendStatus === "ACCEPTED" ? (
                                <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <UserCheck className="size-3.5" /> Amigos
                                </span>
                            ) : user._friendStatus === "PENDING" ? (
                                <span className="text-xs flex items-center gap-1 shrink-0 px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <Clock className="size-3.5" /> Pendiente
                                </span>
                            ) : user._friendStatus === "BLOCKED" ? (
                                <span className="text-xs flex items-center gap-1 shrink-0 px-2 py-1 rounded-md bg-destructive/10 text-destructive">
                                    <Ban className="size-3.5" /> Bloqueado
                                </span>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="shrink-0 gap-1.5 transition-all duration-200 hover:border-brand/40 hover:text-brand hover:bg-brand/5"
                                    onClick={() => handleSendRequest(user.id)}
                                >
                                    <UserPlus className="size-3.5" /> Agregar
                                </Button>
                            )}
                        </FriendCardWrapper>
                    ))}
                </div>
            )}
        </div>
    );
}

function FriendsList() {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmAction, setConfirmAction] = useState<{
        type: "remove" | "block";
        userId: string;
    } | null>(null);
    const onlineUserIds = useFriendStore((s) => s.onlineUserIds);

    const isOnline = (userId: string) => onlineUserIds.includes(userId);

    const fetch = async () => {
        try {
            setFriends(await getFriends());
        } catch {
            toast.error("Error al cargar amigos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetch();
    }, []);

    const handleRemove = async (userId: string) => {
        try {
            await removeFriend(userId);
            toast.success("Amigo eliminado");
            fetch();
        } catch (e) {
            const err = e as AxiosError<{ message: string }>;
            toast.error(
                err.response?.data?.message ?? "Error al eliminar amigo",
            );
        }
    };

    const handleBlock = async (userId: string) => {
        try {
            await blockUser(userId);
            toast.success("Usuario bloqueado");
            fetch();
        } catch (e) {
            const err = e as AxiosError<{ message: string }>;
            toast.error(
                err.response?.data?.message ?? "Error al bloquear usuario",
            );
        }
    };

    if (loading) return <ListSkeleton count={4} />;

    if (friends.length === 0) {
        return (
            <EmptyState
                icon={Users}
                title="Sin amigos"
                description="Busca usuarios y envía solicitudes para conectar con otros lectores."
            />
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {friends.map((friend, i) => (
                <FriendCardWrapper
                    key={friend.id}
                    style={{ animationDelay: `${i * 30}ms` }}
                >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        {friend.alias ? (
                            <Link to={`/usuario/${friend.alias}`} className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="relative shrink-0">
                                    <FriendAvatar name={friend.name} avatarUrl={friend.avatarUrl} />
                                    {isOnline(friend.id) && (
                                        <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 border-[2px] border-background shadow-[0_0_6px_-1px] shadow-emerald-400" />
                                    )}
                                </div>
                                <UserInfo name={friend.name} lastname={friend.lastname} alias={friend.alias} />
                            </Link>
                        ) : (
                            <>
                                <div className="relative shrink-0">
                                    <FriendAvatar name={friend.name} avatarUrl={friend.avatarUrl} />
                                    {isOnline(friend.id) && (
                                        <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 border-[2px] border-background shadow-[0_0_6px_-1px] shadow-emerald-400" />
                                    )}
                                </div>
                                <UserInfo name={friend.name} lastname={friend.lastname} alias={friend.alias} />
                            </>
                        )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all"
                            onClick={() => setConfirmAction({ type: "remove", userId: friend.id })}
                            title="Eliminar amigo"
                        >
                            <UserX className="size-4" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all"
                            onClick={() => setConfirmAction({ type: "block", userId: friend.id })}
                            title="Bloquear usuario"
                        >
                            <Ban className="size-4" />
                        </Button>
                    </div>
                </FriendCardWrapper>
            ))}
            <p className="text-[11px] text-muted-foreground/60 text-center pt-3 col-span-full">
                {friends.length} {friends.length === 1 ? "amigo" : "amigos"}
            </p>

            <ConfirmDialog
                open={confirmAction?.type === "remove"}
                onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
                title="Eliminar amigo"
                description="¿Estás seguro de eliminar este amigo? Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                variant="destructive"
                onConfirm={() => {
                    if (confirmAction) handleRemove(confirmAction.userId);
                    setConfirmAction(null);
                }}
            />

            <ConfirmDialog
                open={confirmAction?.type === "block"}
                onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
                title="Bloquear usuario"
                description="¿Estás seguro de bloquear este usuario? No podrá ver tu perfil ni enviarte solicitudes."
                confirmLabel="Bloquear"
                variant="destructive"
                onConfirm={() => {
                    if (confirmAction) handleBlock(confirmAction.userId);
                    setConfirmAction(null);
                }}
            />
        </div>
    );
}

function ReceivedRequests() {
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const setPendingCount = useFriendStore((s) => s.setPendingCount);

    const refetchCount = async () => {
        try {
            const count = await getReceivedRequestsCount();
            setPendingCount(count);
        } catch {
            // silenciar
        }
    };

    const fetch = async () => {
        try {
            setRequests(await getReceivedRequests());
        } catch {
            // silenciar
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetch();
    }, []);

    const handleAccept = async (id: number) => {
        try {
            await acceptRequest(id);
            toast.success("Solicitud aceptada");
            fetch();
            refetchCount();
        } catch (e) {
            const err = e as AxiosError<{ message: string }>;
            toast.error(err.response?.data?.message ?? "Error");
        }
    };

    const handleReject = async (id: number) => {
        try {
            await rejectRequest(id);
            toast.success("Solicitud rechazada");
            fetch();
            refetchCount();
        } catch (e) {
            const err = e as AxiosError<{ message: string }>;
            toast.error(err.response?.data?.message ?? "Error");
        }
    };

    if (loading) return <ListSkeleton count={3} />;

    if (requests.length === 0) {
        return (
            <EmptyState
                icon={UserPlus}
                title="Sin solicitudes"
                description="No tienes solicitudes de amistad pendientes."
            />
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {requests.map((req, i) => (
                <FriendCardWrapper
                    key={req.id}
                    style={{ animationDelay: `${i * 30}ms` }}
                >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        {req.sender.alias ? (
                            <Link to={`/usuario/${req.sender.alias}`} className="flex items-center gap-3 min-w-0 flex-1">
                                <FriendAvatar name={req.sender.name} avatarUrl={req.sender.avatarUrl} />
                                <UserInfo name={req.sender.name} lastname={req.sender.lastname} alias={req.sender.alias} />
                            </Link>
                        ) : (
                            <>
                                <FriendAvatar name={req.sender.name} avatarUrl={req.sender.avatarUrl} />
                                <UserInfo name={req.sender.name} lastname={req.sender.lastname} alias={req.sender.alias} />
                            </>
                        )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                        <Button
                            size="sm"
                            variant="default"
                            className="gap-1 h-8 transition-all duration-200"
                            onClick={() => handleAccept(req.id)}
                        >
                            <UserCheck className="size-3.5" /> Aceptar
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                            onClick={() => handleReject(req.id)}
                        >
                            <X className="size-3.5" /> Rechazar
                        </Button>
                    </div>
                </FriendCardWrapper>
            ))}
        </div>
    );
}

function SentRequests() {
    const [requests, setRequests] = useState<SentRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetch = async () => {
        try {
            setRequests(await getSentRequests());
        } catch {
            // silenciar
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetch();
    }, []);

    if (loading) return <ListSkeleton count={3} />;

    if (requests.length === 0) {
        return (
            <EmptyState
                icon={Send}
                title="Sin solicitudes enviadas"
                description="Las solicitudes que envíes aparecerán aquí."
            />
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {requests.map((req, i) => (
                <FriendCardWrapper
                    key={req.id}
                    style={{ animationDelay: `${i * 30}ms` }}
                >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        {req.receiver.alias ? (
                            <Link to={`/usuario/${req.receiver.alias}`} className="flex items-center gap-3 min-w-0 flex-1">
                                <FriendAvatar name={req.receiver.name} avatarUrl={req.receiver.avatarUrl} />
                                <UserInfo name={req.receiver.name} lastname={req.receiver.lastname} alias={req.receiver.alias} />
                            </Link>
                        ) : (
                            <>
                                <FriendAvatar name={req.receiver.name} avatarUrl={req.receiver.avatarUrl} />
                                <UserInfo name={req.receiver.name} lastname={req.receiver.lastname} alias={req.receiver.alias} />
                            </>
                        )}
                    </div>
                    <span className="text-xs flex items-center gap-1 shrink-0 px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Clock className="size-3.5" /> Pendiente
                    </span>
                </FriendCardWrapper>
            ))}
        </div>
    );
}

function BlockedUsersList() {
    const [blocked, setBlocked] = useState<BlockedUser[]>([]);
    const [loading, setLoading] = useState(true);

    const fetch = async () => {
        try {
            setBlocked(await getBlockedUsers());
        } catch {
            // silenciar
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetch();
    }, []);

    const handleUnblock = async (userId: string) => {
        try {
            await unblockUser(userId);
            toast.success("Usuario desbloqueado");
            fetch();
        } catch (e) {
            const err = e as AxiosError<{ message: string }>;
            toast.error(err.response?.data?.message ?? "Error");
        }
    };

    if (loading) return <ListSkeleton count={2} />;

    if (blocked.length === 0) {
        return (
            <EmptyState
                icon={Ban}
                title="Sin bloqueos"
                description="No has bloqueado a ningún usuario."
            />
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {blocked.map((b, i) => (
                <FriendCardWrapper
                    key={b.id}
                    style={{ animationDelay: `${i * 30}ms` }}
                >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        {b.user.alias ? (
                            <Link to={`/usuario/${b.user.alias}`} className="flex items-center gap-3 min-w-0 flex-1">
                                <FriendAvatar name={b.user.name} avatarUrl={b.user.avatarUrl} />
                                <UserInfo name={b.user.name} lastname={b.user.lastname} alias={b.user.alias} />
                            </Link>
                        ) : (
                            <>
                                <FriendAvatar name={b.user.name} avatarUrl={b.user.avatarUrl} />
                                <UserInfo name={b.user.name} lastname={b.user.lastname} alias={b.user.alias} />
                            </>
                        )}
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 h-8 transition-all duration-200 hover:border-brand/40 hover:text-brand"
                        onClick={() => handleUnblock(b.user.id)}
                    >
                        Desbloquear
                    </Button>
                </FriendCardWrapper>
            ))}
        </div>
    );
}

function ListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="flex flex-col gap-2">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl border bg-card"
                >
                    <Skeleton className="size-10 rounded-xl" />
                    <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function FriendsPage() {
    const user = useAuthStore((s) => s.user);
    const { setContent } = useHeader();

    useEffect(() => {
        setContent({
            center: (
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
                        <HeartHandshake className="h-3.5 w-3.5 text-primary/80" />
                    </div>
                    <span className="text-sm font-semibold tracking-tight">Amigos</span>
                </div>
            ),
        });
        return () => setContent({});
    }, [setContent]);

    if (!user) return null;

    return (
        <>
            <SEO
                title="Amigos y Actividad"
                description="Conecta con otros lectores de manga en Mangalovers y sigue su actividad: lecturas, favoritos y más."
                canonicalPath="/amigos"
            />
            <div className="min-h-screen bg-background">

                <main className="container mx-auto px-4 py-6">
                    <Tabs defaultValue="activity" className="w-full">
                        <TabsList className="w-full h-auto p-1 bg-muted/50 rounded-2xl flex-wrap mb-6 gap-0.5">
                            <TabsTrigger
                                value="activity"
                                className="flex-1 gap-1.5 rounded-xl text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm py-2 min-w-0"
                            >
                                <Sparkles className="size-3.5 shrink-0" />{" "}
                                <span className="truncate">Actividad</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="friends"
                                className="flex-1 gap-1.5 rounded-xl text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm py-2 min-w-0"
                            >
                                <HeartHandshake className="size-3.5 shrink-0" />{" "}
                                <span className="truncate">Amigos</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="requests"
                                className="flex-1 gap-1.5 rounded-xl text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm py-2 min-w-0"
                            >
                                <UserPlus className="size-3.5 shrink-0" />{" "}
                                <span className="truncate">Solicitudes</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="sent"
                                className="flex-1 gap-1.5 rounded-xl text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm py-2 min-w-0"
                            >
                                <Send className="size-3.5 shrink-0" />{" "}
                                <span className="truncate">Enviadas</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="search"
                                className="flex-1 gap-1.5 rounded-xl text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm py-2 min-w-0"
                            >
                                <Search className="size-3.5 shrink-0" />{" "}
                                <span className="truncate">Buscar</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="blocked"
                                className="flex-1 gap-1.5 rounded-xl text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm py-2 min-w-0"
                            >
                                <Ban className="size-3.5 shrink-0" />{" "}
                                <span className="truncate">Bloqueados</span>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="activity">
                            <ActivityFeed />
                        </TabsContent>
                        <TabsContent value="friends">
                            <FriendsList />
                        </TabsContent>
                        <TabsContent value="requests">
                            <ReceivedRequests />
                        </TabsContent>
                        <TabsContent value="sent">
                            <SentRequests />
                        </TabsContent>
                        <TabsContent value="search">
                            <SearchSection />
                        </TabsContent>
                        <TabsContent value="blocked">
                            <BlockedUsersList />
                        </TabsContent>
                    </Tabs>
                </main>
            </div>
        </>
    );
}
