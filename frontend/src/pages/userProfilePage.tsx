import { SEO } from "@/components/seo";
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { getProfile, getProfileFavorites, getProfileActivity } from "@/api/users";
import { sendRequest } from "@/api/friends";
import { fetchFavorites } from "@/api/manga";
import type { PublicUserProfile, ProfileFavorite, ProfileActivity as ProfileActivityType } from "@/api/users";
import { timeAgo } from "@/lib/date";
import {
  Heart, BookOpen, BookMinus, Loader2,
  UserPlus, UserCheck, Clock, Ban,
  Calendar, Users, ShieldAlert, UserRound,
  CheckCheck, ArrowRight,
} from "lucide-react";
import { AxiosError } from "axios";

const AVATAR_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "";

function FriendActionButton({
  profile,
  onFriendAction,
}: {
  profile: PublicUserProfile;
  onFriendAction: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);

  if (!user || profile.isOwner) return null;

  async function handleSendRequest() {
    setLoading(true);
    try {
      await sendRequest(profile.id);
      toast.success("Solicitud enviada");
      onFriendAction();
    } catch (e) {
      const err = e as AxiosError<{ message: string }>;
      toast.error(err.response?.data?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  if (profile.friendStatus === "ACCEPTED") {
    return (
      <span className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit">
        <UserCheck className="size-3.5" /> Amigos
      </span>
    );
  }

  if (profile.friendStatus === "PENDING") {
    return (
      <span className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 w-fit">
        <Clock className="size-3.5" /> Pendiente
      </span>
    );
  }

  if (profile.friendStatus === "BLOCKED") {
    return (
      <span className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 w-fit">
        <Ban className="size-3.5" /> Bloqueado
      </span>
    );
  }

  return (
    <Button size="sm" onClick={handleSendRequest} disabled={loading} className="gap-1.5">
      <UserPlus className="size-3.5" />
      {loading ? "Enviando..." : "Agregar amigo"}
    </Button>
  );
}

function SeriesCard({
  fav,
  myReadMap,
  showComparison,
  profile,
  onNavigate,
}: {
  fav: ProfileFavorite;
  myReadMap: Map<number, string>;
  showComparison: boolean;
  profile: PublicUserProfile;
  onNavigate: (slug: string) => void;
}) {
  const myChapter = myReadMap.get(fav.seriesId);
  const theirChapter = fav.lastReadChapterName;
  const avail = fav.lastAvailableChapterName;

  return (
    <div className="group relative rounded-xl overflow-hidden border border-border bg-card hover:border-brand/30 transition-all duration-200 hover:shadow-lg hover:shadow-brand/5">
      <div className="overflow-hidden">
      <a
        href={`/manga/${fav.series.slug}`}
        onClick={(e) => { e.preventDefault(); onNavigate(fav.series.slug); }}
        className="block relative"
      >
        {fav.series.cover ? (
          <img
            src={fav.series.cover}
            alt={fav.series.name}
            className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full aspect-[3/4] flex items-center justify-center bg-muted/30">
            <BookOpen className="size-8 text-muted-foreground/30" />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent pt-12 pb-3 px-3">
          <p className="text-xs font-semibold text-white truncate leading-snug drop-shadow-sm">
            {fav.series.name}
          </p>

          {!showComparison && theirChapter && (
            <p className="text-[10px] text-white/70 mt-1 flex items-center gap-1">
              <BookOpen className="size-3 shrink-0" />
              Cap. {theirChapter}
              {avail && avail !== theirChapter && (
                <span className="text-white/40">/ {avail}</span>
              )}
            </p>
          )}
        </div>
      </a>
      </div>

      {showComparison && (
        <div className="px-3 py-2.5 space-y-2 border-t border-border/50 bg-card">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground truncate">Tú</span>
            <span className="font-medium tabular-nums">
              {myChapter ? `Cap. ${myChapter}` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground truncate">
              {profile.alias ? `@${profile.alias}` : "Ellx"}
            </span>
            <span className="font-medium tabular-nums">
              {theirChapter ? `Cap. ${theirChapter}` : "—"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function FavoritesGrid({
  favorites,
  loading,
  myReadMap,
  showComparison,
  profile,
}: {
  favorites: ProfileFavorite[];
  loading: boolean;
  myReadMap: Map<number, string>;
  showComparison: boolean;
  profile: PublicUserProfile;
}) {
  const navigate = useNavigate();

  if (loading) {
    const skeletonItems = Array.from({ length: 10 });
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {skeletonItems.map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden border border-border">
            <Skeleton className="aspect-[3/4] w-full rounded-none" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {favorites.map((fav) => (
        <SeriesCard
          key={fav.id}
          fav={fav}
          myReadMap={myReadMap}
          showComparison={showComparison}
          profile={profile}
          onNavigate={(slug) => navigate(`/manga/${slug}`, { state: { from: window.location.pathname } })}
        />
      ))}
    </div>
  );
}

export default function UserProfilePage() {
  const { alias } = useParams<{ alias: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [favorites, setFavorites] = useState<ProfileFavorite[]>([]);
  const [activities, setActivities] = useState<ProfileActivityType[]>([]);
  const [totalActivity, setTotalActivity] = useState(0);
  const [activityPage, setActivityPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingFavs, setLoadingFavs] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [myFavorites, setMyFavorites] = useState<ProfileFavorite[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [mutualOnly, setMutualOnly] = useState(false);
  const [compareChapters, setCompareChapters] = useState(false);

  const isOtherUser = currentUser && !profile?.isOwner;

  const myReadMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const f of myFavorites) {
      if (f.lastReadChapterName) {
        map.set(f.seriesId, f.lastReadChapterName);
      }
    }
    return map;
  }, [myFavorites]);

  const mutualIds = useMemo(() => {
    const ids = new Set<number>();
    for (const f of myFavorites) {
      ids.add(f.seriesId);
    }
    return ids;
  }, [myFavorites]);

  const displayFavorites = useMemo(() => {
    if (!mutualOnly || !isOtherUser) return favorites;
    return favorites.filter((f) => mutualIds.has(f.seriesId));
  }, [favorites, mutualOnly, mutualIds, isOtherUser]);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      if (!alias) return;
      setLoading(true);
      setError(null);
      try {
        const p = await getProfile(alias);
        if (cancelled) return;
        setProfile(p);

        setLoadingFavs(true);
        setLoadingActivity(true);
        try {
          const [favs, act] = await Promise.all([
            getProfileFavorites(alias),
            getProfileActivity(alias, 1, 10),
          ]);
          if (cancelled) return;
          setFavorites(favs);
          setActivities(act.data);
          setTotalActivity(act.total);
          setActivityPage(1);
        } catch {
          if (!cancelled) { setFavorites([]); setActivities([]); }
        } finally {
          if (!cancelled) { setLoadingFavs(false); setLoadingActivity(false); }
        }
      } catch (e) {
        if (cancelled) return;
        const err = e as AxiosError<{ message?: string }>;
        if (err.response?.status === 404) setError("Usuario no encontrado");
        else if (err.response?.status === 403) setError("Este perfil es privado");
        else setError("Error al cargar el perfil");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProfile();
    return () => { cancelled = true; };
  }, [alias]);

  useEffect(() => {
    if (!currentUser || profile?.isOwner) {
      setLoadingMine(false);
      return;
    }
    let cancelled = false;
    setLoadingMine(true);
    fetchFavorites()
      .then((res) => { if (!cancelled) setMyFavorites(res ?? []); })
      .catch(() => { if (!cancelled) setMyFavorites([]); })
      .finally(() => { if (!cancelled) setLoadingMine(false); });
    return () => { cancelled = true; };
  }, [currentUser, profile?.isOwner]);

  async function handleRefresh() {
    if (!alias) return;
    try {
      const p = await getProfile(alias);
      setProfile(p);
    } catch { /* ignore */ }
  }

  const loadingMatch = loading || loadingFavs;
  const loadingAct = loadingActivity;

  if (loading) {
    return (
      <>
        <SEO title="Cargando perfil..." />
        <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
          <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border shadow-[0_1px_0_0] shadow-brand/5">
            <div className="container mx-auto grid grid-cols-[auto_1fr_auto] items-center h-16 px-4 gap-4">
              <SidebarTrigger />
              <div className="flex justify-center min-w-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
                    <UserRound className="h-3.5 w-3.5 text-primary/80" />
                  </div>
                  <span className="text-sm font-semibold tracking-tight">Perfil</span>
                </div>
              </div>
            </div>
          </header>
        </div>
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
        <SEO title="Perfil no disponible" />
        <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
          <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border shadow-[0_1px_0_0] shadow-brand/5">
            <div className="container mx-auto grid grid-cols-[auto_1fr_auto] items-center h-16 px-4 gap-4">
              <SidebarTrigger />
              <div className="flex justify-center min-w-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
                    <UserRound className="h-3.5 w-3.5 text-primary/80" />
                  </div>
                  <span className="text-sm font-semibold tracking-tight">Perfil</span>
                </div>
              </div>
            </div>
          </header>
          <main className="container mx-auto px-4 py-8 flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center size-16 rounded-full bg-destructive/10 mx-auto">
                <ShieldAlert className="size-7 text-destructive" />
              </div>
              <h1 className="text-xl font-bold">{error ?? "Perfil no disponible"}</h1>
              <Button variant="outline" onClick={() => navigate(-1)}>Volver</Button>
            </div>
          </main>
        </div>
      </>
    );
  }

  const initials = profile.name.charAt(0).toUpperCase();
  const joinedDate = new Date(profile.createdAt).toLocaleDateString("es-ES", {
    year: "numeric", month: "long",
  });
  const showToggles = isOtherUser && !loadingMine;

  return (
    <>
      <SEO
        title={`Perfil de ${profile.alias ?? profile.name}`}
        description={`Perfil de ${profile.name} ${profile.lastname} en Mangalovers.`}
      />
      <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
        <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border shadow-[0_1px_0_0] shadow-brand/5">
          <div className="container mx-auto grid grid-cols-[auto_1fr_auto] items-center h-16 px-4 gap-4">
            <SidebarTrigger />
            <div className="flex justify-center min-w-0">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
                  <UserRound className="h-3.5 w-3.5 text-primary/80" />
                </div>
                <span className="text-sm font-semibold tracking-tight truncate">
                  {profile.name} {profile.lastname}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 flex-1 space-y-8">
          <div className="relative rounded-2xl border border-border bg-gradient-to-br from-brand/5 via-brand-cyan/[0.02] to-background p-6 md:p-8 overflow-hidden">
            <div className="absolute top-0 right-0 size-64 bg-gradient-to-bl from-brand/5 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <Avatar className="size-24 rounded-full ring-4 ring-border/50 shadow-xl">
                {profile.avatarUrl && (
                  <AvatarImage
                    src={`${AVATAR_BASE}/uploads/avatars/${profile.avatarUrl}`}
                    alt={profile.name}
                    className="rounded-full object-cover"
                  />
                )}
                <AvatarFallback className="rounded-full text-3xl font-bold bg-gradient-to-br from-brand/20 to-brand-cyan/20 text-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="text-center sm:text-left flex-1 min-w-0">
                <h1 className="text-2xl font-bold tracking-tight">
                  {profile.name} {profile.lastname}
                </h1>
                {profile.alias && (
                  <p className="text-sm text-brand mt-0.5 font-medium">
                    @{profile.alias}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
                  <span className="text-xs flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="size-3.5" />
                    Miembro desde {joinedDate}
                  </span>
                  <span className="text-xs flex items-center gap-1.5 text-muted-foreground">
                    <Users className="size-3.5" />
                    {profile.friendCount} {profile.friendCount === 1 ? "amigo" : "amigos"}
                  </span>
                </div>
                <div className="mt-4">
                  <FriendActionButton profile={profile} onFriendAction={handleRefresh} />
                </div>
              </div>
            </div>
          </div>

          {!profile.isOwner && profile.profileVisibility === "FRIENDS" && (!profile.friendStatus || profile.friendStatus !== "ACCEPTED") ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="flex items-center justify-center size-16 rounded-full bg-amber-500/10">
                <ShieldAlert className="size-7 text-amber-500" />
              </div>
              <h2 className="text-lg font-semibold">Perfil privado</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Este perfil tiene visibilidad de solo amigos. Si quieres ver sus favoritos y actividad,
                envía una solicitud de amistad.
              </p>
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <section className="lg:col-span-7">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-9 rounded-xl bg-rose-500/10 text-rose-500">
                    <Heart className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">Favoritos</h2>
                    <p className="text-xs text-muted-foreground/70">
                      {loadingMatch ? "Cargando..." : `${displayFavorites.length} series`}
                    </p>
                  </div>
                </div>

                {showToggles && !loadingMine && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setMutualOnly((v) => !v)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                        mutualOnly
                          ? "bg-brand/10 text-brand border-brand/30 shadow-sm"
                          : "bg-muted/30 text-muted-foreground border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <CheckCheck className="size-3.5" />
                      Mutuos
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompareChapters((v) => !v)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                        compareChapters
                          ? "bg-brand/10 text-brand border-brand/30 shadow-sm"
                          : "bg-muted/30 text-muted-foreground border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <ArrowRight className="size-3.5" />
                      Comparar
                    </button>
                  </div>
                )}
              </div>

              <FavoritesGrid
                favorites={displayFavorites}
                loading={loadingMatch}
                myReadMap={myReadMap}
                showComparison={compareChapters}
                profile={profile}
              />
            </section>

            <section className="lg:col-span-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center justify-center size-9 rounded-xl bg-brand-green/10 text-brand-green">
                  <BookOpen className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Actividad reciente</h2>
                  <p className="text-xs text-muted-foreground/70">
                    {loadingAct ? "Cargando..." : `Últimas ${activities.length} acciones`}
                  </p>
                </div>
              </div>

              {loadingAct && activities.length === 0 ? (
                <div className="space-y-2">
                  {[1,2,3].map((i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed border-border">
                  <BookOpen className="size-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Sin actividad reciente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activities.map((a) => {
                    const isRead = a.event === "MARK_READ";
                    const isAdd = a.event === "ADD_FAVORITE";
                    return (
                      <div
                        key={a.id}
                        className="flex items-start gap-3 p-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted/30 transition-all duration-200"
                      >
                        <div className={`flex items-center justify-center size-8 rounded-lg shrink-0 mt-0.5 ${isRead ? "bg-brand-green/10 text-brand-green" : isAdd ? "bg-rose-500/10 text-rose-500" : "bg-orange-500/10 text-orange-500"}`}>
                          {isRead ? <BookOpen className="size-3.5" /> : isAdd ? <Heart className="size-3.5" /> : <BookMinus className="size-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground/90">
                            {isRead
                              ? `Leyó ${a.metadata.chapterName ? `capítulo ${a.metadata.chapterName}` : "un capítulo"}${a.metadata.seriesName ? ` de ${a.metadata.seriesName}` : ""}`
                              : isAdd
                                ? `Añadió ${a.metadata.seriesName ?? "una serie"} a favoritos`
                                : `Quitó ${a.metadata.seriesName ?? "una serie"} de favoritos`}
                          </p>
                          <p className="text-xs text-muted-foreground/60 mt-0.5">{timeAgo(a.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                  {activities.length < totalActivity && (
                    <div className="flex justify-center pt-2">
                      <Button variant="outline" size="sm" onClick={async () => {
                        if (!alias) return;
                        setLoadingActivity(true);
                        try {
                          const res = await getProfileActivity(alias, activityPage + 1, 10);
                          setActivities((prev) => [...prev, ...res.data]);
                          setTotalActivity(res.total);
                          setActivityPage((p) => p + 1);
                        } catch { /* ignore */ }
                        setLoadingActivity(false);
                      }} disabled={loadingAct} className="gap-1.5">
                        {loadingAct ? <><Loader2 className="size-3.5 animate-spin" /> Cargando...</> : "Cargar más"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
          )}
        </main>
      </div>
    </>
  );
}
