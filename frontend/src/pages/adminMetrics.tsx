import { SidebarTrigger } from "@/components/ui/sidebar";
import { BarChart3 } from "lucide-react";

export default function AdminMetrics() {
    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border shadow-[0_1px_0_0] shadow-brand/5">
                <div className="container mx-auto grid grid-cols-[auto_1fr] items-center h-16 px-4 gap-4">
                    <SidebarTrigger />
                    <div className="flex justify-center min-w-0">
                        <div className="flex items-center gap-2 shrink-0">
                            <BarChart3 className="h-4 w-4 text-violet-500" />
                            <span className="text-sm font-semibold text-foreground tracking-wide">
                                Métricas
                            </span>
                        </div>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-8">
                <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                    <div className="flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/20">
                        <BarChart3 className="size-8" />
                    </div>
                    <p className="text-muted-foreground text-sm">Próximamente — métricas y estadísticas.</p>
                </div>
            </main>
        </div>
    );
}
