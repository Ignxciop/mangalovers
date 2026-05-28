import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import type { ReactNode, RefObject } from "react";

interface AdminHeaderSearch {
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    onEnter: (value: string) => void;
    onClear: () => void;
    inputRef: RefObject<HTMLInputElement | null>;
}

interface AdminHeaderProps {
    icon: React.ElementType;
    title: string;
    search?: AdminHeaderSearch;
    children?: ReactNode;
}

export function AdminHeader({ icon: Icon, title, search, children }: AdminHeaderProps) {
    const { value, placeholder, onChange, onEnter, onClear, inputRef } = search ?? {};
    return (
        <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur border-b border-border shadow-[0_1px_0_0] shadow-brand/5">
            <div className="container mx-auto grid grid-cols-[auto_1fr_auto] items-center h-16 px-4 gap-4">
                <SidebarTrigger />
                <div className="flex justify-center min-w-0">
                    <div className={`flex items-center gap-2 min-w-0 ${search ? "sm:gap-4" : ""}`}>
                        <div className={`flex items-center gap-2 shrink-0 ${search ? "hidden sm:flex" : ""}`}>
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">{title}</span>
                        </div>
                        {search && (
                            <div className="w-full max-w-md">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        ref={inputRef}
                                        placeholder={placeholder}
                                        className="pl-9 pr-8 h-9 text-sm bg-muted/40 border-none"
                                        value={value}
                                        onChange={(e) => onChange?.(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") onEnter?.(value ?? "");
                                        }}
                                    />
                                    {value && (
                                        <button onClick={onClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                            <X className="size-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {children ?? <div />}
            </div>
        </header>
    );
}
