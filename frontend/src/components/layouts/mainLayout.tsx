import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function MainLayout() {
    return (
        <SidebarProvider>
            <AppSidebar />
            <div className="items-center w-full">
                <Outlet />
            </div>
        </SidebarProvider>
    );
}
