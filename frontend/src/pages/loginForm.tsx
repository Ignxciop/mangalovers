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
import { Field } from "@/components/ui/field";
import { ModeToggle } from "../components/mode-toggle.tsx";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";

export default function Login() {
    const { login, isLoading, error } = useAuth();

    const [form, setForm] = useState({
        email: "",
        password: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await login(form);
    };

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <ModeToggle></ModeToggle>
                <CardTitle>Login to your account</CardTitle>
                <CardDescription>
                    Enter your email below to login to your account
                </CardDescription>
                <CardAction>
                    <Link to="/register">
                        <Button variant="link">Sign Up</Button>
                    </Link>
                </CardAction>
            </CardHeader>
            <CardContent>
                <form id="login-form" onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-6">
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
                            <Field orientation="horizontal">
                                <Checkbox
                                    id="rememberme-checkbox"
                                    name="rememberme-checkbox"
                                />
                                <Label htmlFor="rememberme-checkbox">
                                    Remember me
                                </Label>
                            </Field>
                        </div>
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                <Button
                    type="submit"
                    form="login-form"
                    className="w-full"
                    disabled={isLoading}
                >
                    {isLoading ? "Logging in..." : "Login"}
                </Button>
            </CardFooter>
            {error && (
                <Alert variant="destructive" className="border-0">
                    <AlertCircleIcon />
                    <AlertTitle>Login failed</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
        </Card>
    );
}
