import { useEffect, useState } from "react";
import { getMetrics } from "@/api/admin";
import type { AdminMetrics } from "@/types/admin";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SEO } from "@/components/seo";

const STATUS_LABELS: Record<string, string> = {
    OPEN: "Abiertas",
    REVIEWING: "Revisando",
    RESOLVED: "Resueltas",
    REJECTED: "Rechazadas",
    CLOSED: "Cerradas",
};

function StatRow({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
    return (
        <div className="flex items-baseline justify-between py-2 border-b border-border last:border-0">
            <div>
                <span className="text-xs text-muted-foreground">{label}</span>
                {sub && <span className="text-[10px] text-muted-foreground/50 ml-2">{sub}</span>}
            </div>
            <span className="text-sm font-semibold tabular-nums">{value}</span>
        </div>
    );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="border border-border rounded-md">
            <div className="px-3 py-2 border-b border-border bg-muted/20">
                <span className="text-[11px] font-medium text-muted-foreground">{title}</span>
            </div>
            <div className="p-3">
                {children}
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
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-background">
            <SEO title="Panel de Administración" />

            <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border">
                <div className="container mx-auto grid grid-cols-[auto_1fr] items-center h-14 px-4">
                    <SidebarTrigger />
                    <div className="flex justify-center min-w-0">
                        <span className="text-xs font-medium text-muted-foreground">
                            Panel de Administración
                        </span>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6">
                {loading ? (
                    <div className="flex justify-center py-24">
                        <div className="size-5 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
                    </div>
                ) : !metrics ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                        <p className="text-xs text-muted-foreground">No se pudieron cargar las métricas</p>
                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto space-y-4">
                        <SectionCard title="Usuarios">
                            <StatRow label="Total" value={metrics.users.total} />
                            <StatRow label="Usuarios" value={metrics.users.regular} />
                            <StatRow
                                label="Administradores"
                                value={metrics.users.admins}
                            />
                        </SectionCard>

                        <SectionCard title="Contenido">
                            <StatRow label="Series" value={metrics.content.series} />
                            <StatRow label="Capítulos" value={metrics.content.chapters} />
                        </SectionCard>

                        <SectionCard title="Sugerencias">
                            <StatRow
                                label="Total"
                                value={metrics.suggestions.total}
                                sub={`${metrics.suggestions.today} hoy`}
                            />
                        </SectionCard>

                        {Object.keys(metrics.suggestions.byStatus).length > 0 && (
                            <SectionCard title="Sugerencias por estado">
                                <div className="space-y-2.5">
                                    {Object.entries(metrics.suggestions.byStatus).map(([status, count]) => {
                                        const total = metrics.suggestions.total || 1;
                                        const pct = Math.round((count / total) * 100);
                                        return (
                                            <div key={status}>
                                                <div className="flex items-center justify-between text-xs mb-1">
                                                    <span className="text-muted-foreground">{STATUS_LABELS[status] ?? status}</span>
                                                    <span className="text-muted-foreground/60 tabular-nums">{count}</span>
                                                </div>
                                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-muted-foreground/20 rounded-full transition-all"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </SectionCard>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
