import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function MainLayout() {
    return (
        <SidebarProvider>
            <AppSidebar />
            <div className="flex-auto">
                <SidebarTrigger />
                <Outlet />
            </div>
        </SidebarProvider>
    );
}
