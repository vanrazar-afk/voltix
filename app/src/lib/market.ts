import { useEffect, useState } from 'react';

/**
 * US stock market (NYSE/Nasdaq) regular session: Mon–Fri 9:30–16:00 New York time.
 * No pre-market / after-hours. Holidays and 1:00 p.m. early closes from the NYSE calendar (2026–2027).
 */
const HOLIDAYS = new Set([
  // 2026
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
  // 2027
  '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31', '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24',
]);
const EARLY_CLOSE = new Set(['2026-11-27', '2026-12-24', '2027-11-26']); // 13:00 ET

const OPEN_MIN = 9 * 60 + 30;
const CLOSE_MIN = 16 * 60;
const EARLY_CLOSE_MIN = 13 * 60;

/** Date (YYYY-MM-DD), weekday (0=Sun) and minutes since midnight in New York for a given instant. */
function nyParts(d: Date) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const g = (t: string) => f.find((p) => p.type === t)?.value ?? '';
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday'));
  return { date: `${g('year')}-${g('month')}-${g('day')}`, wd, min: Number(g('hour')) * 60 + Number(g('minute')) };
}

function isTradingDay(date: string, wd: number) {
  return wd >= 1 && wd <= 5 && !HOLIDAYS.has(date);
}

export type MarketReason = 'open' | 'weekend' | 'holiday' | 'pre' | 'post';
export interface MarketStatus {
  open: boolean;
  reason: MarketReason;
  /** next regular-session open (when closed) */
  nextOpen: Date | null;
  /** today's close (when open) */
  closesAt: Date | null;
  earlyClose: boolean;
}

/** Find the instant in `day` (NY) at `minutes` by scanning — avoids DST math. */
function nyInstant(from: Date, dayOffset: number, minutes: number): Date {
  // Start near noon UTC of the target NY day, then adjust by the NY-minute difference.
  const base = new Date(from.getTime() + dayOffset * 864e5);
  const p = nyParts(base);
  return new Date(base.getTime() + (minutes - p.min) * 60e3 - (base.getSeconds() * 1e3 + base.getMilliseconds()));
}

export function marketStatus(now: Date = new Date()): MarketStatus {
  const p = nyParts(now);
  const trading = isTradingDay(p.date, p.wd);
  const closeMin = EARLY_CLOSE.has(p.date) ? EARLY_CLOSE_MIN : CLOSE_MIN;
  if (trading && p.min >= OPEN_MIN && p.min < closeMin) {
    return { open: true, reason: 'open', nextOpen: null, closesAt: nyInstant(now, 0, closeMin), earlyClose: closeMin !== CLOSE_MIN };
  }
  const reason: MarketReason = !trading ? (p.wd === 0 || p.wd === 6 ? 'weekend' : 'holiday') : p.min < OPEN_MIN ? 'pre' : 'post';
  // next open: today (if before open on a trading day) or the next trading day
  let nextOpen: Date | null = null;
  for (let i = 0; i < 10; i++) {
    const probe = new Date(now.getTime() + i * 864e5);
    const q = nyParts(probe);
    if (!isTradingDay(q.date, q.wd)) continue;
    if (i === 0 && p.min >= OPEN_MIN) continue;
    nextOpen = nyInstant(now, i, OPEN_MIN);
    break;
  }
  return { open: false, reason, nextOpen, closesAt: null, earlyClose: false };
}

/** Prices older than this are not tradable (the engine refreshes every ~5 minutes in session). */
export const MAX_QUOTE_AGE_MIN = 20;


/** Live market status (re-evaluated every 15 s). */
export function useMarketStatus() {
  const [s, setS] = useState(() => marketStatus());
  useEffect(() => {
    const id = setInterval(() => setS(marketStatus()), 15000);
    return () => clearInterval(id);
  }, []);
  return s;
}

/** Can we trade at the current quotes? (session open AND prices fresh) */
export function tradeBlock(status: MarketStatus, quotesAt: string, now = Date.now()): 'closed' | 'stale' | null {
  if (!status.open) return 'closed';
  if (now - new Date(quotesAt).getTime() > MAX_QUOTE_AGE_MIN * 60e3) return 'stale';
  return null;
}
