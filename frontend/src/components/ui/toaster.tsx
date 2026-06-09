import { Toaster as SonnerToaster } from "sonner";
import { CircleCheck, CircleX, TriangleAlert, Info } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import type { ComponentProps } from "react";

type ToasterProps = ComponentProps<typeof SonnerToaster>;

function Toaster({ ...props }: ToasterProps) {
    const { theme } = useTheme();

    return (
        <SonnerToaster
            theme={theme as ToasterProps["theme"]}
            className="toaster group"
            position="top-right"
            closeButton
            gap={10}
            offset={{ right: 24, top: 24 }}
            toastOptions={{
                duration: 4000,
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-brand group-[.toaster]:text-white group-[.toaster]:border-none group-[.toaster]:border-l-[3px] group-[.toaster]:border-l-brand-cyan group-[.toaster]:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.4)] dark:group-[.toaster]:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] group-[.toaster]:rounded-xl group-[.toaster]:px-4 group-[.toaster]:py-3.5 group-[.toaster]:gap-3 group-[.toaster]:animate-fade-in-up",
                    title:
                        "group-[.toast]:text-sm group-[.toast]:font-semibold group-[.toast]:text-white/90 group-[.toast]:tracking-tight group-[.toast]:font-[family-name:var(--font-heading)]",
                    description:
                        "group-[.toast]:text-xs group-[.toast]:text-white/70 group-[.toast]:leading-relaxed group-[.toast]:mt-0.5",
                    actionButton:
                        "group-[.toast]:bg-white/20 group-[.toast]:text-white group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:transition-all group-[.toast]:hover:bg-white/30 group-[.toast]:hover:scale-[1.02] group-[.toast]:active:scale-[0.98]",
                    cancelButton:
                        "group-[.toast]:bg-white/10 group-[.toast]:text-white/70 group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:transition-all group-[.toast]:hover:bg-white/20 group-[.toast]:hover:text-white/90",
                    closeButton:
                        "group-[.toast]:absolute group-[.toast]:right-2.5 group-[.toast]:top-2.5 group-[.toast]:size-5 group-[.toast]:rounded-full group-[.toast]:bg-white/15 group-[.toast]:text-white/50 group-[.toast]:border-none group-[.toast]:flex group-[.toast]:items-center group-[.toast]:justify-center group-[.toast]:transition-all group-[.toast]:opacity-0 group-[.toast]:scale-75 group-hover/toast:group-[.toast]:opacity-100 group-hover/toast:group-[.toast]:scale-100 group-[.toast]:hover:bg-white/25 group-[.toast]:hover:text-white/80 group-[.toast]:[&>svg]:size-3",
                    icon: "group-[.toast]:m-0",
                },
            }}
            icons={{
                success: <CircleCheck className="size-5 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]" />,
                error: <CircleX className="size-5 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]" />,
                warning: <TriangleAlert className="size-5 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]" />,
                info: <Info className="size-5 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]" />,
            }}
            {...props}
        />
    );
}

export { Toaster };
