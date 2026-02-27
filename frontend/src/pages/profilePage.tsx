import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
    ChevronLeft,
    User,
    Lock,
    Trash2,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/api/axios";

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

function ProfileSection() {
    const { user } = useAuth();
    const setAuth = useAuthStore((s) => s.setAuth);
    const accessToken = useAuthStore((s) => s.accessToken);
    const refreshToken = useAuthStore((s) => s.refreshToken);

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
            setAuth(accessToken!, refreshToken!, data.data.user);
            setSuccess("Datos actualizados correctamente");
        } catch (err: any) {
            setError(err?.response?.data?.message ?? "Error al actualizar");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary">
                        <User className="size-4" />
                    </div>
                    <div>
                        <CardTitle className="text-base">
                            Información personal
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Actualiza tu nombre, apellido y correo electrónico
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="name" className="text-xs">
                                Nombre
                            </Label>
                            <Input
                                id="name"
                                value={form.name}
                                onChange={(e) =>
                                    setForm((p) => ({
                                        ...p,
                                        name: e.target.value,
                                    }))
                                }
                                placeholder="Tu nombre"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="lastname" className="text-xs">
                                Apellido
                            </Label>
                            <Input
                                id="lastname"
                                value={form.lastname}
                                onChange={(e) =>
                                    setForm((p) => ({
                                        ...p,
                                        lastname: e.target.value,
                                    }))
                                }
                                placeholder="Tu apellido"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs">
                            Correo electrónico
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={form.email}
                            onChange={(e) =>
                                setForm((p) => ({
                                    ...p,
                                    email: e.target.value,
                                }))
                            }
                            placeholder="correo@ejemplo.com"
                        />
                    </div>

                    {success && <SuccessAlert message={success} />}
                    {error && <ErrorAlert message={error} />}

                    <div className="flex justify-end">
                        <Button type="submit" disabled={loading} size="sm">
                            {loading ? "Guardando..." : "Guardar cambios"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
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
            setSuccess("Contraseña actualizada. Cerrando sesión...");
            setTimeout(() => logout(), 2000);
        } catch (err: any) {
            setError(
                err?.response?.data?.message ?? "Error al cambiar contraseña",
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary">
                        <Lock className="size-4" />
                    </div>
                    <div>
                        <CardTitle className="text-base">Contraseña</CardTitle>
                        <CardDescription className="text-xs">
                            Al cambiar tu contraseña se cerrará sesión en todos
                            los dispositivos
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="currentPassword" className="text-xs">
                            Contraseña actual
                        </Label>
                        <Input
                            id="currentPassword"
                            type="password"
                            value={form.currentPassword}
                            onChange={(e) =>
                                setForm((p) => ({
                                    ...p,
                                    currentPassword: e.target.value,
                                }))
                            }
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="newPassword" className="text-xs">
                            Nueva contraseña
                        </Label>
                        <Input
                            id="newPassword"
                            type="password"
                            value={form.newPassword}
                            onChange={(e) =>
                                setForm((p) => ({
                                    ...p,
                                    newPassword: e.target.value,
                                }))
                            }
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="confirmPassword" className="text-xs">
                            Confirmar nueva contraseña
                        </Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={form.confirmPassword}
                            onChange={(e) =>
                                setForm((p) => ({
                                    ...p,
                                    confirmPassword: e.target.value,
                                }))
                            }
                            placeholder="••••••••"
                        />
                    </div>

                    {success && <SuccessAlert message={success} />}
                    {error && <ErrorAlert message={error} />}

                    <div className="flex justify-end">
                        <Button type="submit" disabled={loading} size="sm">
                            {loading ? "Actualizando..." : "Cambiar contraseña"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
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
        } catch (err: any) {
            setError(
                err?.response?.data?.message ?? "Error al eliminar cuenta",
            );
            setLoading(false);
        }
    }

    return (
        <Card className="border-destructive/30">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-9 rounded-lg bg-destructive/10 text-destructive">
                        <Trash2 className="size-4" />
                    </div>
                    <div>
                        <CardTitle className="text-base text-destructive">
                            Eliminar cuenta
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Esta acción es permanente e irreversible. Se
                            eliminarán todos tus datos.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-4 py-3 text-sm text-destructive/80 space-y-1">
                    <p className="font-medium text-destructive">
                        Se eliminará permanentemente:
                    </p>
                    <ul className="text-xs space-y-0.5 list-disc list-inside opacity-80">
                        <li>Tu cuenta y datos personales</li>
                        <li>Todo tu historial de lectura</li>
                        <li>Todos tus favoritos</li>
                        <li>Todas tus sesiones activas</li>
                    </ul>
                </div>

                {error && <ErrorAlert message={error} />}

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar mi cuenta
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                ¿Estás completamente seguro?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminarán
                                permanentemente tu cuenta y todos los datos
                                asociados a ella.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-1.5 py-2">
                            <Label htmlFor="deletePassword" className="text-xs">
                                Confirma tu contraseña para continuar
                            </Label>
                            <Input
                                id="deletePassword"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setPassword("")}>
                                Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                disabled={!password || loading}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {loading
                                    ? "Eliminando..."
                                    : "Sí, eliminar mi cuenta"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}

export default function ProfilePage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border">
                <div className="container mx-auto flex h-16 items-center px-4 gap-4 max-w-2xl">
                    <SidebarTrigger />
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                    >
                        <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                        Volver
                    </button>
                    <h1 className="text-sm font-semibold">Mi perfil</h1>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-2xl space-y-4">
                {/* Cabecera de usuario */}
                <div className="flex items-center gap-4 p-5 rounded-xl border border-border bg-muted/30 mb-6">
                    <div className="flex items-center justify-center size-14 rounded-xl bg-primary/10 text-primary font-bold text-xl shrink-0">
                        {user?.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                        <p className="font-semibold">
                            {user?.name} {user?.lastname}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {user?.email}
                        </p>
                    </div>
                </div>

                <ProfileSection />
                <PasswordSection />
                <DeleteAccountSection />
            </main>
        </div>
    );
}
