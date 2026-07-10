import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function DebouncedSearchInput({ placeholder = "Buscar", className = "pl-9 w-full bg-secondary/50" }: { placeholder?: string; className?: string }) {
    const [sp, setSp] = useSearchParams();
    const [local, setLocal] = useState(() => sp.get("search") ?? "");

    useEffect(() => {
        const timer = setTimeout(() => {
            setSp((prev) => {
                const currentSearch = prev.get("search") ?? "";
                if (local === currentSearch) return prev;
                if (local) prev.set("search", local);
                else prev.delete("search");
                prev.set("page", "1");
                return prev;
            });
        }, 300);
        return () => clearTimeout(timer);
    }, [local, setSp]);

    return (
        <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
                placeholder={placeholder}
                className={className}
                value={local}
                onChange={(e) => setLocal(e.target.value)}
            />
        </div>
    );
}
