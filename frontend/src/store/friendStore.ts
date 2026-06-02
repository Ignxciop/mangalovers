import { create } from "zustand";

interface FriendState {
    pendingCount: number;
    setPendingCount: (count: number) => void;
}

export const useFriendStore = create<FriendState>((set) => ({
    pendingCount: 0,
    setPendingCount: (count) => set({ pendingCount: count }),
}));
