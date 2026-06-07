import { useEffect, useState } from "react";
import { getScraperConfig, updateScraperConfig, getScraperStatus } from "@/api/admin";
import { api } from "@/api/axios";
import type { ScraperConfig, ScraperStatusData } from "@/types/admin";
import { SEO } from "@/components/seo";
import { AdminHeader } from "@/components/AdminHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    Wrench, Play, RotateCw, PauseCircle, RefreshCw,
    CheckCircle2, AlertCircle,
} from "lucide-react";

type RunState = Record<string, "idle" | "loading" | "done">;

const PROVIDER_LABELS: Record<string, string> = {
    olympus: "Olympus",
    manhwaweb: "Manhwaweb",
    leermangaesp: "LeerMangaEsp",
};

function Elapsed({ finishedAt }: { finishedAt: string | null }) {
    const [now, setNow] = useState<number | null>(null);
    useEffect(() => {
        const tick = () => setNow(Date.now());
        tick();
        const id = setInterval(tick, 60000);
        return () => clearInterval(id);
    }, []);
    if (!finishedAt) return "Ejecutándose...";
    if (now === null) return "...";
    const diff = now - new Date(finishedAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins} min`;
    return `hace ${Math.floor(mins / 60)}h ${mins % 60}min`;
}

function ProviderCard({
    name,
    label,
    lastRun,
    runState,
    isGlobalRunning,
    onRun,
}: {
    name: string;
    label: string;
    lastRun: { status: string; finishedAt: string | null; seriesProcessed: number; chaptersCreated: number; pagesScraped: number; errors: number; errorMessage?: string | null } | null;
    runState: RunState[string];
    isGlobalRunning: boolean;
    onRun: (provider: string) => void;
}) {
    const isOk = lastRun?.status === "success";
    const busy = runState === "loading" || (isGlobalRunning && runState !== "done");

    return (
        <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold capitalize">{label}</span>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={busy}
                    onClick={() => onRun(name)}
                >
                    {runState === "loading" ? (
                        <RefreshCw className="size-3.5 animate-spin" />
                    ) : (
                        <Play className="size-3.5" />
                    )}
                    {runState === "loading" ? "Ejecutando..." : "Ejecutar"}
                </Button>
            </div>
            {lastRun ? (
                <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        {isOk ? (
                            <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                        ) : (
                            <AlertCircle className="size-3.5 text-rose-500 shrink-0" />
                        )}
                        <span className={isOk ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                            {isOk ? "Exitoso" : "Falló"}
                        </span>
                        <span><Elapsed finishedAt={lastRun.finishedAt} /></span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4">
                        <span>Series: {lastRun.seriesProcessed}</span>
                        <span>Capítulos: {lastRun.chaptersCreated}</span>
                        <span>Páginas: {lastRun.pagesScraped}</span>
                        <span>Errores: {lastRun.errors}</span>
                    </div>
                    {lastRun.errorMessage && (
                        <p className="text-rose-500/70 break-words mt-1">{lastRun.errorMessage}</p>
                    )}
                </div>
            ) : (
                <p className="text-xs text-muted-foreground">Sin ejecuciones registradas</p>
            )}
        </div>
    );
}

export default function AdminTools() {
    const [config, setConfig] = useState<ScraperConfig | null>(null);
    const [status, setStatus] = useState<ScraperStatusData | null>(null);
    const [loading, setLoading] = useState(true);
    const [runStates, setRunStates] = useState<RunState>({});

    function loadData() {
        Promise.all([
            getScraperConfig(),
            getScraperStatus(),
        ])
            .then(([c, s]) => {
                setConfig(c.data);
                setStatus(s.data);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        loadData();
        const id = setInterval(loadData, 5000);
        return () => clearInterval(id);
    }, []);

    async function handleToggleAuto(enabled: boolean) {
        if (!config) return;
        try {
            const res = await updateScraperConfig({ autoEnabled: enabled });
            setConfig(res.data);
        } catch { }
    }

    async function handleRunProvider(provider: string) {
        setRunStates((prev) => ({ ...prev, [provider]: "loading" }));
        try {
            await api.post(`/admin/scraper/run/${provider}`);
            setRunStates((prev) => ({ ...prev, [provider]: "done" }));
            setTimeout(() => {
                setRunStates((prev) => ({ ...prev, [provider]: "idle" }));
                loadData();
            }, 3000);
        } catch {
            setRunStates((prev) => ({ ...prev, [provider]: "idle" }));
        }
    }

    const isGlobalRunning = status?.isRunning ?? false;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <SEO title="Herramientas de Administración" />

            <AdminHeader icon={Wrench} title="Herramientas" />

            <main className="container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0 overflow-x-hidden">
                <div className="border border-border rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {isGlobalRunning ? (
                                <RotateCw className="size-4 text-sky-500 animate-spin" />
                            ) : config?.autoEnabled ? (
                                <Play className="size-4 text-emerald-500" />
                            ) : (
                                <PauseCircle className="size-4 text-muted-foreground" />
                            )}
                            <span className="text-sm font-medium">
                                {isGlobalRunning ? "Ejecutándose..." : config?.autoEnabled ? "Scraper automático activado" : "Scraper automático desactivado"}
                            </span>
                        </div>
                        <Switch
                            checked={config?.autoEnabled ?? false}
                            onCheckedChange={handleToggleAuto}
                            disabled={isGlobalRunning}
                        />
                    </div>
                    {config && (
                        <p className="text-xs text-muted-foreground mt-2">
                            Intervalo: cada {config.intervalMinutes} minuto{config.intervalMinutes !== 1 ? "s" : ""}
                        </p>
                    )}
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-32 rounded-lg" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(PROVIDER_LABELS).map(([name, label]) => (
                            <ProviderCard
                                key={name}
                                name={name}
                                label={label}
                                lastRun={status?.providers.find((p) => p.name === name)?.lastRun ?? null}
                                runState={runStates[name] ?? "idle"}
                                isGlobalRunning={isGlobalRunning}
                                onRun={handleRunProvider}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
