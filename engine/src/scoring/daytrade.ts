/**
 * Same-day (intraday) trading plan for one stock — long side only, educational.
 *
 * Levels traders watch for the session:
 *   • Classic floor pivots from the previous session: P=(H+L+C)/3, R1=2P−L, S1=2P−H, R2=P+(H−L), S2=P−(H−L)
 *   • Session VWAP (volume-weighted average price) from 15-minute bars, today's open, high and low
 *   • Daily ATR(14) = how far the stock usually moves in a day → sizes the stop and judges whether targets are realistic
 * Bias (live): price vs VWAP, vs pivot, vs today's open. Bias (next session): last close vs pivot and vs 20-day average.
 * Setups: pullback to support (bullish), retest of broken resistance (bullish & extended), breakout above R1 (neutral),
 * buy near S1 inside a range (neutral, price low in range), reclaim of the pivot (bearish — wait for strength).
 * A setup is offered only if reward:risk to the first target is at least 1.2; otherwise "no clear setup".
 */
import type { Bar, Candle, DayPlan } from '../types.js';
import { atr, sma } from '../indicators.js';

const r2 = (n: number) => Math.round(n * 100) / 100;
const usd = (n: number) => `$${n.toFixed(2)}`;

function nyDate(sec: number) {
  return new Date(sec * 1000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}
function nyMinutes(d: Date) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  return Number(p.find((x) => x.type === 'hour')!.value) * 60 + Number(p.find((x) => x.type === 'minute')!.value);
}

export function buildDayPlan(candles: Candle[], bars: Bar[] | undefined, now: Date, nextEarningsDate: string | null): DayPlan | null {
  if (candles.length < 30) return null;
  const today = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const todayBars = (bars ?? []).filter((b) => nyDate(b.t) === today && b.v >= 0);
  const lastBar = todayBars.at(-1);
  const mins = nyMinutes(now);
  const live = !!lastBar && now.getTime() / 1000 - lastBar.t < 45 * 60 && mins >= 9 * 60 + 30 && mins < 16 * 60;

  // Previous completed session (daily candles may include today's partial bar while live)
  const completed = live && candles.at(-1)!.date === today ? candles.slice(0, -1) : candles;
  const prev = completed.at(-1)!;
  const H = prev.high;
  const L = prev.low;
  const C = prev.close;
  const P = (H + L + C) / 3;
  const R1 = 2 * P - L;
  const S1 = 2 * P - H;
  const R2 = P + (H - L);
  const S2 = P - (H - L);
  const A = atr(completed, 14);
  if (!(A > 0)) return null;

  let last = C;
  let vwap: number | undefined;
  let open: number | undefined;
  let dayHigh: number | undefined;
  let dayLow: number | undefined;
  if (live && todayBars.length) {
    open = todayBars[0].o;
    last = lastBar!.c;
    dayHigh = Math.max(...todayBars.map((b) => b.h));
    dayLow = Math.min(...todayBars.map((b) => b.l));
    let pv = 0;
    let vv = 0;
    for (const b of todayBars) {
      const tp = (b.h + b.l + b.c) / 3;
      pv += tp * b.v;
      vv += b.v;
    }
    vwap = vv > 0 ? pv / vv : undefined;
  }
  const gapPct = open !== undefined ? (open / C - 1) * 100 : undefined;

  // ---- Bias ----
  let bias: DayPlan['bias'];
  if (live) {
    const votes = [vwap !== undefined ? last > vwap : last > P, last > P, open !== undefined ? last > open : last > C];
    const up = votes.filter(Boolean).length;
    bias = up >= 3 ? 'bullish' : up <= 0 ? 'bearish' : up === 2 ? 'bullish' : 'neutral';
    if (up === 2 && vwap !== undefined && last < vwap) bias = 'neutral';
    if (up === 1 && last < P && (vwap === undefined || last < vwap)) bias = 'bearish';
  } else {
    const s20 = sma(completed.map((c) => c.close), 20).at(-1) ?? C;
    const above = (C > P ? 1 : 0) + (C > s20 ? 1 : 0);
    bias = above === 2 ? 'bullish' : above === 0 ? 'bearish' : 'neutral';
  }

  // ---- Setup (long only): try the setups that fit the bias, keep the first with reward:risk ≥ 1.2 ----
  const minRisk = 0.2 * A;
  const maxRisk = 0.6 * A;
  const support = vwap !== undefined ? Math.max(P, Math.min(vwap, last)) : P;
  const hi = dayHigh !== undefined ? Math.max(R1, dayHigh) : R1;
  type Cand = { setup: DayPlan['setup']; entryType: DayPlan['entryType']; entry: number; stop: number; t1: number; t2: number };
  const riskFrom = (e: number, floor: number) => e - Math.min(maxRisk, Math.max(minRisk, e - floor));
  const C_ = {
    retest: (): Cand => {
      const e = vwap !== undefined ? Math.max(R1, Math.min(vwap, last)) : R1;
      const t1 = Math.max(R2, e + 0.5 * A);
      return { setup: 'retest', entryType: 'limit', entry: e, stop: e - Math.min(maxRisk, Math.max(minRisk, 0.35 * A)), t1, t2: t1 + (R2 - R1) / 2 };
    },
    pullback: (): Cand => {
      const e = Math.min(last, support);
      const t1 = R1 > e + minRisk ? R1 : e + 0.5 * A;
      return { setup: 'pullback', entryType: 'limit', entry: e, stop: riskFrom(e, S1), t1, t2: Math.max(R2, t1 + 0.25 * A) };
    },
    breakout: (): Cand => {
      const e = Math.max(hi, last) * 1.001;
      const t1 = Math.max(R2, e + 0.5 * A);
      return { setup: 'breakout', entryType: 'stop', entry: e, stop: riskFrom(e, Math.max(P, vwap ?? P)), t1, t2: t1 + 0.5 * (R2 - R1) };
    },
    range: (): Cand => {
      const e = S1 + 0.05 * A;
      return { setup: 'range', entryType: 'limit', entry: e, stop: Math.max(S2, e - maxRisk), t1: P, t2: R1 };
    },
    reclaim: (): Cand => {
      const e = Math.max(P, last) * 1.001;
      const t1 = R1 > e + minRisk ? R1 : e + 0.5 * A;
      return { setup: 'reclaim', entryType: 'stop', entry: e, stop: riskFrom(e, S1), t1, t2: Math.max(R2, t1 + 0.25 * A) };
    },
  };
  const order: (keyof typeof C_)[] =
    bias === 'bullish'
      ? last > R1 + 0.1 * A
        ? ['retest', 'breakout']
        : ['pullback', 'breakout']
      : bias === 'neutral'
        ? last - S1 < R1 - last && last > S1
          ? ['range', 'breakout']
          : ['breakout', 'pullback']
        : ['reclaim'];
  const fix = (c: Cand) => {
    if (c.stop >= c.entry) c.stop = c.entry - minRisk;
    if (c.t1 <= c.entry) c.t1 = c.entry + 0.5 * A;
    if (c.t2 <= c.t1) c.t2 = c.t1 + 0.25 * A;
    return { ...c, rr: (c.t1 - c.entry) / (c.entry - c.stop) };
  };
  const tried = order.map((k) => fix(C_[k]()));
  const pick = tried.find((c) => c.rr >= 1.2) ?? { ...tried[0], setup: 'none' as const };
  const { setup, entryType, entry, stop, t1, t2, rr } = pick;

  // ---- Warnings ----
  const warnings: DayPlan['warnings'] = [];
  const atrPct = (A / last) * 100;
  if (atrPct < 1) warnings.push('low_vol');
  if (nextEarningsDate) {
    const d = Math.round((new Date(`${nextEarningsDate.slice(0, 10)}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 864e5);
    if (d >= 0 && d <= 1) warnings.push('earnings');
  }
  if (gapPct !== undefined && Math.abs(gapPct) >= 3) warnings.push('big_gap');
  if (last > R2) warnings.push('extended');

  const plan: DayPlan = {
    session: live ? 'live' : 'next',
    asOf: (lastBar ? new Date(lastBar.t * 1000) : now).toISOString(),
    bias,
    setup,
    entryType,
    entry: r2(entry),
    stop: r2(stop),
    target1: r2(t1),
    target2: r2(t2),
    rr: Math.round(rr * 10) / 10,
    atr: r2(A),
    atrPct: Math.round(atrPct * 100) / 100,
    levels: {
      pivot: r2(P),
      r1: r2(R1),
      r2: r2(R2),
      s1: r2(S1),
      s2: r2(S2),
      prevHigh: r2(H),
      prevLow: r2(L),
      prevClose: r2(C),
      ...(vwap !== undefined ? { vwap: r2(vwap) } : {}),
      ...(open !== undefined ? { open: r2(open), dayHigh: r2(dayHigh!), dayLow: r2(dayLow!) } : {}),
    },
    last: r2(last),
    ...(gapPct !== undefined ? { gapPct: Math.round(gapPct * 100) / 100 } : {}),
    warnings,
    text: { he: { bias: '', entry: '', exit: '' }, en: { bias: '', entry: '', exit: '' } },
  };
  plan.text = explainPlan(plan);
  return plan;
}

/** Plain-language reasoning (Hebrew + English). */
export function explainPlan(p: DayPlan): DayPlan['text'] {
  const L = p.levels;
  const vw = L.vwap !== undefined;
  const riskPct = ((p.entry - p.stop) / p.entry) * 100;
  const t1Pct = ((p.target1 / p.entry - 1) * 100).toFixed(1);

  const biasHe = {
    bullish: p.session === 'live'
      ? `המגמה היום חיובית: המחיר (${usd(p.last)}) נסחר מעל ${vw ? `ה-VWAP (${usd(L.vwap!)}, המחיר הממוצע של היום לפי מחזור)` : 'נקודת הציר'} ומעל נקודת הציר (${usd(L.pivot)}) — הקונים שולטים.`
      : `נטייה חיובית לפתיחה: הסגירה האחרונה (${usd(L.prevClose)}) מעל נקודת הציר (${usd(L.pivot)}) ומעל הממוצע של 20 הימים.`,
    neutral: p.session === 'live'
      ? `אין כיוון ברור היום: המחיר (${usd(p.last)}) קרוב לנקודות האיזון — ${vw ? `VWAP ${usd(L.vwap!)}, ` : ''}ציר ${usd(L.pivot)}.`
      : `נטייה ניטרלית לפתיחה: הסגירה (${usd(L.prevClose)}) בין התמיכה להתנגדות — חכו שהשוק יבחר כיוון.`,
    bearish: p.session === 'live'
      ? `המגמה היום שלילית: המחיר (${usd(p.last)}) מתחת ל${vw ? `VWAP (${usd(L.vwap!)}) ומתחת ל` : ''}נקודת הציר (${usd(L.pivot)}) — המוכרים שולטים, לא כדאי למהר לקנות.`
      : `נטייה שלילית לפתיחה: הסגירה (${usd(L.prevClose)}) מתחת לנקודת הציר ולממוצע של 20 ימים — עדיף לחכות לסימני חוזק.`,
  }[p.bias];
  const biasEn = {
    bullish: p.session === 'live'
      ? `Today's trend is up: price (${usd(p.last)}) trades above ${vw ? `VWAP (${usd(L.vwap!)}, today's volume-weighted average price)` : 'the pivot'} and above the pivot (${usd(L.pivot)}) — buyers are in control.`
      : `Bullish lean into the open: the last close (${usd(L.prevClose)}) is above the pivot (${usd(L.pivot)}) and the 20-day average.`,
    neutral: p.session === 'live'
      ? `No clear direction today: price (${usd(p.last)}) is near the balance points — ${vw ? `VWAP ${usd(L.vwap!)}, ` : ''}pivot ${usd(L.pivot)}.`
      : `Neutral into the open: the close (${usd(L.prevClose)}) sits between support and resistance — let the market pick a side.`,
    bearish: p.session === 'live'
      ? `Today's trend is down: price (${usd(p.last)}) is below ${vw ? `VWAP (${usd(L.vwap!)}) and ` : ''}the pivot (${usd(L.pivot)}) — sellers are in control; no rush to buy.`
      : `Bearish lean into the open: the close (${usd(L.prevClose)}) is below the pivot and the 20-day average — better to wait for strength.`,
  }[p.bias];

  const how = p.entryType === 'limit' ? ['פקודת קנייה מוגבלת (Limit) ב-', 'a limit buy at '] : ['פקודת קנייה בעצירה (Buy Stop) ב-', 'a buy-stop at '];
  const entryHe = {
    pullback: `לא לרדוף אחרי המחיר — לחכות לתיקון אל אזור התמיכה ${usd(p.entry)} (${vw ? 'ה-VWAP / ' : ''}נקודת הציר), שם קונים נוטים להיכנס שוב. ${how[0]}${usd(p.entry)}.`,
    retest: `המניה כבר פרצה מעל ההתנגדות R1 (${usd(L.r1)}). ההתנגדות שנפרצה הופכת לרוב לתמיכה — לחכות לחזרה אליה ולקנות ב-${usd(p.entry)} במקום לקנות בשיא.`,
    breakout: `לקנות רק אם המחיר פורץ מעל ההתנגדות R1 (${usd(L.r1)}) — זה סימן שהקונים התגברו על המוכרים. ${how[0]}${usd(p.entry)}.`,
    range: `המחיר נמוך בתוך טווח המסחר. קנייה ליד התמיכה S1 (${usd(L.s1)}) נותנת סיכון קטן יחסית לרווח האפשרי עד נקודת הציר. ${how[0]}${usd(p.entry)}.`,
    reclaim: `כרגע אין סיבה לקנות. רק אם המחיר חוזר מעל נקודת הציר (${usd(L.pivot)}) — הקונים חוזרים לשליטה. ${how[0]}${usd(p.entry)}.`,
    none: `אין היום עסקה ברורה: המרחק ליעד קטן מדי ביחס לסיכון. כדאי לעקוב ולחכות להזדמנות טובה יותר.`,
  }[p.setup];
  const entryEn = {
    pullback: `Don't chase — wait for a dip into the support zone at ${usd(p.entry)} (${vw ? 'VWAP / ' : ''}pivot), where buyers tend to step back in. Use ${how[1]}${usd(p.entry)}.`,
    retest: `The stock already broke above resistance R1 (${usd(L.r1)}). Broken resistance often turns into support — wait for a pullback and buy at ${usd(p.entry)} instead of buying the high.`,
    breakout: `Buy only if price breaks above resistance R1 (${usd(L.r1)}) — a sign buyers beat the sellers. Use ${how[1]}${usd(p.entry)}.`,
    range: `Price is low in its trading range. Buying near support S1 (${usd(L.s1)}) keeps the risk small versus the move back to the pivot. Use ${how[1]}${usd(p.entry)}.`,
    reclaim: `No reason to buy right now. Only if price climbs back above the pivot (${usd(L.pivot)}) are buyers back in control. Use ${how[1]}${usd(p.entry)}.`,
    none: `No clear trade today: the distance to the target is too small for the risk. Watch and wait for a better setup.`,
  }[p.setup];

  const exitHe =
    p.setup === 'none'
      ? `רמות לשים לב אליהן: תמיכה ${usd(L.s1)}, ציר ${usd(L.pivot)}, התנגדות ${usd(L.r1)}.`
      : `סטופ ב-${usd(p.stop)} (סיכון ${riskPct.toFixed(1)}%) — אם המחיר יורד לשם, הרעיון לא עבד ויוצאים בלי להתווכח. יעד ראשון ${usd(p.target1)} (+${t1Pct}%, ההתנגדות הבאה): מוכרים חצי ומזיזים את הסטופ למחיר הכניסה, כך שהעסקה כבר לא יכולה להפסיד. יעד שני ${usd(p.target2)} לשאר. בכל מקרה סוגרים הכול עד 15:50 שעון ניו יורק — במסחר יומי לא מחזיקים לילה.`;
  const exitEn =
    p.setup === 'none'
      ? `Levels to watch: support ${usd(L.s1)}, pivot ${usd(L.pivot)}, resistance ${usd(L.r1)}.`
      : `Stop at ${usd(p.stop)} (${riskPct.toFixed(1)}% risk) — if price gets there the idea failed; exit without arguing. Target 1 ${usd(p.target1)} (+${t1Pct}%, the next resistance): sell half and move the stop to your entry so the trade can no longer lose. Target 2 ${usd(p.target2)} for the rest. Either way, close everything by 15:50 New York time — day trades are not held overnight.`;

  return { he: { bias: biasHe, entry: entryHe, exit: exitHe }, en: { bias: biasEn, entry: entryEn, exit: exitEn } };
}
