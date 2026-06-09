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
                        "!bg-brand !text-white !border-l-[3px] !border-l-brand-cyan !shadow-lg !rounded-xl !px-4 !py-3.5 !gap-3 !border-0 !animate-fade-in-up",
                    title:
                        "!text-sm !font-semibold !text-white/90 !tracking-tight",
                    description:
                        "!text-xs !text-white/70 !leading-relaxed !mt-0.5",
                    actionButton:
                        "!bg-white/20 !text-white !rounded-lg !px-3 !py-1.5 !text-xs !font-medium !transition-all hover:!bg-white/30",
                    cancelButton:
                        "!bg-white/10 !text-white/70 !rounded-lg !px-3 !py-1.5 !text-xs !font-medium !transition-all hover:!bg-white/20 hover:!text-white/90",
                    closeButton:
                        "!absolute !right-2.5 !top-2.5 !size-5 !rounded-full !bg-white/15 !text-white/50 !flex !items-center !justify-center !transition-all !opacity-0 hover:!opacity-100 hover:!bg-white/25 hover:!text-white/80 [&>svg]:!size-3",
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
