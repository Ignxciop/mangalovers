import { SEO } from "@/components/seo";
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CoverImage } from "@/components/coverImage";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { getProfile, getProfileFavorites, getProfileActivity } from "@/api/users";
import { sendRequest } from "@/api/friends";
import { fetchFavorites } from "@/api/manga";
import type { PublicUserProfile, ProfileFavorite, ProfileActivity as ProfileActivityType } from "@/api/users";
import { timeAgo } from "@/lib/date";
import {
  Heart, BookOpen, BookMinus,
  UserPlus, UserCheck, Clock, Ban,
  Calendar, Users, ShieldAlert, UserRound,
  CheckCheck, ArrowRight, ArrowLeft,
  Search,
} from "lucide-react";
import { useHeader } from "@/context/headerContext";
import { SearchBar } from "@/components/search-bar";
import { useIsMobile } from "@/hooks/use-mobile";
import { MangaPagination } from "@/components/MangaPagination";
import { AxiosError } from "axios";

const viewTransitionStyle = `
@keyframes viewFadeSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-view {
  animation: viewFadeSlideIn 0.35s ease-out;
}
`;

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
        <div className="relative w-full aspect-[3/4] overflow-hidden">
          <CoverImage
            src={fav.series.cover}
            alt={fav.series.name}
            fallbackSrc={fav.series.fallbackCover}
          />
        </div>

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
  columns = 5,
  dynamic,
}: {
  favorites: ProfileFavorite[];
  loading: boolean;
  myReadMap: Map<number, string>;
  showComparison: boolean;
  profile: PublicUserProfile;
  columns?: number;
  dynamic?: boolean;
}) {
  const navigate = useNavigate();
  const gridClass = dynamic
    ? `grid gap-3`
    : columns === 6
      ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"
      : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3";

  if (loading) {
    const skeletonItems = Array.from({ length: columns * 2 });
    return (
      <div className={gridClass} style={dynamic ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}>
        {skeletonItems.map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden border border-border">
            <Skeleton className="aspect-[3/4] w-full rounded-none" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={gridClass} style={dynamic ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}>
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
  const [favTotal, setFavTotal] = useState(0);
  const [favPage, setFavPage] = useState(1);
  const [activities, setActivities] = useState<ProfileActivityType[]>([]);
  const [actTotal, setActTotal] = useState(0);
  const [actPage, setActPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [favLoading, setFavLoading] = useState(true);
  const [actLoading, setActLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'both' | 'favorites' | 'activity'>('both');

  const [myFavorites, setMyFavorites] = useState<ProfileFavorite[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [mutualOnly, setMutualOnly] = useState(false);
  const [compareChapters, setCompareChapters] = useState(false);
  const { setContent } = useHeader();
  const isMobile = useIsMobile();

  const [favColumns, setFavColumns] = useState(() => {
    const w = window.innerWidth;
    if (w >= 1920) return 8;
    if (w >= 1280) return 5;
    if (w >= 880) return 5;
    if (w >= 560) return 4;
    return 3;
  });
  const favLimit = favColumns * 4;

  useEffect(() => {
    setContent({
      center: <SearchBar />,
      right: isMobile ? (
        <button
          type="button"
          onClick={() => {
            const el = document.querySelector<HTMLInputElement>('[data-search-input]');
            el?.focus();
          }}
          className="flex items-center justify-center size-9 rounded-lg hover:bg-accent transition-colors"
        >
          <Search className="h-5 w-5" />
        </button>
      ) : undefined,
    });
    return () => setContent({});
  }, [setContent, isMobile]);

  useEffect(() => {
    if (viewMode !== 'favorites') return;
    function onResize() {
      const w = window.innerWidth;
      setFavColumns(
        w >= 1920 ? 8 :
        w >= 1280 ? 5 :
        w >= 880 ? 5 :
        w >= 560 ? 4 :
        3
      );
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'favorites') {
      fetchFavPage(1, favLimit);
    }
  }, [favColumns]);

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

        setFavLoading(true);
        setActLoading(true);
        try {
          const [favs, acts] = await Promise.all([
            getProfileFavorites(alias, 1, 15),
            getProfileActivity(alias, 1, 10),
          ]);
          if (cancelled) return;
          setFavorites(favs.data);
          setFavTotal(favs.total);
          setFavPage(1);
          setActivities(acts.data);
          setActTotal(acts.total);
          setActPage(1);
        } catch {
          if (!cancelled) { setFavorites([]); setActivities([]); }
        } finally {
          if (!cancelled) { setFavLoading(false); setActLoading(false); }
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

  async function fetchFavPage(page: number, limit = 15) {
    if (!alias) return;
    setFavLoading(true);
    try {
      const res = await getProfileFavorites(alias, page, limit);
      setFavorites(res.data);
      setFavTotal(res.total);
      setFavPage(page);
    } catch { /* ignore */ }
    setFavLoading(false);
  }

  async function fetchActPage(page: number, limit = 10) {
    if (!alias) return;
    setActLoading(true);
    try {
      const res = await getProfileActivity(alias, page, limit);
      setActivities(res.data);
      setActTotal(res.total);
      setActPage(page);
    } catch { /* ignore */ }
    setActLoading(false);
  }

  async function handleViewFavorites() {
    setViewMode('favorites');
    setFavPage(1);
    await fetchFavPage(1, favLimit);
  }

  async function handleViewActivity() {
    setViewMode('activity');
    await fetchActPage(1, 24);
  }

  async function handleBackToBoth() {
    setViewMode('both');
    await Promise.all([
      fetchFavPage(1),
      fetchActPage(1),
    ]);
  }

  const favTotalPages = viewMode === 'favorites'
    ? Math.max(1, Math.ceil(favTotal / favLimit))
    : Math.max(1, Math.ceil(favTotal / 15));
  const actTotalPages = viewMode === 'activity'
    ? Math.max(1, Math.ceil(actTotal / 24))
    : Math.max(1, Math.ceil(actTotal / 10));

  if (loading) {
    return (
      <>
        <SEO title="Cargando perfil..." />
        <div className="min-h-full bg-background flex flex-col overflow-x-hidden">
          <main className="w-full px-4 lg:px-6 py-8 flex-1 space-y-8">
            <div className="relative rounded-2xl border border-border bg-gradient-to-br from-brand/5 via-brand-cyan/[0.02] to-background p-6 md:p-8 overflow-hidden">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <Skeleton className="size-24 rounded-full shrink-0" />
                <div className="flex-1 space-y-3 w-full">
                  <Skeleton className="h-7 w-48 mx-auto sm:mx-0" />
                  <Skeleton className="h-4 w-28 mx-auto sm:mx-0" />
                  <div className="flex flex-wrap gap-3 justify-center sm:justify-start pt-1">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-9 w-32 mt-2 mx-auto sm:mx-0" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 space-y-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="rounded-xl overflow-hidden border border-border">
                      <Skeleton className="aspect-[3/4] w-full rounded-none" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-5 space-y-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
        <SEO title="Perfil no disponible" />
        <div className="min-h-full bg-background flex flex-col overflow-x-hidden">
          <main className="w-full px-4 lg:px-6 py-8 flex-1 flex items-center justify-center">
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
      <style>{viewTransitionStyle}</style>
      <SEO
        title={`Perfil de ${profile.alias ?? profile.name}`}
        description={`Perfil de ${profile.name} ${profile.lastname} en Mangalovers.`}
      />
      <div className="min-h-full bg-background flex flex-col overflow-x-hidden">
        <main className="w-full px-4 lg:px-6 py-8 flex-1 space-y-8">
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
          ) : viewMode === 'both' ? (
            <div key="both" className="animate-view grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <section className="lg:col-span-7">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-9 rounded-xl bg-rose-500/10 text-rose-500">
                      <Heart className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold">Favoritos</h2>
                      <p className="text-xs text-muted-foreground/70">
                        {favLoading ? "Cargando..." : `${displayFavorites.length} series`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {showToggles && !loadingMine && (
                      <>
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
                      </>
                    )}
                    <button
                      type="button"
                      onClick={handleViewFavorites}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30 transition-all"
                    >
                      Ver favoritos
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                </div>

                <FavoritesGrid
                  favorites={displayFavorites}
                  loading={favLoading}
                  myReadMap={myReadMap}
                  showComparison={compareChapters}
                  profile={profile}
                />
              </section>

              <section className="lg:col-span-5">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-9 rounded-xl bg-brand-green/10 text-brand-green">
                      <BookOpen className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold">Actividad reciente</h2>
                      <p className="text-xs text-muted-foreground/70">
                        {actLoading ? "Cargando..." : `Últimas ${activities.length} acciones`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleViewActivity}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30 transition-all"
                  >
                    Ver actividad
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>

                {actLoading && activities.length === 0 ? (
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
                  </div>
                )}
              </section>
            </div>
          ) : viewMode === 'favorites' ? (
            <div key="favorites" className="animate-view">
              <section>
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-9 rounded-xl bg-rose-500/10 text-rose-500">
                      <Heart className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold">Favoritos</h2>
                      <p className="text-xs text-muted-foreground/70">
                        {favLoading ? "Cargando..." : `Página ${favPage} de ${favTotalPages} (${favTotal} series)`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {showToggles && !loadingMine && (
                      <>
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
                      </>
                    )}
                    <button
                      type="button"
                      onClick={handleBackToBoth}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30 transition-all"
                    >
                      <ArrowLeft className="size-3.5" />
                      Volver
                    </button>
                  </div>
                </div>

                <FavoritesGrid
                  favorites={displayFavorites}
                  loading={favLoading}
                  myReadMap={myReadMap}
                  showComparison={compareChapters}
                  profile={profile}
                  columns={favColumns}
                  dynamic
                />

                {favTotalPages > 1 && (
                  <div className="flex justify-center pt-6">
                    <MangaPagination
                      page={favPage}
                      totalPages={favTotalPages}
                      setPage={(p) => fetchFavPage(p, favLimit)}
                    />
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div key="activity" className="animate-view">
              <section>
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-9 rounded-xl bg-brand-green/10 text-brand-green">
                      <BookOpen className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold">Actividad</h2>
                      <p className="text-xs text-muted-foreground/70">
                        {actLoading ? "Cargando..." : `Página ${actPage} de ${actTotalPages} (${actTotal} acciones)`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleBackToBoth}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30 transition-all"
                  >
                    <ArrowLeft className="size-3.5" />
                    Volver
                  </button>
                </div>

                {actLoading && activities.length === 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1,2,3,4,5,6].map((i) => (
                      <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                  </div>
                ) : activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed border-border">
                    <BookOpen className="size-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Sin actividad reciente</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                  </div>
                )}

                {actTotalPages > 1 && (
                  <div className="flex justify-center pt-6">
                    <MangaPagination
                      page={actPage}
                      totalPages={actTotalPages}
                      setPage={(p) => fetchActPage(p, 24)}
                    />
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
