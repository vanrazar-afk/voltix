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

/** An open position: one buy of a stock at the market price (no quantity — returns are tracked in %). */
export interface Lot {
  id: string;
  symbol: string;
  name: string;
  price: number; // buy price (market price at the moment of the trade)
  date: string; // ISO time of the buy
  qty?: number; // legacy (pre-trading-rules data) — ignored
}

/** A position that was sold at the market price. */
export interface ClosedTrade {
  id: string;
  symbol: string;
  name: string;
  buyPrice: number;
  buyDate: string;
  sellPrice: number;
  sellDate: string;
}

export interface Account {
  mode: 'guest' | 'google' | 'email';
  uid?: string;
  name?: string | null;
  email?: string | null;
  photo?: string | null;
  verified?: boolean; // email accounts: address confirmed (Google accounts are always verified)
}

/** uid of a signed-in (Google or email) user, or null for guests. */
export const accountUid = (a: Account | null) => (a && a.mode !== 'guest' ? a.uid ?? null : null);
/** Signed in AND verified — required for groups and the league. */
export const verifiedUid = (a: Account | null) => (a && a.mode !== 'guest' && a.verified !== false ? a.uid ?? null : null);

interface AppState {
  disclaimerAcceptedAt: string | null;
  account: Account | null;
  setAccount: (a: Account | null) => void;
  replaceData: (d: { lots: Lot[]; watchlist: string[]; history?: ClosedTrade[] }) => void;
  lots: Lot[];
  history: ClosedTrade[];
  /** Sell an open position at the given market price (moves it to history). */
  sellLot: (id: string, price: number) => void;
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
      replaceData: ({ lots, watchlist, history }) => set((s) => ({ lots, watchlist, history: history ?? s.history })),
      lots: [],
      history: [],
      sellLot: (id, price) =>
        set((s) => {
          const l = s.lots.find((x) => x.id === id);
          if (!l) return {};
          const closed: ClosedTrade = { id: l.id, symbol: l.symbol, name: l.name, buyPrice: l.price, buyDate: l.date, sellPrice: price, sellDate: new Date().toISOString() };
          return { lots: s.lots.filter((x) => x.id !== id), history: [closed, ...s.history] };
        }),
      watchlist: [],
      acceptDisclaimer: () => set({ disclaimerAcceptedAt: new Date().toISOString() }),
      addLot: (lot) =>
        set((s) => ({ lots: [...s.lots, { ...lot, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }] })),
      removeLot: (id) => set((s) => ({ lots: s.lots.filter((l) => l.id !== id) })),
      toggleWatch: (symbol) =>
        set((s) => ({
          watchlist: s.watchlist.includes(symbol) ? s.watchlist.filter((x) => x !== symbol) : [...s.watchlist, symbol],
        })),
      resetAll: () => set({ lots: [], history: [], watchlist: [], disclaimerAcceptedAt: null, account: null, blocked: [], pendingPath: null }),
      pendingPath: null,
      setPendingPath: (pendingPath) => set({ pendingPath }),
      blocked: [],
      toggleBlock: (uid) => set((s) => ({ blocked: s.blocked.includes(uid) ? s.blocked.filter((x) => x !== uid) : [...s.blocked, uid] })),
    }),
    { name: 'voltix-user', storage: createJSONStorage(() => legacyStorage('stoxx-user')), version: 4, migrate: (s: any) => ({ account: null, blocked: [], pendingPath: null, history: [], ...s }) },
  ),
);
