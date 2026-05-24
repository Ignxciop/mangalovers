import { SEO } from "@/components/seo";
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
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchGoogleClientId } from "@/api/auth";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircleIcon, ChevronLeft } from "lucide-react";

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: {
                        client_id: string;
                        callback: (response: {
                            credential: string;
                        }) => void;
                    }) => void;
                    renderButton: (
                        element: HTMLElement,
                        options: Record<string, unknown>,
                    ) => void;
                    prompt: () => void;
                };
            };
        };
    }
}

export function Login({ className, ...props }: React.ComponentProps<"div">) {
    const { login, loginWithGoogle, isLoading, error } = useAuth();
    const googleButtonRef = useRef<HTMLDivElement>(null);
    const [googleLoaded, setGoogleLoaded] = useState(false);
    const [clientId, setClientId] = useState("");
    const loginWithGoogleRef = useRef(loginWithGoogle);

    useEffect(() => {
        loginWithGoogleRef.current = loginWithGoogle;
    }, [loginWithGoogle]);

    useEffect(() => {
        fetchGoogleClientId()
            .then(setClientId)
            .catch(() => setClientId(""));
    }, []);

    useEffect(() => {
        if (document.getElementById("google-gis-script")) {
            return;
        }

        const script = document.createElement("script");
        script.id = "google-gis-script";
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => setGoogleLoaded(true);
        document.body.appendChild(script);

        return () => {
            const el = document.getElementById("google-gis-script");
            if (el) el.remove();
        };
    }, []);

    useEffect(() => {
        if (!googleLoaded || !googleButtonRef.current || !window.google) return;
        if (!clientId) return;

        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
                if (response.credential) {
                    loginWithGoogleRef.current(response.credential);
                }
            },
        });

        window.google.accounts.id.renderButton(googleButtonRef.current, {
            type: "standard",
            shape: "rectangular",
            theme: "outline",
            size: "large",
            text: "signin_with",
            logo_alignment: "center",
        });
    }, [googleLoaded, clientId]);

    const [form, setForm] = useState({
        email: "",
        password: "",
    });

    const hasUnsaved = form.email !== "" || form.password !== "";

    useEffect(() => {
        if (!hasUnsaved) return;
        const handler = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [hasUnsaved]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await login(form);
    };

    return (
        <>
            <SEO title="Iniciar Sesión" description="Accede a tu cuenta de Mangalovers para gestionar tus favoritos y seguir tu progreso de lectura." noIndex />
            <div className={cn("flex flex-col gap-6", className)} {...props}>
            <div className="text-center">
                <a
                    href="/"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Continuar sin cuenta
                </a>
            </div>
            <Card className="overflow-hidden p-0 border-brand/20 dark:border-brand/10 shadow-[0_0_30px_-10px] shadow-brand/20 dark:shadow-brand/10">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <form className="p-6 md:p-8" onSubmit={handleSubmit}>
                        <FieldGroup>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-brand to-brand-cyan text-white shadow-sm mb-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-book-heart"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/><path d="M16 8.2C16 7 15 6 13.8 6c-.8 0-1.4.3-1.8.9-.4-.6-1-.9-1.8-.9C9 6 8 7 8 8.2c0 .6.3 1.2.8 1.7.8.8 3.2 2.8 3.2 2.8s2.4-2 3.2-2.8c.5-.5.8-1.1.8-1.7Z"/></svg>
                                </div>
                                <h1 className="text-2xl font-bold">
                                    Bienvenido de nuevo
                                </h1>
                                <p className="text-muted-foreground text-balance">
                                    Inicia sesión en tu cuenta de Mangalovers
                                </p>
                            </div>
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
                            </Field>
                            <Field>
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password">
                                        Contraseña
                                    </FieldLabel>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    name="password"
                                    autoComplete="current-password"
                                    placeholder="••••••"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                />
                            </Field>
                            <Field>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading
                                        ? "Iniciando sesión…"
                                        : "Iniciar Sesión"}
                                </Button>
                            </Field>
                            {clientId && (
                                <>
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-card px-2 text-muted-foreground">
                                                o
                                            </span>
                                        </div>
                                    </div>
                                    <Field>
                                        <div
                                            ref={googleButtonRef}
                                            className="flex justify-center"
                                        />
                                    </Field>
                                </>
                            )}
                            <FieldDescription className="text-center">
                                ¿No tienes una cuenta?{" "}
                                <a href="/registro">Registrate</a>
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
            {error && (
                <Alert variant="destructive" className="border-0">
                    <AlertCircleIcon />
                    <AlertTitle>Login failed</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
        </div>
        </>
    );
}
