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
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";

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
            <Card className="overflow-hidden p-0">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <form className="p-6 md:p-8" onSubmit={handleSubmit}>
                        <FieldGroup>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <h1 className="text-2xl font-bold">
                                    Crea tu cuenta
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
                                        <Input
                                            id="password"
                                            type="password"
                                            name="password"
                                            placeholder="••••••"
                                            value={form.password}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="confirm-password">
                                            Confirmar Contraseña
                                        </FieldLabel>
                                        <Input
                                            id="confirm-password"
                                            type="password"
                                            name="repeatpassword"
                                            placeholder="••••••"
                                            value={form.repeatpassword}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Field>
                                </Field>
                                <FieldDescription>
                                    Debe tener al menos 6 caracteres.
                                </FieldDescription>
                            </Field>
                            <Field>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading
                                        ? "Creando cuenta..."
                                        : "Crear Cuenta"}
                                </Button>
                            </Field>
                            <FieldDescription className="text-center">
                                ¿Ya tienes una cuenta?{" "}
                                <a href="/login">Inicia sesión</a>
                            </FieldDescription>
                        </FieldGroup>
                    </form>
                    <div className="bg-muted relative hidden md:block">
                        <img
                            src="/public/auth-form-anime.png"
                            alt="Image"
                            className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
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
