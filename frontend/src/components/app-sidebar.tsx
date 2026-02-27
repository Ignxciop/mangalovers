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
    useSidebar,
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
    ChevronRight,
    Settings,
    BarChart3,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

function NavItem({
    href,
    icon: Icon,
    label,
    disabled = false,
}: {
    href: string;
    icon: React.ElementType;
    label: string;
    disabled?: boolean;
}) {
    const { state } = useSidebar();
    const collapsed = state === "collapsed";
    const location = useLocation();
    const isActive = location.pathname === href;

    if (disabled) {
        return (
            <div
                className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg opacity-30 cursor-not-allowed select-none transition-all",
                    collapsed && "justify-center px-2",
                )}
                title={collapsed ? label : undefined}
            >
                <Icon className="size-4 shrink-0" />
                {!collapsed && (
                    <span className="text-sm font-medium">{label}</span>
                )}
            </div>
        );
    }

    return (
        <a
            href={href}
            className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative",
                isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                collapsed && "justify-center px-2",
            )}
            title={collapsed ? label : undefined}
        >
            <Icon
                className={cn(
                    "size-4 shrink-0 transition-transform group-hover:scale-110",
                    isActive && "text-primary-foreground",
                )}
            />
            {!collapsed && <span>{label}</span>}
            {!collapsed && isActive && (
                <ChevronRight className="ml-auto size-3 opacity-60" />
            )}
        </a>
    );
}

export function AppSidebar() {
    const { logout, user, isAuthenticated } = useAuth();
    const { theme, setTheme } = useTheme();
    const { state } = useSidebar();
    const collapsed = state === "collapsed";

    return (
        <Sidebar collapsible="icon">
            {/* Header */}
            <SidebarHeader
                className={cn("py-5", collapsed ? "items-center px-2" : "px-4")}
            >
                <a
                    href="/"
                    className={cn(
                        "flex items-center gap-2.5 transition-all",
                        collapsed && "justify-center",
                    )}
                >
                    <div className="flex items-center justify-center size-8 rounded-lg bg-primary text-primary-foreground shrink-0">
                        <BookHeart className="size-4" />
                    </div>
                    {!collapsed && (
                        <span className="font-bold text-[17px] tracking-tight">
                            Mangalovers
                        </span>
                    )}
                </a>
            </SidebarHeader>

            {/* Nav */}
            <SidebarContent className={cn("px-2", collapsed && "px-1")}>
                <SidebarGroup>
                    {!collapsed && (
                        <SidebarGroupLabel className="px-3 mb-1 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
                            Navegación
                        </SidebarGroupLabel>
                    )}
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-0.5">
                            <SidebarMenuItem>
                                <NavItem href="/" icon={House} label="Inicio" />
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <NavItem
                                    href="/mangas"
                                    icon={LibraryBig}
                                    label="Catálogo"
                                />
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <NavItem
                                    href="/favoritos"
                                    icon={Heart}
                                    label="Favoritos"
                                    disabled={!isAuthenticated}
                                />
                                <NavItem
                                    href="/estadisticas"
                                    icon={BarChart3}
                                    label="Estadísticas"
                                    disabled={!isAuthenticated}
                                />
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            {/* Footer — usuario */}
            <SidebarFooter className={cn("pb-4", collapsed ? "px-1" : "px-2")}>
                {/* Separador sutil */}
                <div className="mb-3 h-px bg-border mx-1" />

                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className={cn(
                                        "rounded-xl border border-border bg-muted/50 hover:bg-muted transition-all duration-150 data-[state=open]:bg-muted data-[state=open]:border-primary/30",
                                        collapsed && "justify-center px-2",
                                    )}
                                >
                                    {/* Avatar con indicador de estado */}
                                    <div className="relative shrink-0">
                                        <Avatar className="h-8 w-8 rounded-lg">
                                            <AvatarFallback
                                                className={cn(
                                                    "rounded-lg text-xs font-bold",
                                                    isAuthenticated
                                                        ? "bg-primary/10 text-primary"
                                                        : "bg-muted-foreground/10 text-muted-foreground",
                                                )}
                                            >
                                                {isAuthenticated &&
                                                user?.name ? (
                                                    user.name[0].toUpperCase()
                                                ) : (
                                                    <UserRound className="h-4 w-4" />
                                                )}
                                            </AvatarFallback>
                                        </Avatar>
                                        {/* Dot de estado */}
                                        <span
                                            className={cn(
                                                "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background",
                                                isAuthenticated
                                                    ? "bg-emerald-500"
                                                    : "bg-muted-foreground/40",
                                            )}
                                        />
                                    </div>

                                    {!collapsed && (
                                        <>
                                            <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                                                <span className="truncate font-semibold text-[13px]">
                                                    {isAuthenticated
                                                        ? `${user?.name} ${user?.lastname}`
                                                        : "Invitado"}
                                                </span>
                                                <span className="text-muted-foreground truncate text-[11px]">
                                                    {isAuthenticated
                                                        ? user?.email
                                                        : "Sin cuenta"}
                                                </span>
                                            </div>
                                            <EllipsisVertical className="ml-auto size-4 text-muted-foreground shrink-0" />
                                        </>
                                    )}
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                className="w-60 rounded-xl shadow-lg border border-border"
                                side="top"
                                align="end"
                                sideOffset={8}
                            >
                                {/* Info usuario en dropdown */}
                                <DropdownMenuLabel className="p-0 font-normal">
                                    <div
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-3 rounded-t-xl",
                                            isAuthenticated
                                                ? "bg-primary/5"
                                                : "bg-muted/50",
                                        )}
                                    >
                                        <div className="relative shrink-0">
                                            <Avatar className="h-10 w-10 rounded-xl">
                                                <AvatarFallback
                                                    className={cn(
                                                        "rounded-xl text-sm font-bold",
                                                        isAuthenticated
                                                            ? "bg-primary/10 text-primary"
                                                            : "bg-muted-foreground/10 text-muted-foreground",
                                                    )}
                                                >
                                                    {isAuthenticated &&
                                                    user?.name ? (
                                                        user.name[0].toUpperCase()
                                                    ) : (
                                                        <UserRound className="h-5 w-5" />
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span
                                                className={cn(
                                                    "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background",
                                                    isAuthenticated
                                                        ? "bg-emerald-500"
                                                        : "bg-muted-foreground/40",
                                                )}
                                            />
                                        </div>
                                        <div className="grid flex-1 text-left leading-tight min-w-0">
                                            <span className="truncate font-semibold text-sm">
                                                {isAuthenticated
                                                    ? `${user?.name} ${user?.lastname}`
                                                    : "Invitado"}
                                            </span>
                                            <span className="text-muted-foreground truncate text-xs">
                                                {isAuthenticated
                                                    ? user?.email
                                                    : "Navegando sin cuenta"}
                                            </span>
                                        </div>
                                    </div>
                                </DropdownMenuLabel>

                                <DropdownMenuSeparator />

                                <DropdownMenuGroup className="p-1">
                                    <DropdownMenuItem
                                        onSelect={() =>
                                            setTheme(
                                                theme === "dark"
                                                    ? "light"
                                                    : "dark",
                                            )
                                        }
                                        className="rounded-lg cursor-pointer gap-2.5"
                                    >
                                        {theme === "light" ? (
                                            <Moon className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <Sun className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        <span>
                                            {theme === "light"
                                                ? "Modo Oscuro"
                                                : "Modo Claro"}
                                        </span>
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <div className="p-1">
                                    {isAuthenticated ? (
                                        <>
                                            <DropdownMenuItem
                                                onSelect={() =>
                                                    (window.location.href =
                                                        "/perfil")
                                                }
                                                className="rounded-lg cursor-pointer gap-2.5"
                                            >
                                                <Settings className="h-4 w-4 text-muted-foreground" />
                                                <span>Mi perfil</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onSelect={logout}
                                                className="rounded-lg cursor-pointer gap-2.5 text-rose-500 focus:text-rose-500 focus:bg-rose-500/10"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                <span>Cerrar Sesión</span>
                                            </DropdownMenuItem>
                                        </>
                                    ) : (
                                        <DropdownMenuItem
                                            onSelect={() =>
                                                (window.location.href =
                                                    "/acceso")
                                            }
                                            className="rounded-lg cursor-pointer gap-2.5 text-primary focus:text-primary focus:bg-primary/10"
                                        >
                                            <LogIn className="h-4 w-4" />
                                            <span>Iniciar Sesión</span>
                                        </DropdownMenuItem>
                                    )}
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
