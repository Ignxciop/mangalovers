import { create } from "zustand";

interface FriendState {
    pendingCount: number;
    setPendingCount: (count: number) => void;
    incrementPending: () => void;
    decrementPending: () => void;
}

export const useFriendStore = create<FriendState>((set) => ({
    pendingCount: 0,
    setPendingCount: (count) => set({ pendingCount: count }),
    incrementPending: () => set((s) => ({ pendingCount: s.pendingCount + 1 })),
    decrementPending: () => set((s) => ({ pendingCount: Math.max(0, s.pendingCount - 1) })),
}));
