import { useEffect, useState } from "react";
import { getMetrics } from "@/api/admin";
import type { AdminMetrics } from "@/types/admin";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SEO } from "@/components/seo";
import { cn } from "@/lib/utils";
import {
    Shield,
    Users,
    MessageSquare,
    BookOpen,
    BookMarked,
    TrendingUp,
    Loader2,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
    OPEN: "Abiertas",
    REVIEWING: "Revisando",
    RESOLVED: "Resueltas",
    REJECTED: "Rechazadas",
    CLOSED: "Cerradas",
};

const STATUS_COLORS: Record<string, string> = {
    OPEN: "bg-yellow-500",
    REVIEWING: "bg-blue-500",
    RESOLVED: "bg-green-500",
    REJECTED: "bg-red-500",
    CLOSED: "bg-gray-400",
};

function StatCard({
    icon: Icon,
    label,
    value,
    sub,
    color,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: number | string;
    sub?: string;
    color: string;
}) {
    return (
        <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
            <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0", color)}>
                <Icon className="size-5 text-white" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    {label}
                </p>
                <p className="text-2xl font-bold mt-0.5">{value}</p>
                {sub && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>
                )}
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getMetrics()
            .then((res) => setMetrics(res.data))
            .catch(() => {
                // Silenciar
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-background">
            <SEO title="Panel de Administración" />

            <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border shadow-[0_1px_0_0] shadow-brand/5">
                <div className="container mx-auto grid grid-cols-[auto_1fr] items-center h-16 px-4 gap-4">
                    <SidebarTrigger />
                    <div className="flex justify-center min-w-0">
                        <div className="flex items-center gap-2 shrink-0">
                            <Shield className="h-4 w-4 text-amber-500" />
                            <span className="text-sm font-semibold text-foreground tracking-wide">
                                Panel de Administración
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex justify-center py-24">
                        <Loader2 className="size-7 animate-spin text-muted-foreground" />
                    </div>
                ) : !metrics ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                        <Shield className="h-12 w-12 text-muted-foreground/30" />
                        <p className="text-muted-foreground text-sm">
                            No se pudieron cargar las métricas
                        </p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <section>
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Users className="size-4" />
                                Usuarios
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <StatCard
                                    icon={Users}
                                    label="Total"
                                    value={metrics.users.total}
                                    sub={`${metrics.users.regular} usuarios · ${metrics.users.admins} administradores`}
                                    color="bg-blue-500"
                                />
                                <StatCard
                                    icon={Users}
                                    label="Usuarios"
                                    value={metrics.users.regular}
                                    color="bg-blue-500/80"
                                />
                                <StatCard
                                    icon={Shield}
                                    label="Administradores"
                                    value={metrics.users.admins}
                                    color="bg-amber-500"
                                />
                            </div>
                        </section>

                        <section>
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                <BookOpen className="size-4" />
                                Contenido
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <StatCard
                                    icon={BookMarked}
                                    label="Series"
                                    value={metrics.content.series}
                                    color="bg-violet-500"
                                />
                                <StatCard
                                    icon={BookOpen}
                                    label="Capítulos"
                                    value={metrics.content.chapters}
                                    color="bg-violet-500/80"
                                />
                            </div>
                        </section>

                        <section>
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                <MessageSquare className="size-4" />
                                Sugerencias
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                <StatCard
                                    icon={MessageSquare}
                                    label="Total"
                                    value={metrics.suggestions.total}
                                    color="bg-emerald-500"
                                />
                                <StatCard
                                    icon={TrendingUp}
                                    label="Hoy"
                                    value={metrics.suggestions.today}
                                    color="bg-emerald-500/80"
                                />
                            </div>
                            <div className="bg-card border border-border rounded-xl p-4">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                                    Por estado
                                </p>
                                <div className="space-y-3">
                                    {Object.entries(metrics.suggestions.byStatus).map(([status, count]) => {
                                        const total = metrics.suggestions.total || 1;
                                        const pct = Math.round((count / total) * 100);
                                        return (
                                            <div key={status}>
                                                <div className="flex items-center justify-between text-xs mb-1">
                                                    <span className="font-medium">{STATUS_LABELS[status] ?? status}</span>
                                                    <span className="text-muted-foreground">{count} ({pct}%)</span>
                                                </div>
                                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={cn("h-full rounded-full transition-all", STATUS_COLORS[status] ?? "bg-gray-400")}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}
