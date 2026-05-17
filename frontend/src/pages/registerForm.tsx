import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircleIcon, Eye, EyeOff } from "lucide-react";

export function Register({ className, ...props }: React.ComponentProps<"div">) {
    const { register, isLoading, error } = useAuth();

    const [form, setForm] = useState({
        name: "",
        lastname: "",
        email: "",
        password: "",
        repeatpassword: "",
    });

    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const hasUnsaved =
        form.name !== "" ||
        form.lastname !== "" ||
        form.email !== "" ||
        form.password !== "" ||
        form.repeatpassword !== "";

    useEffect(() => {
        if (!hasUnsaved) return;
        const handler = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [hasUnsaved]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));

        if (
            e.target.name === "password" ||
            e.target.name === "repeatpassword"
        ) {
            setPasswordError(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (form.password !== form.repeatpassword) {
            setPasswordError("Las contraseñas no coinciden.");
            return;
        }

        const { ...payload } = form;
        await register(payload);
    };

    const displayError = passwordError || error;

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="overflow-hidden p-0 border-brand/20 dark:border-brand/10 shadow-[0_0_30px_-10px] shadow-brand/20 dark:shadow-brand/10">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <form className="p-6 md:p-8" onSubmit={handleSubmit}>
                        <FieldGroup>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 text-white shadow-sm mb-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-book-heart"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/><path d="M16 8.2C16 7 15 6 13.8 6c-.8 0-1.4.3-1.8.9-.4-.6-1-.9-1.8-.9C9 6 8 7 8 8.2c0 .6.3 1.2.8 1.7.8.8 3.2 2.8 3.2 2.8s2.4-2 3.2-2.8c.5-.5.8-1.1.8-1.7Z"/></svg>
                                </div>
                                <h1 className="text-2xl font-bold">
                                    Crear cuenta
                                </h1>
                                <p className="text-muted-foreground text-sm text-balance">
                                    Introduce tu correo electrónico a
                                    continuación para crear tu cuenta
                                </p>
                            </div>
                            <Field className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="name">
                                        Nombre
                                    </FieldLabel>
                                    <Input
                                        id="name"
                                        type="text"
                                        name="name"
                                        autoComplete="given-name"
                                        placeholder="José"
                                        value={form.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="lastname">
                                        Apellido
                                    </FieldLabel>
                                    <Input
                                        id="lastname"
                                        type="text"
                                        name="lastname"
                                        autoComplete="family-name"
                                        placeholder="Núñez"
                                        value={form.lastname}
                                        onChange={handleChange}
                                        required
                                    />
                                </Field>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    placeholder="correo@ejemplo.com"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                />
                                <FieldDescription>
                                    Usaremos esta información para contactarte.
                                    No compartiremos tu correo electrónico con
                                    nadie más.
                                </FieldDescription>
                            </Field>
                            <Field>
                                <Field className="grid grid-cols-2 gap-4">
                                    <Field>
                                        <FieldLabel htmlFor="password">
                                            Contraseña
                                        </FieldLabel>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                autoComplete="new-password"
                                                placeholder="••••••"
                                                value={form.password}
                                                onChange={handleChange}
                                                required
                                                className="pr-9"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((v) => !v)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                                tabIndex={-1}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="confirm-password">
                                            Confirmar Contraseña
                                        </FieldLabel>
                                        <div className="relative">
                                            <Input
                                                id="confirm-password"
                                                type={showConfirm ? "text" : "password"}
                                                name="repeatpassword"
                                                autoComplete="new-password"
                                                placeholder="••••••"
                                                value={form.repeatpassword}
                                                onChange={handleChange}
                                                required
                                                className="pr-9"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirm((v) => !v)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                                                tabIndex={-1}
                                            >
                                                {showConfirm ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </Field>
                                </Field>
                                <FieldDescription>
                                    Debe tener al menos 6 caracteres.
                                </FieldDescription>
                            </Field>
                            <Field>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading
                                        ? "Creando cuenta…"
                                        : "Crear Cuenta"}
                                </Button>
                            </Field>
                            <FieldDescription className="text-center">
                                ¿Ya tienes una cuenta?{" "}
                                <a href="/login">Inicia sesión</a>
                            </FieldDescription>
                        </FieldGroup>
                    </form>
                    <div className="bg-muted relative hidden md:block overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-brand/30 via-brand-cyan/20 to-transparent z-10" />
                        <img
                            src="/auth-form-anime.png"
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                    </div>
                </CardContent>
            </Card>
            <FieldDescription className="px-6 text-center">
                Al hacer clic en continuar, aceptas nuestros{" "}
                <a href="#">Términos de Servicio</a> y{" "}
                <a href="#">Política de Privacidad</a>.
            </FieldDescription>
            {displayError && (
                <Alert variant="destructive" className="border-0">
                    <AlertCircleIcon />
                    <AlertTitle>Registro fallido</AlertTitle>
                    <AlertDescription>{displayError}</AlertDescription>
                </Alert>
            )}
        </div>
    );
}
