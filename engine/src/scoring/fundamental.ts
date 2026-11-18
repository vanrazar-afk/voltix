import type { Factor, Fundamentals, PillarResult } from '../types.js';
import { clamp, round } from '../indicators.js';
import { FUND_MAX } from './technical.js';

export interface SectorContext {
  pe: number | null; // sector median trailing P/E (positive earners only)
  netMargin: number | null;
  revenueGrowthYoY: number | null;
}

const pct = (x: number | null, d = 1) => (x === null ? 'אין נתון' : `${round(x * 100, d)}%`);

/**
 * Fundamental pillar (max 33.33 points) — evaluated RELATIVE to the stock's sector
 * so a 30 P/E software company is not punished vs a 10 P/E bank.
 *
 *  P/E relative to sector median        25
 *  PEG                                  15
 *  Revenue growth vs sector             15
 *  EPS growth                           10
 *  Net margin vs sector                 10
 *  Debt / Equity                        10
 *  Free-cash-flow yield                 10
 *  ROE                                   5
 *
 * Earnings-proximity risk: an upcoming quarterly report adds event risk (gaps of ±10% are common),
 * so the pillar is reduced in proportion to how close the report is — up to −50% of the earned
 * points on report day, fading linearly to 0 at EARNINGS_WINDOW_DAYS days out.
 */
export const EARNINGS_WINDOW_DAYS = 30;
export const EARNINGS_MAX_CUT = 0.5;

/** Whole calendar days from asOf (US market date) to the report date; null if unknown or already past. */
export function daysToEarnings(date: string | null, asOf: Date): number | null {
  if (!date) return null;
  const today = new Date(asOf.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) + 'T00:00:00Z').getTime();
  const d = Math.round((new Date(`${date.slice(0, 10)}T00:00:00Z`).getTime() - today) / 864e5);
  return d >= 0 ? d : null;
}

export function earningsCut(days: number | null): number {
  if (days === null || days >= EARNINGS_WINDOW_DAYS) return 0;
  return EARNINGS_MAX_CUT * (1 - days / EARNINGS_WINDOW_DAYS);
}

export function scoreFundamental(f: Fundamentals, sector: SectorContext, sectorName: string, asOf: Date = new Date()): PillarResult {
  const factors: Factor[] = [];

  // P/E relative
  {
    let pts = 0;
    let v = 'אין נתון';
    if (f.pe !== null && f.pe <= 0) {
      v = 'הפסדית';
    } else if (f.pe !== null) {
      const rel = sector.pe ? f.pe / sector.pe : null;
      v = `${round(f.pe, 1)}${sector.pe ? ` (ענף ${round(sector.pe, 1)})` : ''}`;
      if (rel === null) pts = f.pe < 20 ? 15 : f.pe < 35 ? 8 : 2;
      else if (rel <= 0.7) pts = 25;
      else if (rel <= 0.9) pts = 20;
      else if (rel <= 1.1) pts = 14;
      else if (rel <= 1.4) pts = 7;
      else pts = 2;
    }
    factors.push({ key: 'pe', label: 'מכפיל רווח (P/E) מול הענף', value: v, points: pts, max: 25, signal: sig(pts, 25) });
  }

  // PEG
  {
    let pts = 0;
    if (f.peg !== null && f.peg > 0) pts = f.peg <= 1 ? 15 : f.peg <= 1.5 ? 10 : f.peg <= 2.5 ? 5 : 1;
    factors.push({ key: 'peg', label: 'PEG (מכפיל/צמיחה)', value: f.peg !== null ? `${round(f.peg, 2)}` : 'אין נתון', points: pts, max: 15, signal: sig(pts, 15) });
  }

  // Revenue growth vs sector
  {
    let pts = 0;
    const g = f.revenueGrowthYoY;
    if (g !== null) {
      const base = sector.revenueGrowthYoY ?? 0.05;
      if (g >= base + 0.1) pts = 15;
      else if (g >= base) pts = 11;
      else if (g >= 0) pts = 6;
      else pts = 0;
    }
    factors.push({ key: 'rev', label: 'צמיחה בהכנסות (שנתי)', value: pct(g), points: pts, max: 15, signal: sig(pts, 15) });
  }

  // EPS growth
  {
    const g = f.epsGrowthYoY;
    const pts = g === null ? 0 : g >= 0.2 ? 10 : g >= 0.08 ? 7 : g >= 0 ? 4 : 0;
    factors.push({ key: 'eps', label: 'צמיחה ברווח למניה', value: pct(g), points: pts, max: 10, signal: sig(pts, 10) });
  }

  // Net margin vs sector
  {
    const m = f.netMargin;
    let pts = 0;
    if (m !== null) {
      const base = sector.netMargin ?? 0.08;
      pts = m >= base * 1.3 ? 10 : m >= base ? 7 : m > 0 ? 3 : 0;
    }
    factors.push({ key: 'margin', label: 'שולי רווח נקי מול הענף', value: pct(m), points: pts, max: 10, signal: sig(pts, 10) });
  }

  // Debt/Equity — financials naturally carry leverage, soften there
  {
    const d = f.debtToEquity;
    const fin = /financ/i.test(sectorName);
    let pts = 0;
    if (d !== null) {
      if (fin) pts = d < 3 ? 8 : 4;
      else pts = d < 0.5 ? 10 : d < 1 ? 7 : d < 2 ? 3 : 0;
    }
    factors.push({ key: 'de', label: 'חוב להון', value: d !== null ? `${round(d, 2)}` : 'אין נתון', points: pts, max: 10, signal: sig(pts, 10) });
  }

  // FCF yield
  {
    const y = f.fcfYield;
    const pts = y === null ? 0 : y >= 0.06 ? 10 : y >= 0.03 ? 7 : y > 0 ? 4 : 0;
    factors.push({ key: 'fcf', label: 'תשואת תזרים חופשי', value: pct(y), points: pts, max: 10, signal: sig(pts, 10) });
  }

  // ROE
  {
    const r = f.roe;
    const pts = r === null ? 0 : r >= 0.2 ? 5 : r >= 0.1 ? 3 : r > 0 ? 1 : 0;
    factors.push({ key: 'roe', label: 'תשואה על ההון (ROE)', value: pct(r), points: pts, max: 5, signal: sig(pts, 5) });
  }

  // Re-weight to round professional weights (total 30):
  // valuation 10 (P/E vs sector 6, PEG 4) · growth 10 (revenue 5, EPS 5) · quality 10 (margin 3, ROE 3, FCF 2, debt 2)
  const W: Record<string, number> = { pe: 6, peg: 4, rev: 5, eps: 5, margin: 3, roe: 3, fcf: 2, de: 2 };
  for (const x of factors) {
    const w = W[x.key];
    if (w === undefined || !x.max) continue;
    x.points = Math.round((x.points / x.max) * w * 2) / 2;
    x.max = w;
    x.signal = sig(x.points, w);
  }
  factors.sort((a, b) => Object.keys(W).indexOf(a.key) - Object.keys(W).indexOf(b.key));

  // Earnings proximity (negative-only factor)
  {
    const days = daysToEarnings(f.nextEarningsDate, asOf);
    const before = factors.reduce((a, x) => a + x.points, 0);
    const cut = Math.round(before * earningsCut(days) * 10) / 10;
    const when = days === null ? 'לא ידוע / רחוק' : days === 0 ? 'היום' : days === 1 ? 'מחר' : `בעוד ${days} ימים`;
    factors.push({ key: 'earnings', label: 'קרבה לדוח רבעוני (סיכון)', value: when, points: -cut, max: 0, signal: cut >= 4 ? 'negative' : cut > 0 ? 'neutral' : 'positive' });
  }

  const score = round(clamp(factors.reduce((a, x) => a + x.points, 0), 0, FUND_MAX), 1);
  return { score, factors, summary: fundamentalSummary(factors, score, sectorName) };
}

function sig(pts: number, max: number): Factor['signal'] {
  const r = pts / max;
  return r >= 0.6 ? 'positive' : r >= 0.3 ? 'neutral' : 'negative';
}

export const SECTOR_HE: Record<string, string> = {
  Technology: 'הטכנולוגיה',
  'Communication Services': 'התקשורת',
  'Consumer Cyclical': 'הצריכה המחזורית',
  'Consumer Defensive': 'הצריכה הבסיסית',
  'Financial Services': 'הפיננסים',
  Healthcare: 'הבריאות',
  Energy: 'האנרגיה',
  Industrials: 'התעשייה',
  'Basic Materials': 'חומרי הגלם',
  'Real Estate': 'הנדל"ן',
  Utilities: 'התשתיות',
};

function fundamentalSummary(f: Factor[], score: number, _sectorEn: string): string {
  const g = (k: string) => f.find((x) => x.key === k);
  const part = (keys: string[]) => {
    const got = keys.map(g).filter(Boolean) as Factor[];
    const max = got.reduce((a, x) => a + x.max, 0) || 1;
    return got.reduce((a, x) => a + x.points, 0) / max;
  };
  const v = part(['pe', 'peg']);
  const gr = part(['rev', 'eps']);
  const q = part(['margin', 'roe', 'fcf', 'de']);
  const word = (r: number, hi: string, mid: string, lo: string) => (r >= 0.65 ? hi : r >= 0.35 ? mid : lo);
  const s = [word(v, 'תמחור אטרקטיבי', 'תמחור הוגן', 'תמחור יקר'), word(gr, 'צמיחה חזקה', 'צמיחה מתונה', 'צמיחה חלשה'), word(q, 'עסק איכותי', 'איכות בינונית', 'איכות נמוכה')];
  const e = g('earnings');
  if (e && e.points < 0) s.push(`דוח ${e.value}`);
  return s.join(' · ');
}
