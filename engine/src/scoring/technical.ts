import type { Candle, Factor, PillarResult } from '../types.js';
import { sma, rsi, macd, atr, last, clamp, round } from '../indicators.js';

/** Score weights (total 100): technical 50 · fundamental 30 · sentiment 20. */
export const TECH_MAX = 50;
export const FUND_MAX = 30;
export const SENT_MAX = 20;

/**
 * Technical pillar (max 50) — read the way a swing trader reads a chart:
 *
 *  TREND (18)        price > SMA200 6 · SMA50 > SMA200 4 · SMA200 rising 3 · price > SMA50 5
 *  STRENGTH (10)     6-month relative strength vs the S&P 500 universe 6 · MACD histogram positive & rising 4
 *  ENTRY TIMING (16) distance from SMA20 in ATRs 8 (near the mean = good entry; stretched = poor)
 *                    RSI(14) zone 5 (40–60 best, >70 overbought = 0)
 *                    up/down streak 3 (pullback-then-reversal = 3; 3+ straight up days = chasing = 0)
 *  ACCUMULATION (6)  20-day up-volume / down-volume ratio
 *
 * A stock that has simply risen several days in a row scores LOW on timing (stretched, high RSI, chasing),
 * even if its trend is strong — buying after a run is how traders get caught at the top.
 */
export function scoreTechnical(candles: Candle[], ctx: { rsPct?: number | null } = {}): PillarResult {
  const closes = candles.map((c) => c.close);
  const price = last(closes);
  const s20 = last(sma(closes, 20));
  const s50 = last(sma(closes, 50));
  const s200Arr = sma(closes, 200);
  const s200 = last(s200Arr);
  const s200Ago = s200Arr[s200Arr.length - 21] ?? null;
  const r = rsi(closes, 14);
  const rNow = last(r);
  const rMin5 = Math.min(...(r.slice(-6, -1).filter((x) => x !== null) as number[]));
  const { hist } = macd(closes);
  const hNow = last(hist);
  const hPrev = hist[hist.length - 2];
  const A = atr(candles, 14);

  // streaks (last day included)
  let up = 0;
  for (let i = closes.length - 1; i > 0 && closes[i] > closes[i - 1]; i--) up++;
  let downBefore = 0;
  if (up >= 1) for (let i = closes.length - 1 - up; i > 0 && closes[i] < closes[i - 1]; i--) downBefore++;

  // 20-day up-volume vs down-volume
  let upV = 0;
  let dnV = 0;
  for (let i = Math.max(1, candles.length - 20); i < candles.length; i++) {
    if (candles[i].close > candles[i - 1].close) upV += candles[i].volume;
    else if (candles[i].close < candles[i - 1].close) dnV += candles[i].volume;
  }
  const udRatio = dnV > 0 ? upV / dnV : upV > 0 ? 2 : 1;

  const f: Factor[] = [];
  const push = (key: string, label: string, value: string, points: number, max: number) =>
    f.push({ key, label, value, points: round(points, 1), max, signal: points >= max * 0.6 ? 'positive' : points > 0 ? 'neutral' : 'negative' });

  // ---- Trend (18) ----
  const above200 = s200 !== null && price > s200;
  push('sma200', 'מחיר מעל ממוצע 200', s200 ? `${round((price / s200 - 1) * 100, 1)}%` : '—', above200 ? 6 : 0, 6);
  const golden = s50 !== null && s200 !== null && s50 > s200;
  push('golden', 'ממוצע 50 מעל ממוצע 200', golden ? 'כן' : 'לא', golden ? 4 : 0, 4);
  const rising = s200 !== null && s200Ago !== null && s200 > s200Ago;
  push('slope200', 'ממוצע 200 במגמת עלייה', rising ? 'עולה' : 'יורד', rising ? 3 : 0, 3);
  const above50 = s50 !== null && price > s50;
  push('sma50', 'מחיר מעל ממוצע 50', s50 ? `${round((price / s50 - 1) * 100, 1)}%` : '—', above50 ? 5 : 0, 5);
  const uptrend = above200 && golden; // long-term uptrend (a dip under SMA50 inside it is a classic buy zone)

  // ---- Strength (10) ----
  const rs = ctx.rsPct ?? null;
  push('rs', 'חוזק יחסי (6 חודשים) מול S&P 500', rs !== null ? `${Math.round(rs)}` : '—', rs !== null ? (rs / 100) * 6 : 3, 6);
  let macdPts = 0;
  let macdV = '—';
  if (hNow !== null && hPrev !== null) {
    if (hNow > 0 && hNow > hPrev) (macdPts = 4), (macdV = 'חיובי ומתחזק');
    else if (hPrev <= 0 && hNow > 0) (macdPts = 4), (macdV = 'חצייה כלפי מעלה');
    else if (hNow > hPrev) (macdPts = 2), (macdV = 'משתפר');
    else macdV = 'נחלש';
  }
  push('macd', 'MACD', macdV, macdPts, 4);

  // ---- Entry timing (16) ----
  const ext = s20 !== null && A > 0 ? (price - s20) / A : 0; // how many "normal daily moves" above the 20-day mean
  let extPts = 0;
  if (ext >= -1 && ext <= 1) extPts = uptrend ? 8 : 4;
  else if (ext > 1 && ext <= 2) extPts = 5;
  else if (ext > 2 && ext <= 3) extPts = 2;
  else if (ext < -1) extPts = uptrend ? 3 : 0;
  push('extension', 'מרחק מממוצע 20 (ביחידות ATR)', `${ext >= 0 ? '+' : ''}${round(ext, 1)}`, extPts, 8);

  let rsiPts = 0;
  let rsiNote = '—';
  if (rNow !== null) {
    if (rNow > 70) (rsiPts = 0), (rsiNote = 'קניית יתר');
    else if (rNow > 60) (rsiPts = 3), (rsiNote = 'חזק');
    else if (rNow >= 40) (rsiPts = 5), (rsiNote = 'מאוזן');
    else if (rMin5 < 32 && rNow > rMin5 + 4) (rsiPts = uptrend ? 5 : 2), (rsiNote = 'יוצא ממכירת יתר');
    else (rsiPts = 1), (rsiNote = 'חלש');
  }
  push('rsi', 'RSI(14)', rNow !== null ? `${round(rNow, 0)} · ${rsiNote}` : '—', rsiPts, 5);

  let streakPts = 1;
  let streakV = 'ללא רצף';
  if (up >= 3) (streakPts = 0), (streakV = `${up} ימי עלייה ברצף — מרדף`);
  else if (up >= 1 && downBefore >= 2) (streakPts = uptrend ? 3 : 1.5), (streakV = `${downBefore} ימי ירידה ← היפוך`);
  else if (up === 0) (streakPts = 1), (streakV = 'יום אחרון אדום');
  push('streak', 'רצף ימים', streakV, streakPts, 3);

  // ---- Accumulation (6) ----
  const volPts = udRatio >= 1.3 ? 6 : udRatio >= 1.0 ? 4 : udRatio >= 0.8 ? 2 : 0;
  push('volume', 'מחזור בימי עלייה מול ירידה (20 יום)', `x${round(udRatio, 2)}`, volPts, 6);

  const score = round(clamp(f.reduce((a, x) => a + x.points, 0), 0, TECH_MAX), 1);
  return { score, factors: f, summary: technicalSummary(f, score) };
}

function technicalSummary(f: Factor[], score: number): string {
  const g = (k: string) => f.find((x) => x.key === k)!;
  const trend = g('sma200').points + g('golden').points + g('slope200').points + g('sma50').points;
  const timing = g('extension').points + g('rsi').points + g('streak').points;
  const a = trend >= 15 ? 'מגמה עולה' : trend >= 8 ? 'מגמה מעורבת' : 'מגמה יורדת';
  const b = timing >= 12 ? 'נקודת כניסה טובה' : timing >= 7 ? 'כניסה סבירה' : 'מתוחה — עדיף לחכות לתיקון';
  return `${a} · ${b}${score >= 35 ? ' · תמונה טכנית חזקה' : score < 20 ? ' · תמונה טכנית חלשה' : ''}`;
}
