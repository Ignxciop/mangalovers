import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function MainLayout() {
    return (
        <SidebarProvider>
            <AppSidebar />
            <div className="flex-auto bg-gradient-to-br from-grey-100 to-grey-300 dark:from-gray-900 dark:to-gray-800">
                <SidebarTrigger />
                <Outlet />
            </div>
        </SidebarProvider>
    );
}
