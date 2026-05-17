import { Outlet } from "react-router-dom";
import { PageTransition } from "@/components/page-transition";

export default function AuthLayout() {
    return (
        <main
            id="main-content"
            className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10"
            style={{
                background: "radial-gradient(ellipse at 20% 50%, oklch(0.62 0.25 350 / 0.08), transparent 50%), radial-gradient(ellipse at 80% 50%, oklch(0.7 0.2 200 / 0.06), transparent 50%), var(--background)",
            }}
        >
            <div className="w-full max-w-sm md:max-w-4xl">
                <PageTransition>
                    <Outlet />
                </PageTransition>
            </div>
        </main>
    );
}
