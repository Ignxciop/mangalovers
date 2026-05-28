import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { SimpleFriend } from "@/api/friends";

const AVATAR_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") ?? "";

interface FriendAvatarsProps {
  friends: SimpleFriend[];
  size?: "sm" | "xs";
}

const sizeMap = {
  sm: "size-5 text-[8px]",
  xs: "size-4 text-[7px]",
};

export function FriendAvatars({ friends, size = "sm" }: FriendAvatarsProps) {
  if (friends.length === 0) return null;
  return (
    <span
      className="flex -space-x-1.5"
      title={friends.map((f) => `${f.name} ${f.lastname}`).join(", ")}
    >
      {friends.slice(0, 3).map((f) => (
        <Avatar
          key={f.userId}
          className={cn(sizeMap[size], "rounded-full border-2 border-background")}
        >
          {f.avatarUrl && (
            <AvatarImage
              src={`${AVATAR_BASE}/uploads/avatars/${f.avatarUrl}`}
              alt={f.name}
              className="rounded-full object-cover"
            />
          )}
          <AvatarFallback className="rounded-full font-bold bg-primary/10 text-primary">
            {f.name[0]}
          </AvatarFallback>
        </Avatar>
      ))}
      {friends.length > 3 && (
        <span
          className={cn(
            sizeMap[size],
            "rounded-full bg-muted font-bold flex items-center justify-center border-2 border-background text-muted-foreground",
          )}
        >
          +{friends.length - 3}
        </span>
      )}
    </span>
  );
}
