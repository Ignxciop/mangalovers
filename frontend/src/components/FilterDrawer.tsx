import { useState, type ReactNode } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";

interface FilterDrawerProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title: string;
    activeFiltersCount?: number;
    onClearAll?: () => void;
    children: ReactNode;
    hideTrigger?: boolean;
}

export function FilterDrawer({
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    title,
    activeFiltersCount = 0,
    onClearAll,
    children,
    hideTrigger = false,
}: FilterDrawerProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const handleOpenChange = (next: boolean) => {
        if (isControlled) {
            controlledOnOpenChange?.(next);
        } else {
            setInternalOpen(next);
        }
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            {hideTrigger ? null : (
                <SheetTrigger asChild>
                    <Button variant="outline" className="shrink-0 relative">
                        <SlidersHorizontal className="mr-2 h-4 w-4" />
                        Filtros
                        {activeFiltersCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                                {activeFiltersCount}
                            </span>
                        )}
                    </Button>
                </SheetTrigger>
            )}
            <SheetContent aria-describedby={undefined} className="flex flex-col gap-0 p-0">
                <SheetHeader className="px-6 py-5 border-b border-border">
                    <SheetTitle className="text-base">{title}</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
                {onClearAll && (
                    <div className="px-6 py-4 border-t border-border">
                        <Button variant="outline" className="w-full" onClick={onClearAll}>
                            Limpiar todos los filtros
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
