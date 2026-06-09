import { create } from "zustand";

interface FriendState {
    pendingCount: number;
    setPendingCount: (count: number) => void;
    incrementPending: () => void;
    decrementPending: () => void;
    onlineUserIds: string[];
    setOnlineFriends: (ids: string[]) => void;
    addOnlineFriend: (id: string) => void;
    removeOnlineFriend: (id: string) => void;
}

export const useFriendStore = create<FriendState>((set) => ({
    pendingCount: 0,
    setPendingCount: (count) => set({ pendingCount: count }),
    incrementPending: () => set((s) => ({ pendingCount: s.pendingCount + 1 })),
    decrementPending: () => set((s) => ({ pendingCount: Math.max(0, s.pendingCount - 1) })),
    onlineUserIds: [],
    setOnlineFriends: (ids) => set({ onlineUserIds: ids }),
    addOnlineFriend: (id) =>
        set((s) => {
            if (s.onlineUserIds.includes(id)) return s;
            return { onlineUserIds: [...s.onlineUserIds, id] };
        }),
    removeOnlineFriend: (id) =>
        set((s) => ({
            onlineUserIds: s.onlineUserIds.filter((uid) => uid !== id),
        })),
}));
