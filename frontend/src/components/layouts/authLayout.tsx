import { Outlet } from "react-router-dom";
import { PageTransition } from "@/components/page-transition";

export default function AuthLayout() {
    return (
        <main id="main-content" className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-4xl">
                <PageTransition>
                    <Outlet />
                </PageTransition>
            </div>
        </main>
    );
}
