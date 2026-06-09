import { SEO } from "@/components/seo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircleIcon, Eye, EyeOff } from "lucide-react";

type FieldErrors = Record<string, string>;

function validateField(name: string, value: string): string | null {
    switch (name) {
        case "name":
            if (!value.trim()) return "El nombre es requerido";
            if (value.trim().length < 2) return "El nombre debe tener al menos 2 caracteres";
            if (value.trim().length > 100) return "El nombre debe tener máximo 100 caracteres";
            return null;
        case "lastname":
            if (!value.trim()) return "El apellido es requerido";
            if (value.trim().length < 2) return "El apellido debe tener al menos 2 caracteres";
            if (value.trim().length > 100) return "El apellido debe tener máximo 100 caracteres";
            return null;
        case "email":
            if (!value.trim()) return "El correo electrónico es requerido";
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Debe proporcionar un email válido";
            return null;
        case "password":
            if (!value) return "La contraseña es requerida";
            if (value.length < 6) return "La contraseña debe tener al menos 6 caracteres";
            return null;
        case "repeatpassword":
            if (!value) return "Debe confirmar la contraseña";
            return null;
        case "alias":
            if (value && value.length < 3) return "El alias debe tener al menos 3 caracteres";
            if (value && value.length > 30) return "El alias debe tener máximo 30 caracteres";
            if (value && !/^[a-zA-Z0-9_]+$/.test(value)) return "El alias solo puede contener letras, números y guion bajo";
            return null;
        default:
            return null;
    }
}

function getFieldName(serverField: string): string {
    const map: Record<string, string> = {
        name: "name",
        lastname: "lastname",
        email: "email",
        password: "password",
        alias: "alias",
    };
    return map[serverField] || serverField;
}

function parseServerError(err: unknown): { fieldErrors: FieldErrors; serverError: string | null } {
    if (!err || typeof err !== "object") {
        return { fieldErrors: {}, serverError: "Ocurrió un error inesperado. Intenta de nuevo." };
    }
    const response = (err as { response?: unknown }).response;
    if (!response || typeof response !== "object") {
        return { fieldErrors: {}, serverError: "Ocurrió un error inesperado. Intenta de nuevo." };
    }
    const data = (response as { data?: unknown }).data;
    if (!data || typeof data !== "object") {
        return { fieldErrors: {}, serverError: "Ocurrió un error inesperado. Intenta de nuevo." };
    }
    const d = data as { message?: string; errors?: Array<{ path?: string; msg?: string }> };

    if (d.errors && Array.isArray(d.errors) && d.errors.length > 0) {
        const fieldErrors: FieldErrors = {};
        for (const e of d.errors) {
            if (e.path && e.msg) {
                fieldErrors[getFieldName(e.path)] = e.msg;
            }
        }
        return { fieldErrors, serverError: null };
    }

    if (d.message) {
        return { fieldErrors: {}, serverError: d.message };
    }

    return { fieldErrors: {}, serverError: "Ocurrió un error inesperado. Intenta de nuevo." };
}

export function Register({ className, ...props }: React.ComponentProps<"div">) {
    const { register, isLoading } = useAuth();

    const [form, setForm] = useState({
        name: "",
        lastname: "",
        email: "",
        password: "",
        repeatpassword: "",
        alias: "",
    });

    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
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
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));

        if (name === "password" || name === "repeatpassword") {
            setPasswordError(null);
        }

        if (touched[name]) {
            const error = validateField(name, value);
            setFieldErrors((prev) => {
                const next = { ...prev };
                if (error) {
                    next[name] = error;
                } else {
                    delete next[name];
                }
                return next;
            });
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setTouched((prev) => ({ ...prev, [name]: true }));
        const error = validateField(name, value);
        setFieldErrors((prev) => {
            const next = { ...prev };
            if (error) {
                next[name] = error;
            } else {
                delete next[name];
            }
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const allTouched: Record<string, boolean> = {};
        const newErrors: FieldErrors = {};
        for (const [key, value] of Object.entries(form)) {
            allTouched[key] = true;
            const error = validateField(key, value);
            if (error) newErrors[key] = error;
        }
        setTouched(allTouched);
        setFieldErrors(newErrors);

        if (form.password !== form.repeatpassword) {
            setPasswordError("Las contraseñas no coinciden.");
            return;
        }

        if (Object.keys(newErrors).length > 0) return;

        setPasswordError(null);

        const payload = {
            name: form.name,
            lastname: form.lastname,
            email: form.email,
            password: form.password,
            alias: form.alias || undefined,
        };
        try {
            await register(payload);
        } catch (err: unknown) {
            const parsed = parseServerError(err);
            if (parsed.fieldErrors) {
                setFieldErrors((prev) => ({ ...prev, ...parsed.fieldErrors }));
                const touchedKeys: Record<string, boolean> = {};
                for (const key of Object.keys(parsed.fieldErrors)) {
                    touchedKeys[key] = true;
                }
                setTouched((prev) => ({ ...prev, ...touchedKeys }));
            }
            if (parsed.serverError) {
                setPasswordError(parsed.serverError);
            }
        }
    };

    const displayError = passwordError;

    return (
        <>
            <SEO title="Crear Cuenta" description="Regístrate en Mangalovers y lleva el control de tus lecturas de manga y manhwa. Guarda tus favoritos y sigue tu progreso." noIndex />
            <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="overflow-hidden p-0 border-brand/20 dark:border-brand/10 shadow-[0_0_30px_-10px] shadow-brand/20 dark:shadow-brand/10">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <form className="p-6 md:p-8" onSubmit={handleSubmit} noValidate>
                        <FieldGroup>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-brand to-brand-cyan text-white shadow-sm mb-1">
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
                                        onBlur={handleBlur}
                                        required
                                        aria-invalid={!!fieldErrors.name || undefined}
                                    />
                                    <FieldError>{fieldErrors.name}</FieldError>
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
                                        onBlur={handleBlur}
                                        required
                                        aria-invalid={!!fieldErrors.lastname || undefined}
                                    />
                                    <FieldError>{fieldErrors.lastname}</FieldError>
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
                                    onBlur={handleBlur}
                                    required
                                    aria-invalid={!!fieldErrors.email || undefined}
                                />
                                <FieldError>{fieldErrors.email}</FieldError>
                                <FieldDescription>
                                    Usaremos esta información para contactarte.
                                    No compartiremos tu correo electrónico con
                                    nadie más.
                                </FieldDescription>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="alias">
                                    Alias
                                </FieldLabel>
                                <Input
                                    id="alias"
                                    type="text"
                                    name="alias"
                                    placeholder="tu_alias"
                                    value={form.alias}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    maxLength={30}
                                    aria-invalid={!!fieldErrors.alias || undefined}
                                />
                                <FieldError>{fieldErrors.alias}</FieldError>
                                <FieldDescription>
                                    Cómo te conocerán los demás usuarios. Déjalo vacío para generar uno automáticamente.
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
                                                onBlur={handleBlur}
                                                required
                                                className="pr-9"
                                                aria-invalid={!!fieldErrors.password || undefined}
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
                                        <FieldError>{fieldErrors.password}</FieldError>
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
                                                onBlur={handleBlur}
                                                required
                                                className="pr-9"
                                                aria-invalid={!!fieldErrors.repeatpassword || undefined}
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
                                        <FieldError>{fieldErrors.repeatpassword}</FieldError>
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
                <a href="/terminos">Términos de Servicio</a> y{" "}
                <a href="/privacidad">Política de Privacidad</a>.
            </FieldDescription>
            {displayError && (
                <Alert variant="destructive" className="border-0">
                    <AlertCircleIcon />
                    <AlertTitle>Registro fallido</AlertTitle>
                    <AlertDescription>{displayError}</AlertDescription>
                </Alert>
            )}
        </div>
        </>
    );
}
