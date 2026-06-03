import { SEO } from "@/components/seo";
import { useState, useRef, useEffect } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    User,
    Lock,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Camera,
    Bell,
    BellOff,
    BellRing,
    AtSign,
    BookOpen,
    Heart,
    BookMinus,
    Loader2,
    ChevronRight,
    ShieldAlert,
    Eye,
    Users,
    EyeOff,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/api/axios";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { getActivityFeed } from "@/api/friends";
import type { FriendActivity } from "@/api/friends";
import { timeAgo } from "@/lib/date";

const AVATAR_API = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "";

function AvatarUpload() {
    const { user } = useAuth();
    const setAuth = useAuthStore((s) => s.setAuth);
    const accessToken = useAuthStore((s) => s.accessToken);
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

    const avatarUrl = user?.avatarUrl
        ? `${AVATAR_API}/uploads/avatars/${user.avatarUrl}`
        : null;

    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowed = ["image/jpeg", "image/png", "image/webp"];
        if (!allowed.includes(file.type)) {
            setError("Solo JPG, PNG o WebP");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setError("Máximo 2 MB");
            return;
        }

        setUploading(true);
        setError("");

        try {
            const fd = new FormData();
            fd.append("avatar", file);
            const { data } = await api.put("/auth/avatar", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setAuth(accessToken!, data.data.user);
        } catch (err) {
            setError(
                (err as { response?: { data?: { message?: string } } })?.response
                    ?.data?.message ?? "Error al subir avatar",
            );
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    }

    return (
        <div className="flex flex-col items-center gap-3">
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="relative group size-24 rounded-full overflow-hidden bg-gradient-to-br from-brand/20 to-brand-cyan/20 ring-2 ring-border hover:ring-brand/60 transition-all shadow-lg shadow-brand/10"
            >
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="size-full object-cover"
                    />
                ) : (
                    <div className="size-full flex items-center justify-center text-3xl font-bold text-muted-foreground">
                        {user?.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Camera className="size-6 text-white drop-shadow-md" />
                </div>
                {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                        <div className="size-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </button>
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFile}
            />
            {error && (
                <p className="text-xs text-destructive text-center max-w-40">{error}</p>
            )}
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
            >
                Cambiar foto
            </button>
        </div>
    );
}

function SuccessAlert({ message }: { message: string }) {
    return (
        <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
        </Alert>
    );
}

function ErrorAlert({ message }: { message: string }) {
    return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
        </Alert>
    );
}

const brandBorder = "relative overflow-hidden before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r before:bg-gradient-to-b";

function ProfileHero() {
    const { user } = useAuth();
    const aliasDisplay = user?.alias ? `@${user.alias}` : null;

    return (
        <div className="relative rounded-2xl border border-border bg-gradient-to-br from-brand/5 via-brand-cyan/[0.02] to-background p-6 md:p-8 lg:p-10 overflow-hidden">
            <div className="absolute top-0 right-0 size-64 bg-gradient-to-bl from-brand/5 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 size-48 bg-gradient-to-tr from-brand-cyan/5 to-transparent rounded-full blur-2xl pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <AvatarUpload />
                <div className="text-center sm:text-left flex-1 min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        {user?.name} {user?.lastname}
                    </h1>
                    {aliasDisplay && (
                        <p className="text-sm text-brand mt-0.5 font-medium">
                            {aliasDisplay}
                        </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {user?.email}
                    </p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 shrink-0 self-start px-3 py-1.5 rounded-full bg-muted/50 border border-border text-xs text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    {user?.role === "ADMIN" ? "Administrador" : "Miembro"}
                </div>
            </div>
        </div>
    );
}

function SectionCard({ accent, icon: Icon, title, description, children, className = "" }: {
    accent: "brand" | "cyan" | "amber" | "green" | "purple" | "destructive";
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}) {
    const accentMap = {
        brand: "before:from-brand/50 before:to-brand-cyan/50",
        cyan: "before:from-brand-cyan/50 before:to-brand/50",
        amber: "before:from-brand-amber/50 before:to-brand-amber/20",
        green: "before:from-brand-green/50 before:to-brand-green/20",
        purple: "before:from-brand-purple/50 before:to-brand-purple/20",
        destructive: "before:from-destructive/50 before:to-destructive/20",
    };

    const iconBgMap = {
        brand: "bg-brand/10 text-brand",
        cyan: "bg-brand-cyan/10 text-brand-cyan",
        amber: "bg-brand-amber/10 text-brand-amber",
        green: "bg-brand-green/10 text-brand-green",
        purple: "bg-brand-purple/10 text-brand-purple",
        destructive: "bg-destructive/10 text-destructive",
    };

    return (
        <Card className={`${brandBorder} ${accentMap[accent]} border-border/80 shadow-sm hover:shadow-md hover:border-border transition-all duration-200 ${className}`}>
            <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center size-9 rounded-xl ${iconBgMap[accent]}`}>
                        <Icon className="size-4" />
                    </div>
                    <div>
                        <CardTitle className="text-base">{title}</CardTitle>
                        {description && (
                            <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

function ProfileSection() {
    const { user } = useAuth();
    const setAuth = useAuthStore((s) => s.setAuth);
    const accessToken = useAuthStore((s) => s.accessToken);

    const [form, setForm] = useState({
        name: user?.name ?? "",
        lastname: user?.lastname ?? "",
        email: user?.email ?? "",
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setSuccess("");
        setError("");

        try {
            const { data } = await api.patch("/auth/profile", form);
            setAuth(accessToken!, data.data.user);
            setSuccess("Datos actualizados correctamente");
        } catch (err) {
            setError(
                (err as { response?: { data?: { message?: string } } })?.response
                    ?.data?.message ?? "Error al actualizar",
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <SectionCard accent="brand" icon={User} title="Información personal" description="Actualiza tu nombre, apellido y correo electrónico">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-xs font-medium">Nombre</Label>
                        <Input
                            id="name"
                            value={form.name}
                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                            placeholder="Tu nombre"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="lastname" className="text-xs font-medium">Apellido</Label>
                        <Input
                            id="lastname"
                            value={form.lastname}
                            onChange={(e) => setForm((p) => ({ ...p, lastname: e.target.value }))}
                            placeholder="Tu apellido"
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-medium">Correo electrónico</Label>
                    <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="correo@ejemplo.com"
                    />
                </div>

                {success && <SuccessAlert message={success} />}
                {error && <ErrorAlert message={error} />}

                <div className="flex justify-end pt-1">
                    <Button type="submit" disabled={loading} size="sm">
                        {loading ? "Guardando…" : "Guardar cambios"}
                    </Button>
                </div>
            </form>
        </SectionCard>
    );
}

function AliasSection() {
    const { user } = useAuth();
    const setAuth = useAuthStore((s) => s.setAuth);
    const accessToken = useAuthStore((s) => s.accessToken);
    const [alias, setAlias] = useState(user?.alias ?? "");
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const canChange = !user?.aliasChanged;

    async function handleSave() {
        if (!alias.trim()) {
            setError("El alias no puede estar vacío");
            return;
        }
        if (alias.length < 3 || alias.length > 30) {
            setError("El alias debe tener entre 3 y 30 caracteres");
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(alias)) {
            setError("Solo letras, números y guion bajo");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const { data } = await api.patch("/auth/alias", { alias });
            setAuth(accessToken!, data.data.user);
            setSuccess("Alias actualizado correctamente");
            setEditing(false);
        } catch (err) {
            setError(
                (err as { response?: { data?: { message?: string } } })?.response
                    ?.data?.message ?? "Error al actualizar alias",
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <SectionCard accent="purple" icon={AtSign} title="Alias" description={canChange ? "Elige un alias único. Solo puedes hacerlo una vez." : "Ya personalizaste tu alias."}>
            {editing ? (
                <div className="space-y-3">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                        <Input
                            value={alias}
                            onChange={(e) => setAlias(e.target.value)}
                            placeholder="tu_alias"
                            className="pl-7"
                            maxLength={30}
                            autoFocus
                            disabled={loading}
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => { setEditing(false); setAlias(user?.alias ?? ""); setError(""); }} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={loading}>
                            {loading ? "Guardando…" : "Guardar"}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-brand-purple/10 flex items-center justify-center">
                                <AtSign className="size-4 text-brand-purple" />
                            </div>
                            <span className="text-sm font-medium">
                                {user?.alias ? (
                                    <span className="text-brand-purple">@{user.alias}</span>
                                ) : (
                                    <span className="text-muted-foreground italic">sin alias</span>
                                )}
                            </span>
                        </div>
                        {canChange && (
                            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground">
                                Cambiar <ChevronRight className="size-3 ml-1" />
                            </Button>
                        )}
                    </div>
                    {!canChange && (
                        <p className="text-xs text-muted-foreground/70">Ya utilizaste tu cambio único de alias.</p>
                    )}
                </div>
            )}
            {success && <div className="mt-3"><SuccessAlert message={success} /></div>}
            {error && <div className="mt-3"><ErrorAlert message={error} /></div>}
        </SectionCard>
    );
}

function PasswordSection() {
    const { logout } = useAuth();
    const [form, setForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSuccess("");
        setError("");

        if (form.newPassword !== form.confirmPassword) {
            setError("Las contraseñas nuevas no coinciden");
            return;
        }

        if (form.newPassword.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        setLoading(true);
        try {
            await api.patch("/auth/password", {
                currentPassword: form.currentPassword,
                newPassword: form.newPassword,
            });
            setSuccess("Contraseña actualizada. Cerrando sesión…");
            setTimeout(() => logout(), 2000);
        } catch (err) {
            setError(
                (err as { response?: { data?: { message?: string } } })?.response
                    ?.data?.message ?? "Error al cambiar contraseña",
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <SectionCard accent="amber" icon={Lock} title="Contraseña" description="Al cambiarla se cerrará sesión en todos los dispositivos">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="currentPassword" className="text-xs font-medium">Contraseña actual</Label>
                    <Input
                        id="currentPassword"
                        type="password"
                        value={form.currentPassword}
                        onChange={(e) => setForm((p) => ({ ...p, currentPassword: e.target.value }))}
                        placeholder="••••••••"
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="newPassword" className="text-xs font-medium">Nueva contraseña</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            value={form.newPassword}
                            onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="confirmPassword" className="text-xs font-medium">Confirmar</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={form.confirmPassword}
                            onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                {success && <SuccessAlert message={success} />}
                {error && <ErrorAlert message={error} />}

                <div className="flex justify-end pt-1">
                    <Button type="submit" disabled={loading} size="sm">
                        {loading ? "Actualizando…" : "Cambiar contraseña"}
                    </Button>
                </div>
            </form>
        </SectionCard>
    );
}

function DeleteAccountSection() {
    const { logout } = useAuth();
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleDelete() {
        setError("");
        setLoading(true);
        try {
            await api.delete("/auth/account", { data: { password } });
            logout();
        } catch (err) {
            setError(
                (err as { response?: { data?: { message?: string } } })?.response
                    ?.data?.message ?? "Error al eliminar cuenta",
            );
        }
    }

    return (
        <SectionCard accent="destructive" icon={ShieldAlert} title="Eliminar cuenta" description="Esta acción es irreversible">
            <div className="space-y-4">
                <div className="rounded-xl bg-destructive/5 border border-destructive/15 px-4 py-3.5 text-sm space-y-2">
                    <p className="font-semibold text-destructive flex items-center gap-2">
                        <Trash2 className="size-4" />
                        Se eliminará permanentemente:
                    </p>
                    <ul className="text-xs text-destructive/80 space-y-1 list-disc list-inside">
                        <li>Tu cuenta y datos personales</li>
                        <li>Historial de lectura y favoritos</li>
                        <li>Todas las sesiones activas</li>
                    </ul>
                </div>

                {error && <ErrorAlert message={error} />}

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="w-full">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar mi cuenta
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminarán permanentemente tu cuenta y todos los datos asociados.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-1.5 py-2">
                            <Label htmlFor="deletePassword" className="text-xs">Confirma tu contraseña para continuar</Label>
                            <Input
                                id="deletePassword"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setPassword("")}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                disabled={!password || loading}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {loading ? "Eliminando…" : "Sí, eliminar mi cuenta"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </SectionCard>
    );
}

export function NotificationSection() {
    const {
        permission,
        subscribed,
        supported,
        supportReason,
        isIOSInstallRequired,
        loading,
        error,
        subscribe,
        unsubscribe,
    } = usePushNotifications();

    if (isIOSInstallRequired) {
        return (
            <SectionCard accent="cyan" icon={Bell} title="Notificaciones" description="Instala la app para recibir notificaciones">
                <div className="rounded-xl bg-muted/30 border border-border px-4 py-3.5 text-sm space-y-1.5">
                    <p className="font-medium text-sm">Cómo instalar en iPhone / iPad</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        En Safari: toca <strong>Compartir ↑</strong> → <strong>Añadir a pantalla de inicio</strong> → abre Mangalovers desde tu pantalla de inicio y activa las notificaciones aquí.
                    </p>
                </div>
            </SectionCard>
        );
    }

    if (!supported) {
        return (
            <SectionCard accent="cyan" icon={BellOff} title="Notificaciones" description={supportReason ?? "No disponibles en este navegador"}>
                <div />
            </SectionCard>
        );
    }

    if (permission === "denied") {
        return (
            <SectionCard accent="destructive" icon={BellOff} title="Notificaciones bloqueadas" description="Bloqueadas en la configuración del navegador">
                <p className="text-xs text-muted-foreground leading-relaxed">
                    Para activarlas ve a la configuración de tu navegador → Privacidad y seguridad → Notificaciones → busca esta web y cámbialo a "Permitir".
                </p>
            </SectionCard>
        );
    }

    return (
        <SectionCard accent="cyan" icon={subscribed ? BellRing : Bell} title="Notificaciones" description={subscribed ? "Recibirás alertas de nuevos capítulos" : "Actívalas para no perderte ningún capítulo"}>
            <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <span className={`size-2.5 rounded-full ${subscribed ? "bg-emerald-500 shadow-[0_0_6px] shadow-emerald-500/50" : "bg-muted-foreground/30"}`} />
                        <span className="text-sm font-medium">{subscribed ? "Activadas" : "Desactivadas"}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Este dispositivo</span>
                </div>

                {error !== null && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="flex justify-end">
                    {subscribed ? (
                        <Button variant="outline" size="sm" onClick={unsubscribe} disabled={loading}>
                            <BellOff className="h-4 w-4 mr-2" />
                            {loading ? "Desactivando…" : "Desactivar"}
                        </Button>
                    ) : (
                        <Button size="sm" onClick={subscribe} disabled={loading}>
                            <Bell className="h-4 w-4 mr-2" />
                            {loading ? "Activando…" : "Activar notificaciones"}
                        </Button>
                    )}
                </div>
            </div>
        </SectionCard>
    );
}

function ActivitySection() {
    const [activities, setActivities] = useState<FriendActivity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            try {
                const res = await getActivityFeed(1, 10, "own");
                if (cancelled) return;
                setActivities(res.data);
            } catch {
                if (!cancelled) setActivities([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, []);

    function eventConfig(event: FriendActivity) {
        switch (event.event) {
            case "MARK_READ":
                return {
                    icon: BookOpen,
                    dot: "bg-brand-green shadow-[0_0_6px] shadow-brand-green/50",
                    iconBg: "bg-brand-green/10 text-brand-green",
                    text: `Leíste ${event.metadata.chapterName ?? "un capítulo"}${event.metadata.seriesName ? ` de ${event.metadata.seriesName}` : ""}`,
                };
            case "ADD_FAVORITE":
                return {
                    icon: Heart,
                    dot: "bg-rose-500 shadow-[0_0_6px] shadow-rose-500/50",
                    iconBg: "bg-rose-500/10 text-rose-500",
                    text: `Agregaste ${event.metadata.seriesName ?? "una serie"} a favoritos`,
                };
            case "REMOVE_FAVORITE":
                return {
                    icon: BookMinus,
                    dot: "bg-orange-500 shadow-[0_0_6px] shadow-orange-500/50",
                    iconBg: "bg-orange-500/10 text-orange-500",
                    text: `Eliminaste ${event.metadata.seriesName ?? "una serie"} de favoritos`,
                };
        }
    }

    if (loading) {
        return (
            <SectionCard accent="green" icon={Loader2} title="Actividad reciente" description="Cargando actividad…">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
            </SectionCard>
        );
    }

    if (activities.length === 0) {
        return (
            <SectionCard accent="green" icon={BookOpen} title="Actividad reciente" description="Aún no hay actividad registrada">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <BookOpen className="size-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Tus acciones aparecerán aquí</p>
                </div>
            </SectionCard>
        );
    }

    return (
        <SectionCard accent="green" icon={BookOpen} title="Actividad reciente" description="Tus últimas acciones en la plataforma">
            <div className="relative pl-6 space-y-0">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                {activities.map((a) => {
                    const cfg = eventConfig(a)!;
                    const Icon = cfg.icon;
                    return (
                        <div key={a.id} className="relative pb-4 last:pb-0 group">
                            <span className={`absolute -left-[15px] top-[7px] size-2.5 rounded-full ring-2 ring-background ${cfg.dot}`} />
                            <div className="flex items-start gap-3 rounded-xl px-3 py-2.5 group-hover:bg-muted/30 transition-colors">
                                <div className={`size-7 rounded-lg ${cfg.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                                    <Icon className="size-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground/90">{cfg.text}</p>
                                    <p className="text-xs text-muted-foreground/60 mt-0.5">{timeAgo(a.createdAt)}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </SectionCard>
    );
}

function PrivacySection() {
    const { user } = useAuth();
    const setAuth = useAuthStore((s) => s.setAuth);
    const accessToken = useAuthStore((s) => s.accessToken);
    const [visibility, setVisibility] = useState<"PUBLIC" | "FRIENDS" | "PRIVATE">(
        user?.profileVisibility ?? "PUBLIC",
    );
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    async function handleChange(value: "PUBLIC" | "FRIENDS" | "PRIVATE") {
        setVisibility(value);
        setLoading(true);
        setSuccess("");
        setError("");

        try {
            const { data } = await api.patch("/auth/profile", { profileVisibility: value });
            setAuth(accessToken!, data.data.user);
            setSuccess("Visibilidad actualizada");
        } catch (err) {
            setVisibility(user?.profileVisibility ?? "PUBLIC");
            setError(
                (err as { response?: { data?: { message?: string } } })?.response
                    ?.data?.message ?? "Error al actualizar visibilidad",
            );
        } finally {
            setLoading(false);
        }
    }

    const options: { value: "PUBLIC" | "FRIENDS" | "PRIVATE"; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
        { value: "PUBLIC", label: "Público", desc: "Todos pueden ver tu perfil y actividad", icon: Eye },
        { value: "FRIENDS", label: "Solo amigos", desc: "Solo tus amigos pueden ver tu perfil", icon: Users },
        { value: "PRIVATE", label: "Privado", desc: "Nadie puede ver tu perfil", icon: EyeOff },
    ];

    return (
        <SectionCard accent="purple" icon={Eye} title="Visibilidad del perfil" description="Controla quién puede ver tu perfil y actividad">
            <div className="space-y-2">
                {options.map((opt) => {
                    const Icon = opt.icon;
                    const selected = visibility === opt.value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleChange(opt.value)}
                            disabled={loading || selected}
                            className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                                selected
                                    ? "border-brand-purple/50 bg-brand-purple/10 ring-1 ring-brand-purple/30"
                                    : "border-border bg-muted/20 hover:bg-muted/40 hover:border-border/80"
                            }`}
                        >
                            <div className={`size-8 rounded-lg flex items-center justify-center ${
                                selected ? "bg-brand-purple/20 text-brand-purple" : "bg-muted-foreground/10 text-muted-foreground"
                            }`}>
                                <Icon className="size-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${selected ? "text-brand-purple" : "text-foreground"}`}>
                                    {opt.label}
                                </p>
                                <p className="text-xs text-muted-foreground/70 mt-0.5">{opt.desc}</p>
                            </div>
                            {selected && (
                                <CheckCircle2 className="size-4 text-brand-purple shrink-0" />
                            )}
                        </button>
                    );
                })}
            </div>
            {success && <div className="mt-3"><SuccessAlert message={success} /></div>}
            {error && <div className="mt-3"><ErrorAlert message={error} /></div>}
        </SectionCard>
    );
}

export default function ProfilePage() {
    return (
        <>
            <SEO title="Mi Perfil" description="Administra tu perfil, cambia tu contraseña y gestiona las notificaciones en Mangalovers." canonicalPath="/perfil" />
            <div className="min-h-screen bg-background">
                <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border shadow-[0_1px_0_0] shadow-brand/5">
                    <div className="flex items-center h-16 px-4 md:px-6 lg:px-8 gap-4">
                        <SidebarTrigger />
                        <div className="flex items-center gap-2 min-w-0">
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-semibold truncate">Mi perfil</span>
                        </div>
                    </div>
                </header>

                <main className="px-4 md:px-6 lg:px-8 py-6 space-y-8">
                    <ProfileHero />

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        <div className="lg:col-span-7 space-y-6">
                            <ProfileSection />
                            <PasswordSection />
                        </div>
                        <div className="lg:col-span-5 space-y-6">
                            <AliasSection />
                            <PrivacySection />
                            <ActivitySection />
                            <NotificationSection />
                            <DeleteAccountSection />
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
