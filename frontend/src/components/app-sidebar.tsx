import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import {
    Dumbbell,
    UserRound,
    EllipsisVertical,
    Moon,
    Sun,
    LogOut,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function AppSidebar() {
    const { logout, user } = useAuth();
    const { theme, setTheme } = useTheme();

    return (
        <Sidebar>
            <SidebarHeader className="mb-4 items-center">
                <a href="#" className="flex gap-1 items-center">
                    <Dumbbell className="size-5" />
                    <span className="font-semibold text-[20px]">Gymlovers</span>
                </a>
            </SidebarHeader>
            <SidebarContent className="ml-4">
                <div>Navegación</div>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:cursor-pointer"
                                >
                                    <Avatar className="h-8 w-8 rounded-lg grayscale">
                                        <AvatarFallback className="rounded-lg">
                                            <UserRound className="h-4 w-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-medium">
                                            {user?.name} {user?.lastname}
                                        </span>
                                        <span className="text-muted-foreground truncate text-xs">
                                            {user?.email}
                                        </span>
                                    </div>
                                    <EllipsisVertical className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                                side={"bottom"}
                                align="end"
                                sideOffset={4}
                            >
                                <DropdownMenuLabel className="p-0 font-normal">
                                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                        <Avatar className="h-8 w-8 rounded-lg grayscale">
                                            <AvatarFallback className="rounded-lg">
                                                <UserRound className="h-4 w-4" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-medium">
                                                {user?.name}
                                            </span>
                                            <span className="text-muted-foreground truncate text-xs">
                                                {user?.email}
                                            </span>
                                        </div>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem
                                        onSelect={() =>
                                            setTheme(
                                                theme === "dark"
                                                    ? "light"
                                                    : "dark",
                                            )
                                        }
                                    >
                                        {theme === "light" ? (
                                            <Moon className="h-4 w-4" />
                                        ) : (
                                            <Sun className="h-4 w-4" />
                                        )}
                                        {theme === "light"
                                            ? "Modo Oscuro"
                                            : "Modo Claro"}
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={logout}>
                                    <LogOut />
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
