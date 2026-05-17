import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent/60 animate-pulse rounded-md bg-gradient-to-r from-accent via-accent/80 to-accent bg-[length:200%_100%] motion-safe:animate-[shimmer_1.5s_ease-in-out_infinite]", className)}
      {...props}
    />
  )
}

export { Skeleton }
