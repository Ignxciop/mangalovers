import { SEO } from "@/components/seo";
import { useState, useRef, useCallback, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    ChevronRight,
    ShieldAlert,
    Eye,
    Users,
    EyeOff,
    MessageSquare,
    Plus,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/api/axios";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { isInAppEnabled, setInAppEnabled } from "@/lib/inAppNotifications";
import { getSocket } from "@/api/socket";
import { Switch } from "@/components/ui/switch";
import { getMySuggestions } from "@/api/suggestions";
import type { Suggestion, SuggestionType, SuggestionStatus } from "@/types/suggestion";
import { SuggestionForm } from "@/components/suggestion-form";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/date";
import { cn } from "@/lib/utils";

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

export function InAppNotificationSection() {
    const [enabled, setEnabled] = useState(() => isInAppEnabled());

    function handleToggle(value: boolean) {
        setEnabled(value);
        setInAppEnabled(value);
    }

    return (
        <SectionCard accent="cyan" icon={enabled ? Bell : BellOff} title="Notificaciones en la app" description="Recibe avisos visuales de solicitudes, respuestas y más">
            <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <span className={`size-2.5 rounded-full ${enabled ? "bg-emerald-500 shadow-[0_0_6px] shadow-emerald-500/50" : "bg-muted-foreground/30"}`} />
                        <span className="text-sm font-medium">{enabled ? "Activadas" : "Desactivadas"}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Este dispositivo</span>
                </div>
                <div className="flex justify-end">
                    {enabled ? (
                        <Button variant="outline" size="sm" onClick={() => handleToggle(false)}>
                            <BellOff className="h-4 w-4 mr-2" />
                            Desactivar
                        </Button>
                    ) : (
                        <Button size="sm" onClick={() => handleToggle(true)}>
                            <Bell className="h-4 w-4 mr-2" />
                            Activar notificaciones
                        </Button>
                    )}
                </div>
            </div>
        </SectionCard>
    );
}

function OnlineVisibilitySection() {
    const { user } = useAuth();
    const setAuth = useAuthStore((s) => s.setAuth);
    const accessToken = useAuthStore((s) => s.accessToken);
    const [hideOnline, setHideOnline] = useState(user?.hideOnline ?? false);
    const [loading, setLoading] = useState(false);

    async function handleToggle(value: boolean) {
        setHideOnline(value);
        setLoading(true);
        try {
            const { data } = await api.patch("/auth/profile", { hideOnline: value });
            setAuth(accessToken!, data.data.user);
            const socket = getSocket();
            socket?.emit("presence:toggle-visibility", { hideOnline: value });
        } catch {
            setHideOnline(!value);
        } finally {
            setLoading(false);
        }
    }

    return (
        <SectionCard
            accent="purple"
            icon={hideOnline ? EyeOff : Eye}
            title="Estado en línea"
            description="Controla si apareces conectado para tus amigos"
        >
            <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <span className={`size-2.5 rounded-full ${hideOnline ? "bg-muted-foreground/30" : "bg-emerald-500 shadow-[0_0_6px] shadow-emerald-500/50"}`} />
                        <span className="text-sm font-medium">
                            {hideOnline ? "Invisible" : "Visible"}
                        </span>
                    </div>
                    <Switch
                        checked={!hideOnline}
                        onCheckedChange={(checked) => handleToggle(!checked)}
                        disabled={loading}
                    />
                </div>
                <p className="text-xs text-muted-foreground/70 leading-relaxed">
                    {hideOnline
                        ? "No aparecerás como conectado para tus amigos. Tus amigos no recibirán notificaciones cuando te conectes o desconectes."
                        : "Aparecerás como conectado para tus amigos cuando estés en línea."}
                </p>
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

const TYPE_LABELS: Record<SuggestionType, string> = {
    BUG: "Bug",
    SUGGESTION: "Sugerencia",
    CONTENT_ERROR: "Error de contenido",
    TECHNICAL_PROBLEM: "Problema técnico",
    OTHER: "Otro",
};

const STATUS_LABELS: Record<SuggestionStatus, string> = {
    OPEN: "Abierta",
    REVIEWING: "Revisando",
    RESOLVED: "Resuelta",
    REJECTED: "Rechazada",
    CLOSED: "Cerrada",
};

const STATUS_ICON: Record<SuggestionStatus, string> = {
    OPEN: "●",
    REVIEWING: "◐",
    RESOLVED: "✅",
    REJECTED: "✕",
    CLOSED: "○",
};

const STATUS_COLORS: Record<SuggestionStatus, string> = {
    OPEN: "text-yellow-600 dark:text-yellow-400",
    REVIEWING: "text-blue-600 dark:text-blue-400",
    RESOLVED: "text-green-600 dark:text-green-400",
    REJECTED: "text-red-600 dark:text-red-400",
    CLOSED: "text-muted-foreground",
};

function SupportSection() {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [suggestionOpen, setSuggestionOpen] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getMySuggestions(1, 50);
            setSuggestions(res.data);
        } catch {
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    return (
        <SectionCard accent="brand" icon={MessageSquare} title="Soporte" description="Tus sugerencias, reportes y respuestas del equipo">
            <div className="space-y-4">
                <Button size="sm" onClick={() => setSuggestionOpen(true)}>
                    <Plus className="size-4 mr-1.5" />
                    Nueva sugerencia
                </Button>

                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-[72px] rounded-lg" />
                        <Skeleton className="h-[72px] rounded-lg" />
                        <Skeleton className="h-[72px] rounded-lg" />
                    </div>
                ) : suggestions.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground/50">
                        <p>No has enviado ninguna sugerencia todavía.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {suggestions.map((s) => (
                            <div key={s.id} className="rounded-lg border border-border overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-xs text-muted-foreground">{TYPE_LABELS[s.type]}</span>
                                            <span className={cn("text-xs font-medium", STATUS_COLORS[s.status])}>
                                                {STATUS_ICON[s.status]} {STATUS_LABELS[s.status]}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium truncate">{s.title}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs text-muted-foreground/50">{timeAgo(s.createdAt)}</span>
                                        <ChevronRight className={cn(
                                            "size-4 text-muted-foreground/50 transition-transform",
                                            expandedId === s.id && "rotate-90",
                                        )} />
                                    </div>
                                </button>
                                {expandedId === s.id && (
                                    <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/10">
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                            {s.description}
                                        </p>
                                        {s.adminResponse && (
                                            <div className="rounded-lg border border-brand/20 bg-brand/5 p-3 space-y-1">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                    Respuesta del administrador
                                                </p>
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                    {s.adminResponse}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <SuggestionForm open={suggestionOpen} onClose={() => {
                    setSuggestionOpen(false);
                    fetch();
                }} />
            </div>
        </SectionCard>
    );
}

export default function UserSettingsPage() {
    const [tab, setTab] = useState("perfil");

    return (
        <>
            <SEO title="Configuración" description="Administra tu perfil, cambia tu contraseña y gestiona las notificaciones en Mangalovers." canonicalPath="/configuracion" />
            <div className="min-h-screen bg-background">
                <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border shadow-[0_1px_0_0] shadow-brand/5">
                    <div className="container mx-auto grid grid-cols-[auto_1fr] items-center h-16 px-4 gap-4">
                        <SidebarTrigger />
                        <div className="flex justify-center min-w-0">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm font-semibold truncate">Configuración</span>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-4 py-8 space-y-8">
                    <ProfileHero />

                    <Tabs value={tab} onValueChange={setTab} className="w-full">
                    <TabsList variant="line" className="w-full justify-start gap-0 border-b border-border rounded-none h-auto pb-1.5 bg-transparent overflow-x-auto flex-nowrap">
                        <TabsTrigger value="perfil" className="shrink-0 px-3 sm:px-5 py-3 text-sm after:bg-brand rounded-none border-0 gap-1.5">
                            <User className="size-4 shrink-0" />
                            <span className="truncate">Perfil</span>
                        </TabsTrigger>
                        <TabsTrigger value="privacidad" className="shrink-0 px-3 sm:px-5 py-3 text-sm after:bg-brand rounded-none border-0 gap-1.5">
                            <Eye className="size-4 shrink-0" />
                            <span className="truncate">Privacidad</span>
                        </TabsTrigger>
                        <TabsTrigger value="notificaciones" className="shrink-0 px-3 sm:px-5 py-3 text-sm after:bg-brand rounded-none border-0 gap-1.5">
                            <Bell className="size-4 shrink-0" />
                            <span className="truncate">Notificaciones</span>
                        </TabsTrigger>
                        <TabsTrigger value="soporte" className="shrink-0 px-3 sm:px-5 py-3 text-sm after:bg-brand rounded-none border-0 gap-1.5">
                            <MessageSquare className="size-4 shrink-0" />
                            <span className="truncate">Soporte</span>
                        </TabsTrigger>
                        <TabsTrigger value="cuenta" className="shrink-0 px-3 sm:px-5 py-3 text-sm after:bg-brand rounded-none border-0 gap-1.5">
                            <Lock className="size-4 shrink-0" />
                            <span className="truncate">Cuenta</span>
                        </TabsTrigger>
                    </TabsList>

                        <div className="mt-6">
                            <TabsContent value="perfil" className="space-y-6">
                                <ProfileSection />
                                <AliasSection />
                            </TabsContent>
                            <TabsContent value="privacidad" className="space-y-6">
                                <OnlineVisibilitySection />
                                <PrivacySection />
                            </TabsContent>
                            <TabsContent value="notificaciones" className="space-y-6">
                                <InAppNotificationSection />
                                <NotificationSection />
                            </TabsContent>
                            <TabsContent value="soporte" className="space-y-6">
                                <SupportSection />
                            </TabsContent>
                            <TabsContent value="cuenta" className="space-y-6">
                                <PasswordSection />
                                <DeleteAccountSection />
                            </TabsContent>
                        </div>
                    </Tabs>
                </main>
            </div>
        </>
    );
}
