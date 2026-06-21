import { useEffect, useState, useCallback } from "react";
import { getScraperConfig, updateScraperConfig, getScraperStatus, getMissingPages, refillMissingPages } from "@/api/admin";
import type { MissingPagesData } from "@/api/admin";
import { api } from "@/api/axios";
import type { ScraperConfig, ScraperStatusData } from "@/types/admin";
import { useScraperSocket, type ScraperRunState } from "@/hooks/useScraperSocket";
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
    isRunning,
    lastRun,
    runState,
    stopping,
    onRun,
    onStop,
}: {
    name: string;
    label: string;
    isRunning: boolean;
    lastRun: { status: string; finishedAt: string | null; seriesProcessed: number; chaptersCreated: number; pagesScraped: number; errors: number; errorMessage?: string | null } | null;
    runState: ScraperRunState;
    stopping: boolean;
    onRun: (provider: string) => void;
    onStop: (provider: string) => void;
}) {
    const isOk = lastRun?.status === "success";
    const busy = runState === "loading" || (isRunning && runState !== "done");

    return (
        <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold capitalize">{label}</span>
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
            {isRunning || runState === "loading" ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RotateCw className="size-3.5 text-sky-500 animate-spin" />
                    <span className="text-sky-500">Ejecutándose...</span>
                </div>
            ) : lastRun ? (
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
    const [refillingBroken, setRefillingBroken] = useState<string | null>(null);
    const [brokenThresholds, setBrokenThresholds] = useState<Record<string, number>>({});

    function fetch() {
        getMissingPages()
            .then((r) => setData(r.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        fetch();
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

    async function handleRefillBroken(provider: string) {
        setRefillingBroken(provider);
        const threshold = brokenThresholds[provider] ?? 10;
        try {
            await refillMissingPages(provider, threshold);
            await fetch();
            loadData();
        } catch { /* ignore */ }
        setRefillingBroken(null);
    }

    function setThreshold(provider: string, val: number) {
        setBrokenThresholds((prev) => ({ ...prev, [provider]: Math.max(2, Math.min(1440, val)) }));
    }

    if (loading) {
        return (
            <div className="border border-border rounded-lg p-4 mt-6">
                <div className="flex items-center gap-2 mb-3">
                    <ImageIcon className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Capítulos sin páginas</span>
                </div>
                <p className="text-xs text-muted-foreground">Cargando...</p>
            </div>
        );
    }

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

            <div className="border-t border-border pt-4 mt-4">
                <span className="text-sm font-medium">Capítulos con páginas rotas</span>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                    Re-scrapea capítulos que tienen menos páginas del límite indicado
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {ALL_PROVIDERS.map((p) => {
                        const threshold = brokenThresholds[p.id] ?? 10;
                        const busy = refillingBroken === p.id;
                        return (
                            <div key={p.id} className="flex items-center justify-between border border-border/60 rounded-md px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium capitalize">{p.label}</span>
                                    <input
                                        type="number"
                                        min={2}
                                        max={1440}
                                        value={threshold}
                                        onChange={(e) => setThreshold(p.id, Number(e.target.value))}
                                        className="w-14 h-6 text-center border border-border rounded bg-background text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={busy}
                                    onClick={() => handleRefillBroken(p.id)}
                                >
                                    {busy ? (
                                        <RefreshCw className="size-3.5 animate-spin mr-1" />
                                    ) : (
                                        <RefreshCw className="size-3.5 mr-1" />
                                    )}
                                    Re-scrapear &lt;
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default function AdminTools() {
    const scraperState = useScraperSocket();
    const [config, setConfig] = useState<ScraperConfig | null>(null);
    const [status, setStatus] = useState<ScraperStatusData | null>(null);
    const [loading, setLoading] = useState(true);
    const [stopping, setStopping] = useState<Record<string, boolean>>({});
    const [localInterval, setLocalInterval] = useState(60);

    async function handleSaveInterval() {
        if (!config) return;
        const val = Math.max(1, Math.min(1440, localInterval));
        setLocalInterval(val);
        try {
            const res = await updateScraperConfig({ intervalMinutes: val });
            setConfig(res.data);
        } catch { /* ignore */ }
    }

    const loadData = useCallback(() => {
        Promise.all([
            getScraperConfig(),
            getScraperStatus(),
        ])
            .then(([c, s]) => {
                setConfig(c.data);
                setLocalInterval(c.data.intervalMinutes);
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
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData, scraperState]);

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
        try {
            await api.post(`/admin/scraper/run/${provider}`);
        } catch { /* WS lo maneja */ }
    }

    async function handleStopProvider(provider: string) {
        setStopping((prev) => ({ ...prev, [provider]: true }));
        try {
            await api.post(`/admin/scraper/stop/${provider}`);
        } catch { /* ignore */ }
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <SEO title="Herramientas de Administración" />

            <AdminHeader icon={Wrench} title="Herramientas" />

            <main className="container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0 overflow-x-hidden">
                <div className="border border-border rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-4">
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
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                            <span>Intervalo: cada</span>
                            <input
                                type="number"
                                min={1}
                                max={1440}
                                value={localInterval}
                                onChange={(e) => setLocalInterval(Number(e.target.value))}
                                onBlur={handleSaveInterval}
                                onKeyDown={(e) => e.key === "Enter" && handleSaveInterval()}
                                className="w-16 h-7 px-1 text-center border border-border rounded-md bg-background text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <span>minuto{localInterval !== 1 ? "s" : ""}</span>
                        </div>
                    )}
                    <div className="border-t border-border pt-3">
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
                                isRunning={status?.providers.find((sp) => sp.name === p.id)?.isRunning ?? false}
                                lastRun={status?.providers.find((sp) => sp.name === p.id)?.lastRun ?? null}
                                runState={scraperState[p.id] ?? "idle"}
                                stopping={stopping[p.id] ?? false}
                                onRun={handleRunProvider}
                                onStop={handleStopProvider}
                            />
                        ))}
                    </div>
                )}

                <MissingPagesSection loadData={loadData} />
            </main>
        </div>
    );
}
