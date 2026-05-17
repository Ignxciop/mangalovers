import { useState } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

function getSidebarInitialState(): boolean {
    if (typeof document === "undefined") return true;
    const match = document.cookie.match(/(^| )sidebar_state=([^;]+)/);
    return match ? match[2] === "true" : true;
}

export default function MainLayout() {
    const [defaultOpen] = useState(getSidebarInitialState);

    return (
        <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar />
            <div
                id="main-content"
                className="items-center w-full"
                style={{ padding: "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)" }}
            >
                <Outlet />
            </div>
        </SidebarProvider>
    );
}
