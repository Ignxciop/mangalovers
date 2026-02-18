import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
    const { logout, user } = useAuth();

    return (
        <div>
            <p>Bienvenido, {user?.name ?? "..."}</p>
            <Button onClick={logout} variant="outline">
                Logout
            </Button>
        </div>
    );
}
