import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarGroupLabel,
    SidebarGroupContent,
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
    UserRound,
    EllipsisVertical,
    Moon,
    Sun,
    LogOut,
    LogIn,
    House,
    LibraryBig,
    BookHeart,
    Heart,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function AppSidebar() {
    const { logout, user, isAuthenticated } = useAuth();
    const { theme, setTheme } = useTheme();

    return (
        <Sidebar>
            <SidebarHeader className="mb-4 items-center">
                <a href="/" className="flex gap-1 items-center">
                    <BookHeart className="size-5" />
                    <span className="font-semibold text-[20px]">
                        Mangalovers
                    </span>
                </a>
            </SidebarHeader>

            <SidebarContent className="ml-4">
                <SidebarGroup>
                    <SidebarGroupLabel>Navegación</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <a
                                href="/"
                                className="flex gap-1 mb-2 text-l items-center"
                            >
                                <House className="size-4" />
                                Inicio
                            </a>
                            <a
                                href="/mangas"
                                className="flex gap-1 mb-2 text-l items-center"
                            >
                                <LibraryBig className="size-4" />
                                Mangas
                            </a>
                            {isAuthenticated ? (
                                <a
                                    href="/favoritos"
                                    className="flex gap-1 mb-2 text-l items-center"
                                >
                                    <Heart className="size-4" />
                                    Favoritos
                                </a>
                            ) : (
                                <span className="flex gap-1 mb-2 text-l items-center opacity-35 cursor-not-allowed select-none">
                                    <Heart className="size-4" />
                                    Favoritos
                                </span>
                            )}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
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
                                            {isAuthenticated
                                                ? `${user?.name} ${user?.lastname}`
                                                : "Invitado"}
                                        </span>
                                        <span className="text-muted-foreground truncate text-xs">
                                            {isAuthenticated
                                                ? user?.email
                                                : "Sin cuenta"}
                                        </span>
                                    </div>
                                    <EllipsisVertical className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                                side="bottom"
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
                                                {isAuthenticated
                                                    ? user?.name
                                                    : "Invitado"}
                                            </span>
                                            <span className="text-muted-foreground truncate text-xs">
                                                {isAuthenticated
                                                    ? user?.email
                                                    : "Sin cuenta"}
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
                                {isAuthenticated ? (
                                    <DropdownMenuItem onSelect={logout}>
                                        <LogOut />
                                        Cerrar Sesión
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem
                                        onSelect={() =>
                                            (window.location.href = "/acceso")
                                        }
                                    >
                                        <LogIn />
                                        Iniciar Sesión
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
