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
                        "group toast group-[.toaster]:bg-background/70 dark:group-[.toaster]:bg-background/60 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border/50 group-[.toaster]:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.4)] dark:group-[.toaster]:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] group-[.toaster]:rounded-xl group-[.toaster]:px-4 group-[.toaster]:py-3.5 group-[.toaster]:gap-3 group-[.toaster]:animate-fade-in-up",
                    title:
                        "group-[.toast]:text-sm group-[.toast]:font-semibold group-[.toast]:text-foreground group-[.toast]:tracking-tight group-[.toast]:font-[family-name:var(--font-heading)]",
                    description:
                        "group-[.toast]:text-xs group-[.toast]:text-muted-foreground/80 group-[.toast]:leading-relaxed group-[.toast]:mt-0.5",
                    actionButton:
                        "group-[.toast]:bg-gradient-to-r group-[.toast]:from-brand group-[.toast]:to-brand-cyan group-[.toast]:text-white group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:transition-all group-[.toast]:shadow-sm group-[.toast]:hover:shadow-md group-[.toast]:hover:scale-[1.02] group-[.toast]:active:scale-[0.98]",
                    cancelButton:
                        "group-[.toast]:bg-muted/60 group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:transition-all group-[.toast]:hover:bg-accent group-[.toast]:hover:text-accent-foreground",
                    closeButton:
                        "group-[.toast]:absolute group-[.toast]:right-2.5 group-[.toast]:top-2.5 group-[.toast]:size-5 group-[.toast]:rounded-full group-[.toast]:bg-muted/40 group-[.toast]:text-muted-foreground/60 group-[.toast]:border-none group-[.toast]:flex group-[.toast]:items-center group-[.toast]:justify-center group-[.toast]:transition-all group-[.toast]:opacity-0 group-[.toast]:scale-75 group-hover/toast:group-[.toast]:opacity-100 group-hover/toast:group-[.toast]:scale-100 group-[.toast]:hover:bg-accent/80 group-[.toast]:hover:text-accent-foreground group-[.toast]:[&>svg]:size-3",
                    icon: "group-[.toast]:m-0",
                },
            }}
            icons={{
                success: <CircleCheck className="size-5 text-brand-green drop-shadow-[0_0_6px_var(--brand-green)]" />,
                error: <CircleX className="size-5 text-destructive drop-shadow-[0_0_6px_var(--destructive)]" />,
                warning: <TriangleAlert className="size-5 text-brand-amber drop-shadow-[0_0_6px_var(--brand-amber)]" />,
                info: <Info className="size-5 text-brand drop-shadow-[0_0_6px_var(--brand)]" />,
            }}
            {...props}
        />
    );
}

export { Toaster };
