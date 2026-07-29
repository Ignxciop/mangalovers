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
import {
    LayoutDashboard,
    Users,
    MessageSquare,
    BarChart3,
    ScrollText,
    Shield,
    ChevronRight,
    UserRound,
    EllipsisVertical,
    Moon,
    Sun,
    LogOut,
    Megaphone,
    BookOpen,
    Wrench,
    Flag,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { getPendingReportCount } from "@/api/admin";
import { getAllSuggestions } from "@/api/suggestions";

function NavItem({
    href,
    icon: Icon,
    label,
}: {
    href: string;
    icon: React.ElementType;
    label: string;
}) {
    const { state, isMobile, setOpenMobile } = useSidebar();
    const collapsed = !isMobile && state === "collapsed";
    const location = useLocation();
    const isActive = location.pathname === href;

    const handleClick = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    return (
        <Link
            to={href}
            onClick={handleClick}
            className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative",
                isActive
                    ? "bg-gradient-to-r from-amber-500/90 to-amber-500 text-white shadow-sm shadow-amber-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                collapsed && "justify-center px-2",
            )}
            title={collapsed ? label : undefined}
        >
            {!collapsed && isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-white/70" />
            )}
            <Icon className={cn(
                "size-4 shrink-0 transition-all duration-200 group-hover:scale-110",
                isActive && "text-white",
            )} />
            {!collapsed && <span>{label}</span>}
            {!collapsed && isActive && (
                <ChevronRight className="ml-auto size-3 opacity-60" />
            )}
        </Link>
    );
}

function AdminUserCard({ collapsed }: { collapsed: boolean }) {
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const user = useAuthStore((s) => s.user);
    const storeLogout = useAuthStore((s) => s.logout);
    const { theme, setTheme } = useTheme();
    const { setOpenMobile } = useSidebar();

    const handleNavigateToUser = () => {
        setOpenMobile(false);
        setTimeout(() => navigate("/"), 350);
    };

    const handleLogout = async () => {
        try {
            await api.post("/auth/logout");
        } catch {
            // Silenciar error del lado del servidor
        }
        storeLogout();
        window.location.href = "/";
    };

    return (
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
                                {isAuthenticated && user?.name ? (
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
                                        : "Sin cuenta"}
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
                                    {isAuthenticated && user?.name ? (
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
                    <DropdownMenuItem
                        onSelect={handleNavigateToUser}
                        className="rounded-lg cursor-pointer gap-2.5"
                    >
                        <UserRound className="h-4 w-4 text-muted-foreground" />
                        <span>Usuario</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onSelect={handleLogout}
                        className="rounded-lg cursor-pointer gap-2.5 text-rose-500 focus:text-rose-500 focus:bg-rose-500/10"
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Cerrar Sesión</span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function ReportsNavItem() {
    const { state, isMobile, setOpenMobile } = useSidebar();
    const collapsed = !isMobile && state === "collapsed";
    const location = useLocation();
    const isActive = location.pathname === "/admin/reportes";
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        getPendingReportCount()
            .then((res) => setPendingCount(res.count))
            .catch(() => {});
    }, []);

    const handleClick = () => {
        if (isMobile) setOpenMobile(false);
    };

    return (
        <Link
            to="/admin/reportes"
            onClick={handleClick}
            className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative",
                isActive
                    ? "bg-gradient-to-r from-amber-500/90 to-amber-500 text-white shadow-sm shadow-amber-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                collapsed && "justify-center px-2",
            )}
            title={collapsed ? "Reportes" : undefined}
        >
            {!collapsed && isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-white/70" />
            )}
            <Flag className={cn(
                "size-4 shrink-0 transition-all duration-200 group-hover:scale-110",
                isActive && "text-white",
            )} />
            {!collapsed && <span>Reportes</span>}
            {!collapsed && pendingCount > 0 && (
                <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold leading-none">
                    {pendingCount}
                </span>
            )}
            {!collapsed && isActive && (
                <ChevronRight className="ml-auto size-3 opacity-60" />
            )}
        </Link>
    );
}

function SuggestionsNavItem() {
    const { state, isMobile, setOpenMobile } = useSidebar();
    const collapsed = !isMobile && state === "collapsed";
    const location = useLocation();
    const isActive = location.pathname === "/admin/sugerencias";
    const [openCount, setOpenCount] = useState(0);

    useEffect(() => {
        getAllSuggestions({ limit: 1 })
            .then((res) => setOpenCount(res.meta.counts?.OPEN ?? 0))
            .catch(() => {});
    }, []);

    const handleClick = () => {
        if (isMobile) setOpenMobile(false);
    };

    return (
        <Link
            to="/admin/sugerencias"
            onClick={handleClick}
            className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative",
                isActive
                    ? "bg-gradient-to-r from-amber-500/90 to-amber-500 text-white shadow-sm shadow-amber-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                collapsed && "justify-center px-2",
            )}
            title={collapsed ? "Sugerencias" : undefined}
        >
            {!collapsed && isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-white/70" />
            )}
            <MessageSquare className={cn(
                "size-4 shrink-0 transition-all duration-200 group-hover:scale-110",
                isActive && "text-white",
            )} />
            {!collapsed && <span>Sugerencias</span>}
            {!collapsed && openCount > 0 && (
                <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold leading-none">
                    {openCount}
                </span>
            )}
            {!collapsed && isActive && (
                <ChevronRight className="ml-auto size-3 opacity-60" />
            )}
        </Link>
    );
}

export function AdminSidebar() {
    const { state, isMobile } = useSidebar();
    const collapsed = !isMobile && state === "collapsed";

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader
                className={cn("py-5", collapsed ? "items-center px-2" : "px-4")}
            >
                <Link
                    to="/admin/dashboard"
                    className={cn(
                        "flex items-center gap-2.5 transition-[gap,opacity]",
                        collapsed && "justify-center",
                    )}
                >
                    <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white shrink-0 shadow-sm">
                        <Shield className="size-4" />
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col">
                            <span className="font-extrabold text-[16px] tracking-tight leading-tight">
                                Mangalovers
                            </span>
                            <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest leading-tight">
                                Admin
                            </span>
                        </div>
                    )}
                </Link>
            </SidebarHeader>

            <SidebarContent className={cn("px-2", collapsed && "px-1")}>
                <SidebarGroup>
                    {!collapsed && (
                        <SidebarGroupLabel className="px-3 mb-1 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
                            Panel de control
                        </SidebarGroupLabel>
                    )}
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-0.5">
                            <SidebarMenuItem>
                                <NavItem
                                    href="/admin/dashboard"
                                    icon={LayoutDashboard}
                                    label="Dashboard"
                                />
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <NavItem
                                    href="/admin/usuarios"
                                    icon={Users}
                                    label="Usuarios"
                                />
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SuggestionsNavItem />
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <ReportsNavItem />
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <NavItem
                                    href="/admin/logs"
                                    icon={ScrollText}
                                    label="Actividad"
                                />
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <NavItem
                                    href="/admin/metricas"
                                    icon={BarChart3}
                                    label="Métricas"
                                />
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <NavItem
                                    href="/admin/series"
                                    icon={BookOpen}
                                    label="Series"
                                />
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <NavItem
                                    href="/admin/anuncios"
                                    icon={Megaphone}
                                    label="Anuncios"
                                />
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <NavItem
                                    href="/admin/herramientas"
                                    icon={Wrench}
                                    label="Herramientas"
                                />
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className={cn("pb-4", collapsed ? "px-1" : "px-2")}>
                <div className="mb-3 h-px bg-border mx-1" />
                <SidebarMenu>
                    <SidebarMenuItem>
                        <AdminUserCard collapsed={collapsed} />
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
