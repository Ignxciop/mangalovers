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

export default function Login() {
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
                <form>
                    <div className="flex flex-col gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="email"
                                type="input"
                                placeholder="Name Lastname"
                                required
                            />
                        </div>
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
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <Label htmlFor="password">
                                    Repeat Password
                                </Label>
                            </div>
                            <Input id="password" type="password" required />
                            <Field orientation="horizontal">
                                <Checkbox
                                    id="terms-checkbox-2"
                                    name="terms-checkbox-2"
                                />
                                <FieldContent>
                                    <FieldLabel htmlFor="terms-checkbox-2">
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
                <Button type="submit" className="w-full">
                    Register
                </Button>
            </CardFooter>
        </Card>
    );
}
