import { SEO } from "@/components/seo";
import { useState, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Search, UserPlus, UserCheck, UserX, Ban, X, Clock, Send, Users, UserRound, HeartHandshake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getFriends, getReceivedRequests, getSentRequests, getBlockedUsers,
  searchUsers, sendRequest, acceptRequest, rejectRequest,
  blockUser, unblockUser, removeFriend,
  type SearchUserResult, type Friend, type FriendRequest, type SentRequest, type BlockedUser,
} from "@/api/friends";
import type { AxiosError } from "axios";

const AVATAR_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "";

function FriendAvatar({ name, avatarUrl, className }: { name: string; avatarUrl?: string | null; className?: string }) {
  return (
    <Avatar className={cn("size-10 rounded-lg", className)}>
      {avatarUrl && <AvatarImage src={`${AVATAR_BASE}/uploads/avatars/${avatarUrl}`} alt={name} className="rounded-lg object-cover" />}
      <AvatarFallback className="rounded-lg text-xs font-bold bg-primary/10 text-primary">
        {name ? name[0].toUpperCase() : <UserRound className="size-4" />}
      </AvatarFallback>
    </Avatar>
  );
}

function UserInfo({ name, lastname, alias }: { name: string; lastname: string; alias?: string | null }) {
  return (
    <div className="flex flex-col min-w-0 leading-tight">
      <span className="text-sm font-medium truncate">{name} {lastname}</span>
      {alias && <span className="text-xs text-muted-foreground/60 truncate">@{alias}</span>}
    </div>
  );
}

function SearchSection() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const debouncedSearch = useCallback(async (value: string) => {
    if (value.length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchUsers(value);
      setResults(data);
    } catch { setResults([]); } finally { setLoading(false); }
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
      toast.error(err.response?.data?.message ?? "Error al enviar solicitud");
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, apellido o apodo..."
          className="pl-9 bg-secondary/50"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {query.length < 2 && !loading && !searched && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex items-center justify-center size-14 rounded-full bg-muted">
            <Search className="size-6 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Buscar usuarios</p>
            <p className="text-xs text-muted-foreground max-w-64">
              Escribe al menos 2 caracteres para buscar usuarios
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
              <Skeleton className="size-10 rounded-lg" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex items-center justify-center size-14 rounded-full bg-muted">
            <UserX className="size-6 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Sin resultados</p>
            <p className="text-xs text-muted-foreground max-w-64">
              No se encontraron usuarios con ese nombre
            </p>
          </div>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {results.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FriendAvatar name={user.name} avatarUrl={user.avatarUrl} />
                <UserInfo name={user.name} lastname={user.lastname} alias={user.alias} />
              </div>
              {user._friendStatus === "ACCEPTED" ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                  <UserCheck className="size-3.5" /> Amigos
                </span>
              ) : user._friendStatus === "PENDING" ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                  <Clock className="size-3.5" /> Pendiente
                </span>
              ) : user._friendStatus === "BLOCKED" ? (
                <span className="text-xs text-destructive flex items-center gap-1 shrink-0">
                  <Ban className="size-3.5" /> Bloqueado
                </span>
              ) : (
                <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => handleSendRequest(user.id)}>
                  <UserPlus className="size-3.5" /> Agregar
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FriendsList() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      setFriends(await getFriends());
    } catch {
      toast.error("Error al cargar amigos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleRemove = async (userId: string) => {
    try {
      await removeFriend(userId);
      toast.success("Amigo eliminado");
      fetch();
    } catch (e) {
      const err = e as AxiosError<{ message: string }>;
      toast.error(err.response?.data?.message ?? "Error al eliminar amigo");
    }
  };

  const handleBlock = async (userId: string) => {
    try {
      await blockUser(userId);
      toast.success("Usuario bloqueado");
      fetch();
    } catch (e) {
      const err = e as AxiosError<{ message: string }>;
      toast.error(err.response?.data?.message ?? "Error al bloquear usuario");
    }
  };

  if (loading) return <ListSkeleton count={4} />;

  if (friends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex items-center justify-center size-14 rounded-full bg-muted">
          <Users className="size-6 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Sin amigos</p>
          <p className="text-xs text-muted-foreground max-w-64">
            Busca usuarios y envía solicitudes para conectar con otros lectores.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {friends.map((friend) => (
        <div key={friend.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <FriendAvatar name={friend.name} avatarUrl={friend.avatarUrl} />
            <UserInfo name={friend.name} lastname={friend.lastname} alias={friend.alias} />
          </div>
          <div className="flex gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemove(friend.id)} title="Eliminar amigo">
              <UserX className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => handleBlock(friend.id)} title="Bloquear usuario">
              <Ban className="size-4" />
            </Button>
          </div>
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground text-center pt-2">
        {friends.length} {friends.length === 1 ? "amigo" : "amigos"}
      </p>
    </div>
  );
}

function ReceivedRequests() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      setRequests(await getReceivedRequests());
    } catch {
      // silenciar
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleAccept = async (id: number) => {
    try {
      await acceptRequest(id);
      toast.success("Solicitud aceptada");
      fetch();
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
    } catch (e) {
      const err = e as AxiosError<{ message: string }>;
      toast.error(err.response?.data?.message ?? "Error");
    }
  };

  if (loading) return <ListSkeleton count={3} />;

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex items-center justify-center size-14 rounded-full bg-muted">
          <UserPlus className="size-6 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Sin solicitudes</p>
          <p className="text-xs text-muted-foreground max-w-64">
            No tienes solicitudes de amistad pendientes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {requests.map((req) => (
        <div key={req.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <FriendAvatar name={req.sender.name} avatarUrl={req.sender.avatarUrl} />
            <UserInfo name={req.sender.name} lastname={req.sender.lastname} alias={req.sender.alias} />
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Button size="sm" variant="default" className="gap-1" onClick={() => handleAccept(req.id)}>
              <UserCheck className="size-3.5" /> Aceptar
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => handleReject(req.id)}>
              <X className="size-3.5" /> Rechazar
            </Button>
          </div>
        </div>
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

  useEffect(() => { fetch(); }, []);

  if (loading) return <ListSkeleton count={3} />;

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex items-center justify-center size-14 rounded-full bg-muted">
          <Send className="size-6 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Sin solicitudes enviadas</p>
          <p className="text-xs text-muted-foreground max-w-64">
            Las solicitudes que envíes aparecerán aquí.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {requests.map((req) => (
        <div key={req.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <FriendAvatar name={req.receiver.name} avatarUrl={req.receiver.avatarUrl} />
            <UserInfo name={req.receiver.name} lastname={req.receiver.lastname} alias={req.receiver.alias} />
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
            <Clock className="size-3.5" /> Pendiente
          </span>
        </div>
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

  useEffect(() => { fetch(); }, []);

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
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex items-center justify-center size-14 rounded-full bg-muted">
          <Ban className="size-6 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Sin bloqueos</p>
          <p className="text-xs text-muted-foreground max-w-64">
            No has bloqueado a ningún usuario.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {blocked.map((b) => (
        <div key={b.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <FriendAvatar name={b.user.name} avatarUrl={b.user.avatarUrl} />
            <UserInfo name={b.user.name} lastname={b.user.lastname} alias={b.user.alias} />
          </div>
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => handleUnblock(b.user.id)}>
            Desbloquear
          </Button>
        </div>
      ))}
    </div>
  );
}

function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
          <Skeleton className="size-10 rounded-lg" />
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

  if (!user) return null;

  return (
    <>
      <SEO
        title="Amigos"
        description="Conecta con otros lectores de manga en Mangalovers. Gestiona tus amigos, solicitudes y usuarios bloqueados."
        canonicalPath="/amigos"
      />
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border shadow-[0_1px_0_0] shadow-brand/5">
          <div className="container mx-auto grid grid-cols-[auto_1fr_auto] items-center h-16 px-4 gap-4">
            <SidebarTrigger />
            <div className="flex justify-center min-w-0">
              <div className="flex items-center gap-2">
                <HeartHandshake className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Amigos</span>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Tabs defaultValue="friends" className="w-full">
            <TabsList className="w-full h-auto p-1 bg-muted/50 rounded-xl flex-wrap mb-6">
              <TabsTrigger value="friends" className="flex-1 gap-1.5 rounded-lg text-xs data-[state=active]:bg-background">
                <Users className="size-3.5" /> Amigos
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex-1 gap-1.5 rounded-lg text-xs data-[state=active]:bg-background">
                <UserPlus className="size-3.5" /> Solicitudes
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex-1 gap-1.5 rounded-lg text-xs data-[state=active]:bg-background">
                <Send className="size-3.5" /> Enviadas
              </TabsTrigger>
              <TabsTrigger value="search" className="flex-1 gap-1.5 rounded-lg text-xs data-[state=active]:bg-background">
                <Search className="size-3.5" /> Buscar
              </TabsTrigger>
              <TabsTrigger value="blocked" className="flex-1 gap-1.5 rounded-lg text-xs data-[state=active]:bg-background">
                <Ban className="size-3.5" /> Bloqueados
              </TabsTrigger>
            </TabsList>

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
