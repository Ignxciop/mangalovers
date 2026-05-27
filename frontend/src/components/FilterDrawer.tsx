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
    activeCount: number;
    title: string;
    onClear?: () => void;
    admin?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: ReactNode;
}

export function FilterDrawer({
    activeCount,
    title,
    onClear,
    admin = false,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    children,
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

    const hasActive = activeCount > 0;

    if (admin) {
        return (
            <Sheet open={open} onOpenChange={handleOpenChange}>
                <SheetTrigger asChild>
                    <button
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted relative"
                        aria-label="Filtrar"
                    >
                        <SlidersHorizontal className="size-3.5" />
                        {hasActive && (
                            <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-primary text-primary-foreground text-[6px] flex items-center justify-center font-bold">
                                {activeCount}
                            </span>
                        )}
                    </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                    <SheetHeader className="pb-3">
                        <SheetTitle className="text-xs font-medium">{title}</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-4">
                        {children}
                    </div>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" className="shrink-0 relative">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Filtros
                    {hasActive && (
                        <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                            {activeCount}
                        </span>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col gap-0 p-0">
                <SheetHeader className="px-6 py-5 border-b border-border">
                    <SheetTitle className="text-base">{title}</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
                {onClear && (
                    <div className="px-6 py-4 border-t border-border">
                        <Button variant="outline" className="w-full" onClick={onClear}>
                            Limpiar todos los filtros
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
