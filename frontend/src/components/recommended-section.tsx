import { memo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CoverImage } from "@/components/coverImage";
import { Sparkles, ChevronRight } from "lucide-react";
import { FriendAvatars } from "@/components/FriendAvatars";
import type { RecommendedSeries } from "@/types/manga";

const RecommendedCard = memo(function RecommendedCard({
    item,
    index,
    friends,
}: {
    item: RecommendedSeries;
    index: number;
    friends: { userId: string; name: string; lastname: string; alias: string | null; avatarUrl: string | null }[];
}) {
    return (
        <div className="group animate-fade-in-up" style={{ animationDelay: `${index * 40}ms` }}>
            <Link
                to={`/manga/${item.slug}`}
                className="relative block aspect-[2/3] rounded-xl overflow-hidden border border-white/10 dark:border-white/[0.05] shadow-md transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-[0_0_25px_-5px] group-hover:shadow-brand/30 group-hover:border-brand/20 active:scale-[0.98]"
            >
                <CoverImage src={item.cover} alt={item.name} fallbackSrc={item.fallbackCover} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-t from-brand/20 via-transparent to-transparent" />
                {friends.length > 0 && (
                    <div className="absolute bottom-2 right-2 z-10">
                        <FriendAvatars friends={friends} size="xs" />
                    </div>
                )}
                <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {item.genres.slice(0, 2).map((genre) => (
                        <Badge
                            key={genre}
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 h-4 font-medium"
                        >
                            {genre}
                        </Badge>
                    ))}
                    {item.genres.length > 2 && (
                        <Badge
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 h-4"
                        >
                            +{item.genres.length - 2}
                        </Badge>
                    )}
                </div>
            </Link>
            <div className="mt-2">
                <h3
                    className="text-[11px] font-semibold text-foreground truncate leading-tight"
                    title={item.name}
                >
                    {item.name}
                </h3>
                <p className="text-[10px] text-muted-foreground">
                    {item.type ?? "Serie"}
                </p>
            </div>
        </div>
    );
});

function RecommendedSkeleton() {
    return (
        <div className="space-y-2">
            <Skeleton className="aspect-[2/3] rounded-xl w-full" />
            <Skeleton className="h-3 w-3/4 rounded" />
            <Skeleton className="h-2 w-1/2 rounded" />
        </div>
    );
}

export function RecommendedSection({
    items,
    basedOn,
    loading,
    friendActivity,
    columns = 6,
}: {
    items: RecommendedSeries[];
    basedOn: string[];
    loading: boolean;
    friendActivity: Record<number, { userId: string; name: string; lastname: string; alias: string | null; avatarUrl: string | null }[]>;
    columns?: number;
}) {
    if (loading) {
        return (
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <span className="relative flex items-center justify-center size-6 rounded-md bg-brand-amber/15 text-brand-amber">
                        <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <h2 className="text-sm font-semibold tracking-wide">
                        Recomendados para ti
                    </h2>
                </div>
                <div
                    className="grid gap-3"
                    style={{ gridTemplateColumns: `repeat(${Math.max(columns, 1)}, minmax(0, 1fr))` }}
                >
                    {Array.from({ length: columns }).map((_, i) => (
                        <RecommendedSkeleton key={i} />
                    ))}
                </div>
            </section>
        );
    }

    if (items.length === 0) return null;

    return (
        <section>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="relative flex items-center justify-center size-6 rounded-md bg-brand-amber/15 text-brand-amber">
                        <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <h2 className="text-sm font-semibold tracking-wide">
                        Recomendados para ti
                    </h2>
                    {basedOn.length > 0 && (
                        <span className="hidden sm:inline text-[10px] text-muted-foreground ml-1">
                            · Basado en: {basedOn.join(", ")}
                        </span>
                    )}
                </div>
                <Link
                    to="/mangas"
                    className="inline-flex items-center text-xs text-muted-foreground h-7 px-2 hover:text-foreground transition-colors"
                >
                    Ver catálogo
                    <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
            </div>

            <div
                className="grid gap-3"
                style={{
                    gridTemplateColumns: `repeat(${Math.max(columns, 1)}, minmax(0, 1fr))`,
                    contentVisibility: "auto",
                }}
            >
                {items.slice(0, columns).map((item, i) => (
                    <RecommendedCard key={item.id} item={item} index={i} friends={friendActivity[item.id] ?? []} />
                ))}
            </div>
        </section>
    );
}
