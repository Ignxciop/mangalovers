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

export default function Login() {
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
                <form>
                    <div className="flex flex-col gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="your@email.com"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="password">Password</Label>
                            </div>
                            <Input id="password" type="password" required />
                            <Field orientation="horizontal">
                                <Checkbox
                                    id="terms-checkbox"
                                    name="terms-checkbox"
                                />
                                <Label htmlFor="terms-checkbox">
                                    Remember me
                                </Label>
                            </Field>
                        </div>
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                <Button type="submit" className="w-full">
                    Login
                </Button>
            </CardFooter>
        </Card>
    );
}
