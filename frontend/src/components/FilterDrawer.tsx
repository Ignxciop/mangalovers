import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";

interface FilterDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    activeFiltersCount?: number;
    onClearAll?: () => void;
    children: React.ReactNode;
}

export function FilterDrawer({ open, onOpenChange, title, activeFiltersCount, onClearAll, children }: FilterDrawerProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
                <Button variant="outline" className="shrink-0 relative">
                    <SlidersHorizontal className="mr-2 size-4" />
                    Filtros
                    {activeFiltersCount ? (
                        <span className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                            {activeFiltersCount}
                        </span>
                    ) : null}
                </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col gap-0 p-0">
                <SheetHeader className="px-6 py-5 border-b border-border">
                    <SheetTitle className="text-base">{title}</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
                {onClearAll && activeFiltersCount ? (
                    <div className="px-6 py-4 border-t border-border">
                        <Button variant="outline" className="w-full" onClick={onClearAll}>
                            Limpiar todos los filtros
                        </Button>
                    </div>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}
