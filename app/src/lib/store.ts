import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** AsyncStorage that falls back to the pre-rename (StoXX) key once, so saved data survives the VOLTIX rename. */
export function legacyStorage(oldName: string) {
  return {
    getItem: async (name: string) => (await AsyncStorage.getItem(name)) ?? (await AsyncStorage.getItem(oldName)),
    setItem: (name: string, value: string) => AsyncStorage.setItem(name, value),
    removeItem: async (name: string) => {
      await AsyncStorage.removeItem(name);
      await AsyncStorage.removeItem(oldName);
    },
  };
}

export interface Lot {
  id: string;
  symbol: string;
  name: string;
  qty: number;
  price: number; // cost per share
  date: string; // YYYY-MM-DD
}

export interface Account {
  mode: 'guest' | 'google';
  uid?: string;
  name?: string | null;
  email?: string | null;
  photo?: string | null;
}

interface AppState {
  disclaimerAcceptedAt: string | null;
  account: Account | null;
  setAccount: (a: Account | null) => void;
  replaceData: (d: { lots: Lot[]; watchlist: string[] }) => void;
  lots: Lot[];
  watchlist: string[];
  acceptDisclaimer: () => void;
  addLot: (lot: Omit<Lot, 'id'>) => void;
  removeLot: (id: string) => void;
  toggleWatch: (symbol: string) => void;
  resetAll: () => void;
  /** Where to go after onboarding/sign-in (e.g. a group-chat invite link opened before entering the app). */
  pendingPath: string | null;
  setPendingPath: (p: string | null) => void;
  /** Chat members whose messages this user chose to hide (stays on the device). */
  blocked: string[];
  toggleBlock: (uid: string) => void;
}

/**
 * Guest mode: all user data lives ON THE DEVICE only.
 * Google mode: the same data is also synced to the user's own Firestore document (see auth.tsx).
 */
export const useApp = create<AppState>()(
  persist(
    (set) => ({
      disclaimerAcceptedAt: null,
      account: null,
      setAccount: (account) => set({ account }),
      replaceData: ({ lots, watchlist }) => set({ lots, watchlist }),
      lots: [],
      watchlist: [],
      acceptDisclaimer: () => set({ disclaimerAcceptedAt: new Date().toISOString() }),
      addLot: (lot) =>
        set((s) => ({ lots: [...s.lots, { ...lot, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }] })),
      removeLot: (id) => set((s) => ({ lots: s.lots.filter((l) => l.id !== id) })),
      toggleWatch: (symbol) =>
        set((s) => ({
          watchlist: s.watchlist.includes(symbol) ? s.watchlist.filter((x) => x !== symbol) : [...s.watchlist, symbol],
        })),
      resetAll: () => set({ lots: [], watchlist: [], disclaimerAcceptedAt: null, account: null, blocked: [], pendingPath: null }),
      pendingPath: null,
      setPendingPath: (pendingPath) => set({ pendingPath }),
      blocked: [],
      toggleBlock: (uid) => set((s) => ({ blocked: s.blocked.includes(uid) ? s.blocked.filter((x) => x !== uid) : [...s.blocked, uid] })),
    }),
    { name: 'voltix-user', storage: createJSONStorage(() => legacyStorage('stoxx-user')), version: 3, migrate: (s: any) => ({ account: null, blocked: [], pendingPath: null, ...s }) },
  ),
);
