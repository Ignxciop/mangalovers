import { api } from "@/api/axios";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useAuthStore } from "@/store/authStore";
import { SuggestionForm } from "@/components/suggestion-form";
import { memo, useState, useEffect } from "react";
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
    Users,
    MessageCirclePlus,
    Shield,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getReceivedRequestsCount } from "@/api/friends";
import { SidebarMenuBadge } from "@/components/ui/sidebar";

function NavItem({
    href,
    icon: Icon,
    label,
    badge,
    disabled = false,
}: {
    href: string;
    icon: React.ElementType;
    label: string;
    badge?: number;
    disabled?: boolean;
}) {
    const { state, isMobile } = useSidebar();
    const collapsed = !isMobile && state === "collapsed";
    const location = useLocation();
    const isActive = location.pathname === href;

    if (disabled) {
        return (
            <span
                className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg opacity-30 cursor-not-allowed select-none transition-[opacity,background-color]",
                    collapsed && "justify-center px-2",
                )}
                title={collapsed ? label : undefined}
                aria-disabled="true"
            >
                <Icon className="size-4 shrink-0 transition-transform group-hover:scale-110" aria-hidden="true" />
                {!collapsed && (
                    <span className="text-sm font-medium">{label}</span>
                )}
            </span>
        );
    }

    return (
        <Link
            to={href}
            className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative",
                isActive
                    ? "bg-gradient-to-r from-primary/90 to-primary text-primary-foreground shadow-sm shadow-brand/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                collapsed && "justify-center px-2",
            )}
            title={collapsed ? label : undefined}
        >
            {!collapsed && isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary-foreground/70" />
            )}
            <Icon
                className={cn(
                    "size-4 shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:rotate-[8deg]",
                    isActive && "text-primary-foreground",
                )}
            />
            {!collapsed && <span>{label}</span>}
            {!collapsed && badge != null && badge > 0 && (
                <SidebarMenuBadge className="relative right-auto bg-gradient-to-r from-brand/90 to-brand-cyan/90 text-white text-[10px] font-extrabold leading-none min-w-[20px] h-[18px] px-1.5 flex items-center justify-center rounded-full shadow-sm shadow-brand/20 ring-1 ring-white/10 animate-in fade-in zoom-in duration-200">
                    {badge > 99 ? "99+" : badge}
                </SidebarMenuBadge>
            )}
            {!collapsed && isActive && (
                <ChevronRight className="ml-auto size-3 opacity-60" />
            )}
        </Link>
    );
}

const SidebarUserSection = memo(function SidebarUserSection({
    collapsed,
    onOpenSuggestions,
}: {
    collapsed: boolean;
    onOpenSuggestions: () => void;
}) {
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const user = useAuthStore((s) => s.user);
    const storeLogout = useAuthStore((s) => s.logout);
    const { theme, setTheme } = useTheme();
    const handleLogout = async () => {
        try {
            await api.post("/auth/logout");
        } catch {
            // Silenciar error del lado del servidor
        }
        storeLogout();
        navigate("/");
    };

    return (
        <SidebarFooter className={cn("pb-4", collapsed ? "px-1" : "px-2")}>
            <div className="mb-3 h-px bg-border mx-1" />

            <SidebarMenu>
                <SidebarMenuItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton
                                size="lg"
                                className={cn(
                                    "rounded-xl border border-border bg-muted/50 hover:bg-muted transition-[background-color,border-color] duration-150 data-[state=open]:bg-muted data-[state=open]:border-primary/30",
                                    collapsed && "justify-center px-2",
                                )}
                            >
                                <div className="relative shrink-0">
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        {user?.avatarUrl && (
                                            <AvatarImage
                                                src={`${import.meta.env.VITE_API_URL?.replace("/api", "") ?? ""}/uploads/avatars/${user.avatarUrl}`}
                                                alt={user.name ?? ""}
                                                className="rounded-lg object-cover"
                                            />
                                        )}
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
                                            <span className="text-muted-foreground truncate text-xs">
                                                {isAuthenticated
                                                    ? user?.email
                                                    : ""}
                                            </span>
                                            {isAuthenticated && user?.alias && (
                                                <span className="text-muted-foreground/60 truncate text-xs">
                                                    @{user.alias}
                                                </span>
                                            )}
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
                                            {user?.avatarUrl && (
                                                <AvatarImage
                                                    src={`${import.meta.env.VITE_API_URL?.replace("/api", "") ?? ""}/uploads/avatars/${user.avatarUrl}`}
                                                    alt={user.name ?? ""}
                                                    className="rounded-xl object-cover"
                                                />
                                            )}
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
                                        {isAuthenticated && user?.alias && (
                                            <span className="text-muted-foreground/60 truncate text-xs">
                                                @{user.alias}
                                            </span>
                                        )}
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
                                            ? "Modo oscuro"
                                            : "Modo claro"}
                                    </span>
                                </DropdownMenuItem>
                                {isAuthenticated ? (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onSelect={() =>
                                                navigate("/perfil")
                                            }
                                            className="rounded-lg cursor-pointer gap-2.5"
                                        >
                                            <Settings className="h-4 w-4 text-muted-foreground" />
                                            <span>Mi perfil</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onSelect={onOpenSuggestions}
                                            className="rounded-lg cursor-pointer gap-2.5"
                                        >
                                            <MessageCirclePlus className="h-4 w-4 text-muted-foreground" />
                                            <span>Enviar sugerencia</span>
                                        </DropdownMenuItem>
                                        {user?.role === "ADMIN" && (
                                            <DropdownMenuItem
                                                onSelect={() =>
                                                    navigate("/admin/dashboard")
                                                }
                                                className="rounded-lg cursor-pointer gap-2.5"
                                            >
                                                <Shield className="h-4 w-4 text-muted-foreground" />
                                                <span>Admin</span>
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onSelect={handleLogout}
                                            className="rounded-lg cursor-pointer gap-2.5 text-rose-500 focus:text-rose-500 focus:bg-rose-500/10"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            <span>Cerrar Sesión</span>
                                        </DropdownMenuItem>
                                    </>
                                ) : (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onSelect={() =>
                                                navigate("/acceso")
                                            }
                                            className="rounded-lg cursor-pointer gap-2.5 text-primary focus:text-primary focus:bg-primary/10"
                                        >
                                            <LogIn className="h-4 w-4" />
                                            <span>Iniciar Sesión</span>
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
    );
});

export function AppSidebar() {
    const { isAuthenticated } = useAuth();
    const { state, isMobile } = useSidebar();
    const collapsed = !isMobile && state === "collapsed";
    const [showSuggestionForm, setShowSuggestionForm] = useState(false);
    const [pendingFriendCount, setPendingFriendCount] = useState(0);

    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchCount = async () => {
            try {
                const count = await getReceivedRequestsCount();
                setPendingFriendCount(count);
            } catch {
                // Silenciar error
            }
        };

        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    return (
        <>
        <SuggestionForm
            open={showSuggestionForm}
            onClose={() => setShowSuggestionForm(false)}
        />
        <Sidebar collapsible="icon">
            <SidebarHeader
                className={cn("py-5", collapsed ? "items-center px-2" : "px-4")}
            >
                <Link
                    to="/"
                    className={cn(
                        "flex items-center gap-2.5 transition-[gap,opacity]",
                        collapsed && "justify-center",
                    )}
                >
                    <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-brand to-brand-cyan text-white shrink-0 shadow-sm animate-[logo-glow_3s_ease-in-out_infinite]">
                        <BookHeart className="size-4" />
                    </div>
                    {!collapsed && (
                        <span className="font-extrabold text-[18px] tracking-tight">
                            Mangalovers
                        </span>
                    )}
                </Link>
            </SidebarHeader>

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
                                    href="/amigos"
                                    icon={Users}
                                    label="Amigos"
                                    disabled={!isAuthenticated}
                                    badge={pendingFriendCount}
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

            <SidebarUserSection
                collapsed={collapsed}
                onOpenSuggestions={() => setShowSuggestionForm(true)}
            />
        </Sidebar>
        </>
    );
}
