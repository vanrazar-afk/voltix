/**
 * Trading league (Firestore). Every player starts with a virtual $100,000, may make 4 trades per trading day,
 * and only during the regular US session. Standings = cash + holdings at current market prices.
 *
 *   nicknames/{nickname-lowercase}  { uid, nickname }            ← makes nicknames unique
 *   league/{uid}                    { nickname, cash, holdings{SYM:{qty,cost}}, day, dayCount, joinedAt, log[] }
 * Server rules (firestore.rules) enforce: own doc only, fixed start cash, ≤4 trades per UTC day, weekday session window.
 */
import { useEffect, useState } from 'react';
import { collection, doc, getDoc, limit, onSnapshot, query, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore';
import { firebaseHandles } from './auth';
import { useApp } from './store';

export const START_CASH = 100_000;
export const TRADES_PER_DAY = 4;

export interface Holding {
  qty: number;
  cost: number; // total paid for the shares currently held
}
export interface TradeLog {
  at: number;
  side: 'buy' | 'sell';
  symbol: string;
  qty: number;
  price: number;
}
export interface Player {
  uid: string;
  nickname: string;
  cash: number;
  holdings: Record<string, Holding>;
  day: number;
  dayCount: number;
  log: TradeLog[];
}

/** Trading-day number used by the server rules (UTC days since epoch; the US session never crosses UTC midnight). */
export const dayNumber = (ms = Date.now()) => Math.floor(ms / 864e5);

export function tradesLeft(p: Player | null) {
  if (!p) return 0;
  return p.day === dayNumber() ? Math.max(0, TRADES_PER_DAY - p.dayCount) : TRADES_PER_DAY;
}

export function playerValue(p: Player, price: (s: string) => number | undefined) {
  let v = p.cash;
  for (const [s, h] of Object.entries(p.holdings ?? {})) v += h.qty * (price(s) ?? h.cost / Math.max(1, h.qty));
  return v;
}

export const NICK_RE = /^[\p{L}\p{N} _.\-]{2,20}$/u;

function me() {
  const { auth, db } = firebaseHandles();
  const u = auth?.currentUser;
  if (!db || !u) throw new Error('not-signed-in');
  return { db, uid: u.uid };
}

const toPlayer = (uid: string, x: Record<string, unknown>): Player => ({
  uid,
  nickname: String(x.nickname ?? ''),
  cash: Number(x.cash ?? 0),
  holdings: (x.holdings as Record<string, Holding>) ?? {},
  day: Number(x.day ?? 0),
  dayCount: Number(x.dayCount ?? 0),
  log: (x.log as TradeLog[]) ?? [],
});

/** My league record (live). undefined = loading, null = not registered. */
export function useMyPlayer() {
  const uid = useApp((s) => (s.account?.mode === 'google' ? s.account.uid : null));
  const [p, setP] = useState<Player | null | undefined>(undefined);
  useEffect(() => {
    const { db } = firebaseHandles();
    if (!db || !uid) return setP(null);
    return onSnapshot(
      doc(db, 'league', uid),
      (d) => setP(d.exists() ? toPlayer(d.id, d.data()) : null),
      () => setP(null),
    );
  }, [uid]);
  return p;
}

/** All players (live) for the standings. */
export function usePlayers(enabled: boolean) {
  const [list, setList] = useState<Player[] | null>(null);
  useEffect(() => {
    const { db } = firebaseHandles();
    if (!db || !enabled) return;
    return onSnapshot(
      query(collection(db, 'league'), limit(1000)),
      (snap) => setList(snap.docs.map((d) => toPlayer(d.id, d.data()))),
      () => setList([]),
    );
  }, [enabled]);
  return list;
}

export async function joinLeague(nickname: string) {
  const { db, uid } = me();
  const nick = nickname.trim().replace(/\s+/g, ' ');
  if (!NICK_RE.test(nick)) throw new Error('bad-nickname');
  const key = nick.toLowerCase();
  const taken = await getDoc(doc(db, 'nicknames', key));
  if (taken.exists() && taken.data().uid !== uid) throw new Error('nickname-taken');
  const b = writeBatch(db);
  if (!taken.exists()) b.set(doc(db, 'nicknames', key), { uid, nickname: nick });
  b.set(doc(db, 'league', uid), {
    nickname: nick,
    cash: START_CASH,
    holdings: {},
    day: 0,
    dayCount: 0,
    log: [],
    joinedAt: serverTimestamp(),
  });
  await b.commit();
}

export async function leaveLeague(p: Player) {
  const { db, uid } = me();
  const b = writeBatch(db);
  b.delete(doc(db, 'league', uid));
  b.delete(doc(db, 'nicknames', p.nickname.toLowerCase()));
  await b.commit();
}

/** One action = one buy or one sell (any quantity), at the given market price. */
export async function trade(side: 'buy' | 'sell', symbol: string, qty: number, price: number) {
  const { db, uid } = me();
  if (!(qty > 0) || !Number.isInteger(qty) || !(price > 0)) throw new Error('bad-order');
  await runTransaction(db, async (tx) => {
    const ref = doc(db, 'league', uid);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('not-registered');
    const p = toPlayer(uid, snap.data());
    const today = dayNumber();
    const count = p.day === today ? p.dayCount : 0;
    if (count >= TRADES_PER_DAY) throw new Error('no-trades-left');
    const holdings = { ...p.holdings };
    const h = holdings[symbol] ?? { qty: 0, cost: 0 };
    let cash = p.cash;
    if (side === 'buy') {
      const total = qty * price;
      if (total > cash + 1e-6) throw new Error('insufficient-cash');
      cash -= total;
      holdings[symbol] = { qty: h.qty + qty, cost: round2(h.cost + total) };
    } else {
      if (qty > h.qty) throw new Error('insufficient-shares');
      cash += qty * price;
      const left = h.qty - qty;
      if (left === 0) delete holdings[symbol];
      else holdings[symbol] = { qty: left, cost: round2((h.cost * left) / h.qty) };
    }
    const log = [{ at: Date.now(), side, symbol, qty, price }, ...p.log].slice(0, 40);
    tx.update(ref, { cash: round2(cash), holdings, day: today, dayCount: count + 1, log });
  });
}

const round2 = (n: number) => Math.round(n * 100) / 100;
