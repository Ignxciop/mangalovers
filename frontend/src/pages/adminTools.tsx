import { useEffect, useState } from "react";
import { getScraperConfig, updateScraperConfig, getScraperStatus, getMissingPages, refillMissingPages } from "@/api/admin";
import type { MissingPagesData } from "@/api/admin";
import { api } from "@/api/axios";
import type { ScraperConfig, ScraperStatusData } from "@/types/admin";
import { SEO } from "@/components/seo";
import { AdminHeader } from "@/components/AdminHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Wrench, Play, RotateCw, PauseCircle, RefreshCw,
    CheckCircle2, AlertCircle, ImageIcon, Square,
} from "lucide-react";

type RunState = Record<string, "idle" | "loading" | "done">;

const ALL_PROVIDERS = [
    { id: "olympus", label: "Olympus" },
    { id: "manhwaweb", label: "Manhwaweb" },
    { id: "leermangaesp", label: "LeerMangaEsp" },
];

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
    enabled,
    isRunning,
    lastRun,
    runState,
    stopping,
    onRun,
    onStop,
    onToggleEnabled,
}: {
    name: string;
    label: string;
    enabled: boolean;
    isRunning: boolean;
    lastRun: { status: string; finishedAt: string | null; seriesProcessed: number; chaptersCreated: number; pagesScraped: number; errors: number; errorMessage?: string | null } | null;
    runState: RunState[string];
    stopping: boolean;
    onRun: (provider: string) => void;
    onStop: (provider: string) => void;
    onToggleEnabled: (provider: string, enabled: boolean) => void;
}) {
    const isOk = lastRun?.status === "success";
    const busy = runState === "loading" || (isRunning && runState !== "done");

    return (
        <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {isRunning ? (
                        <RotateCw className="size-4 text-sky-500 animate-spin" />
                    ) : (
                        <Checkbox
                            id={`provider-${name}`}
                            checked={enabled}
                            onCheckedChange={(v) => onToggleEnabled(name, v === true)}
                        />
                    )}
                    <label htmlFor={`provider-${name}`} className="text-sm font-semibold capitalize cursor-pointer">
                        {label}
                    </label>
                </div>
                <div className="flex items-center gap-1.5">
                    {isRunning || stopping ? (
                        <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1.5"
                            disabled={stopping}
                            onClick={() => onStop(name)}
                        >
                            {stopping ? (
                                <RefreshCw className="size-3.5 animate-spin" />
                            ) : (
                                <Square className="size-3.5" />
                            )}
                            {stopping ? "Deteniendo..." : "Detener"}
                        </Button>
                    ) : (
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
                    )}
                </div>
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

function MissingPagesSection({ loadData }: { loadData: () => void }) {
    const [data, setData] = useState<MissingPagesData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refilling, setRefilling] = useState<string | null>(null);

    function fetch() {
        getMissingPages()
            .then((r) => setData(r.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        fetch();
        const id = setInterval(fetch, 15000);
        return () => clearInterval(id);
    }, []);

    async function handleRefill(provider: string) {
        setRefilling(provider);
        try {
            await refillMissingPages(provider);
            await fetch();
            loadData();
        } catch { /* ignore */ }
        setRefilling(null);
    }

    if (loading) return null;

    const total = data?.total ?? 0;

    return (
        <div className="border border-border rounded-lg p-4 mt-6">
            <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Capítulos sin páginas</span>
                {total > 0 && (
                    <span className="text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full font-medium">
                        {total} pendientes
                    </span>
                )}
            </div>
            {total === 0 ? (
                <p className="text-xs text-muted-foreground">No hay capítulos sin páginas</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {data?.providers.filter((p) => p.count > 0).map((p) => (
                        <div key={p.provider} className="flex items-center justify-between border border-border/60 rounded-md px-3 py-2">
                            <div>
                                <span className="text-sm font-medium capitalize">{p.provider}</span>
                                <span className="text-xs text-muted-foreground ml-2">{p.count} caps</span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={refilling === p.provider}
                                onClick={() => handleRefill(p.provider)}
                            >
                                {refilling === p.provider ? (
                                    <RefreshCw className="size-3.5 animate-spin mr-1" />
                                ) : (
                                    <RefreshCw className="size-3.5 mr-1" />
                                )}
                                Re-scrapear
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function AdminTools() {
    const [config, setConfig] = useState<ScraperConfig | null>(null);
    const [status, setStatus] = useState<ScraperStatusData | null>(null);
    const [loading, setLoading] = useState(true);
    const [runStates, setRunStates] = useState<RunState>({});
    const [stopping, setStopping] = useState<Record<string, boolean>>({});
    function loadData() {
        Promise.all([
            getScraperConfig(),
            getScraperStatus(),
        ])
            .then(([c, s]) => {
                setConfig(c.data);
                setStatus(s.data);
                setStopping((prev) => {
                    const next = { ...prev };
                    for (const p of ALL_PROVIDERS) {
                        const sp = s.data.providers.find((sp) => sp.name === p.id);
                        if (!sp?.isRunning && prev[p.id]) {
                            delete next[p.id];
                        }
                    }
                    return next;
                });
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
        } catch { /* ignore */ }
    }

    async function handleToggleProvider(provider: string, enabled: boolean) {
        if (!config) return;
        const current = config.enabledProviders;
        const next = enabled
            ? [...current, provider]
            : current.filter((p) => p !== provider);
        if (next.length === 0) return;
        try {
            const res = await updateScraperConfig({ enabledProviders: next });
            setConfig(res.data);
        } catch { /* ignore */ }
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

    async function handleStopProvider(provider: string) {
        setStopping((prev) => ({ ...prev, [provider]: true }));
        try {
            await api.post(`/admin/scraper/stop/${provider}`);
        } catch { /* ignore */ }
        setTimeout(() => {
            setStopping((prev) => ({ ...prev, [provider]: false }));
        }, 1000);
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <SEO title="Herramientas de Administración" />

            <AdminHeader icon={Wrench} title="Herramientas" />

            <main className="container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0 overflow-x-hidden">
                <div className="border border-border rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {config?.autoEnabled ? (
                                <Play className="size-4 text-emerald-500" />
                            ) : (
                                <PauseCircle className="size-4 text-muted-foreground" />
                            )}
                            <span className="text-sm font-medium">
                                {config?.autoEnabled ? "Scraper automático activado" : "Scraper automático desactivado"}
                            </span>
                        </div>
                        <Switch
                            checked={config?.autoEnabled ?? false}
                            onCheckedChange={handleToggleAuto}
                        />
                    </div>
                    {config && (
                        <p className="text-xs text-muted-foreground mt-2">
                            Intervalo: cada {config.intervalMinutes} minuto{config.intervalMinutes !== 1 ? "s" : ""}
                        </p>
                    )}
                </div>

                <div className="border border-border rounded-lg p-4 mb-6">
                    <p className="text-xs font-medium text-muted-foreground mb-3">
                        Proveedores activos en el scraper automático
                    </p>
                    <div className="flex flex-wrap gap-4">
                        {ALL_PROVIDERS.map((p) => {
                            const checked = config?.enabledProviders?.includes(p.id) ?? false;
                            const running = status?.providers.find((sp) => sp.name === p.id)?.isRunning ?? false;
                            return (
                                <label
                                    key={p.id}
                                    className="flex items-center gap-2 text-sm cursor-pointer"
                                >
                                    <Checkbox
                                        checked={checked}
                                        disabled={running || (checked && (config?.enabledProviders?.length ?? 0) <= 1)}
                                        onCheckedChange={(v) => handleToggleProvider(p.id, v === true)}
                                    />
                                    {p.label}
                                </label>
                            );
                        })}
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-32 rounded-lg" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {ALL_PROVIDERS.map((p) => (
                            <ProviderCard
                                key={p.id}
                                name={p.id}
                                label={p.label}
                                enabled={config?.enabledProviders?.includes(p.id) ?? false}
                                isRunning={status?.providers.find((sp) => sp.name === p.id)?.isRunning ?? false}
                                lastRun={status?.providers.find((sp) => sp.name === p.id)?.lastRun ?? null}
                                runState={runStates[p.id] ?? "idle"}
                                stopping={stopping[p.id] ?? false}
                                onRun={handleRunProvider}
                                onStop={handleStopProvider}
                                onToggleEnabled={handleToggleProvider}
                            />
                        ))}
                    </div>
                )}

                <MissingPagesSection loadData={loadData} />
            </main>
        </div>
    );
}
