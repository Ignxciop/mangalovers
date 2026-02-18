import { Button } from "@/components/ui/button";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldLabel,
} from "@/components/ui/field";
import { ModeToggle } from "../components/mode-toggle.tsx";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";

export default function Register() {
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
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

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
            setPasswordError("Las contraseñas no coinciden");
            return;
        }

        const { ...payload } = form;
        await register(payload);
    };

    const displayError = passwordError || error;

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <ModeToggle></ModeToggle>
                <CardTitle>Register to your account</CardTitle>
                <CardDescription>
                    Enter your email below to register to your account
                </CardDescription>
                <CardAction>
                    <Link to="/login">
                        <Button variant="link">Sign In</Button>
                    </Link>
                </CardAction>
            </CardHeader>
            <CardContent>
                <form id="register-form" onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                type="text"
                                name="name"
                                placeholder="Name"
                                value={form.name}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="lastname">Lastname</Label>
                            <Input
                                id="name"
                                type="text"
                                name="lastname"
                                placeholder="Lastname"
                                value={form.lastname}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                placeholder="your@email.com"
                                value={form.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="password">Password</Label>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="repeatpassword">
                                    Repeat Password
                                </Label>
                            </div>
                            <Input
                                id="repeatpassword"
                                type="password"
                                name="repeatpassword"
                                placeholder="••••••••"
                                value={form.repeatpassword}
                                onChange={handleChange}
                                required
                            />
                            <Field orientation="horizontal">
                                <Checkbox
                                    id="terms-checkbox-1"
                                    name="terms-checkbox-1"
                                    required
                                />
                                <FieldContent>
                                    <FieldLabel htmlFor="terms-checkbox-1">
                                        Accept terms and conditions
                                    </FieldLabel>
                                    <FieldDescription>
                                        By clicking this checkbox, you agree to
                                        the terms.
                                    </FieldDescription>
                                </FieldContent>
                            </Field>
                        </div>
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                <Button
                    type="submit"
                    form="register-form"
                    className="w-full"
                    disabled={isLoading}
                >
                    {isLoading ? "Creating account..." : "Register"}
                </Button>
            </CardFooter>
            {displayError && (
                <Alert variant="destructive" className="border-0">
                    <AlertCircleIcon />
                    <AlertTitle>Register failed</AlertTitle>
                    <AlertDescription>{displayError}</AlertDescription>
                </Alert>
            )}
        </Card>
    );
}
