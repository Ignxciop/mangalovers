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
                        "!bg-card/80 !backdrop-blur-xl !text-foreground !border-l-[3px] !border-l-brand-cyan !shadow-[-4px_0_15px_-5px_var(--brand-cyan),0_8px_32px_-12px_rgba(0,0,0,0.5)] !rounded-xl !px-4 !py-3.5 !gap-3 !border-0 !border-t !border-r !border-b !border-border/40 !animate-fade-in-up",
                    title:
                        "!text-sm !font-semibold !text-foreground !tracking-tight",
                    description:
                        "!text-xs !text-muted-foreground !leading-relaxed !mt-0.5",
                    actionButton:
                        "!bg-gradient-to-r !from-brand !to-brand-cyan !text-white !rounded-lg !px-3 !py-1.5 !text-xs !font-medium !transition-all hover:!scale-[1.02] active:!scale-[0.98] !shadow-[0_0_12px_-4px_var(--brand-cyan)]",
                    cancelButton:
                        "!bg-muted/50 !text-muted-foreground !rounded-lg !px-3 !py-1.5 !text-xs !font-medium !transition-all hover:!bg-accent hover:!text-accent-foreground",
                    closeButton:
                        "!absolute !right-2.5 !top-2.5 !size-5 !rounded-full !bg-muted/40 !text-muted-foreground/60 !flex !items-center !justify-center !transition-all !opacity-0 hover:!opacity-100 hover:!bg-accent/80 hover:!text-accent-foreground [&>svg]:!size-3",
                    icon: "!m-0",
                },
            }}
            icons={{
                success: <CircleCheck className="size-5 text-white" />,
                error: <CircleX className="size-5 text-white" />,
                warning: <TriangleAlert className="size-5 text-white" />,
                info: <Info className="size-5 text-white" />,
            }}
            {...props}
        />
    );
}

export { Toaster };
