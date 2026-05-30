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
            offset={{ right: 20, top: 20 }}
            toastOptions={{
                duration: 3500,
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg group-[.toaster]:px-4 group-[.toaster]:py-3 group-[.toaster]:gap-2",
                    title:
                        "group-[.toast]:text-sm group-[.toast]:font-semibold group-[.toast]:text-foreground",
                    description:
                        "group-[.toast]:text-xs group-[.toast]:text-muted-foreground",
                    actionButton:
                        "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-md group-[.toast]:px-3 group-[.toast]:py-1 group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:transition-colors group-[.toast]:hover:bg-primary/90",
                    cancelButton:
                        "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-md group-[.toast]:px-3 group-[.toast]:py-1 group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:transition-colors group-[.toast]:hover:bg-accent group-[.toast]:hover:text-accent-foreground",
                    closeButton:
                        "group-[.toast]:absolute group-[.toast]:right-2 group-[.toast]:top-2 group-[.toast]:size-5 group-[.toast]:rounded-full group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:border group-[.toast]:border-border group-[.toast]:flex group-[.toast]:items-center group-[.toast]:justify-center group-[.toast]:transition-colors group-[.toast]:hover:bg-accent group-[.toast]:hover:text-accent-foreground group-[.toast]:[&>svg]:size-3",
                    icon: "group-[.toast]:m-0",
                },
            }}
            icons={{
                success: <CircleCheck className="size-4 text-brand-green" />,
                error: <CircleX className="size-4 text-destructive" />,
                warning: <TriangleAlert className="size-4 text-brand-amber" />,
                info: <Info className="size-4 text-brand" />,
            }}
            {...props}
        />
    );
}

export { Toaster };
