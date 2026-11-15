// Mirror of engine/src/types.ts — keep in sync.

export interface Candle {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Fundamentals {
  pe: number | null; // trailing P/E
  forwardPe: number | null;
  peg: number | null;
  revenueGrowthYoY: number | null; // 0.12 = 12%
  epsGrowthYoY: number | null;
  netMargin: number | null; // 0.2 = 20%
  roe: number | null;
  debtToEquity: number | null;
  fcfYield: number | null; // free cash flow / market cap
  marketCap: number | null;
  analystTarget: number | null; // consensus price target
  nextEarningsDate: string | null;
}

export interface NewsItem {
  headline: string;
  source: string; // normalized source key, e.g. "reuters"
  url: string;
  datetime: string; // ISO
  summary?: string;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  exchange: string;
}

/** Price history for the range chart: [unix seconds, price] pairs. */
export type Series = [number, number][];
/** 15-minute intraday bar (t = unix seconds). */
export interface Bar {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface ChartSet {
  intraday: Series; // last ~5 sessions, 15-minute bars (→ 1D and 5D ranges)
  weekly: Series; // ~5 years, weekly closes (→ 5Y range)
  bars?: Bar[]; // the same intraday period with OHLCV (for the day-trading plan; not written to chart files)
}

export interface StockInput {
  profile: CompanyProfile;
  candles: Candle[]; // oldest -> newest, >= 260 trading days recommended
  fundamentals: Fundamentals;
  news: NewsItem[];
  charts?: ChartSet;
}

/** data/charts/<SYMBOL>.json — one small file per stock, loaded when its page opens. */
export interface ChartFile {
  symbol: string;
  updatedAt: string;
  intraday: Series;
  daily: Series; // ~1 year of daily closes (→ 1M, 6M, YTD, 1Y)
  weekly: Series;
}

export interface Factor {
  key: string;
  label: string; // Hebrew label shown in the app table
  value: string; // human-readable value
  points: number; // earned
  max: number; // possible
  signal: 'positive' | 'neutral' | 'negative';
}

export interface PillarResult {
  score: number; // 0 .. 33.33
  factors: Factor[];
  summary: string; // Hebrew analyst-style summary
}

export interface ScoredNews extends NewsItem {
  publisher?: string; // display name
  sentiment: number; // -1 .. 1
  label: 'positive' | 'neutral' | 'negative';
}

export interface SentimentResult extends PillarResult {
  articles: ScoredNews[];
  positive: number;
  negative: number;
  neutral: number;
  sourcesCovered: string[];
}

export interface Levels {
  entry: number; // last close
  target: number; // technical exit (take-profit)
  stop: number; // risk level
  riskReward: number;
  atr: number;
  method: string; // Hebrew explanation
}

export interface StockScore {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  changePct: number; // last day %
  score: number; // 1..100
  rank: number;
  prevRank: number | null;
  prevScore: number | null;
  technical: PillarResult;
  fundamental: PillarResult;
  sentiment: SentimentResult;
  levels: Levels;
  sparkline: number[]; // last 60 closes
  flags: string[]; // e.g. "earnings_soon", "low_news_coverage"
  analystTarget: number | null;
  nextEarningsDate: string | null;
  dayPlan?: DayPlan | null; // intraday (same-day) trading plan
}

/** Same-day trading plan: entry, stop, targets and the reasoning (long side only, educational). */
export interface DayPlan {
  session: 'live' | 'next'; // live = for today's session (market open); next = for the next session
  asOf: string; // ISO time of the data used
  bias: 'bullish' | 'neutral' | 'bearish';
  setup: 'pullback' | 'retest' | 'breakout' | 'range' | 'reclaim' | 'none';
  entryType: 'limit' | 'stop'; // limit = buy at or below; stop = buy only once price trades at/above
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  rr: number; // reward:risk to target1
  atr: number; // daily ATR(14)
  atrPct: number;
  levels: { pivot: number; r1: number; r2: number; s1: number; s2: number; prevHigh: number; prevLow: number; prevClose: number; vwap?: number; open?: number; dayHigh?: number; dayLow?: number };
  last: number;
  gapPct?: number;
  warnings: ('low_vol' | 'earnings' | 'big_gap' | 'extended')[];
  text: { he: { bias: string; entry: string; exit: string }; en: { bias: string; entry: string; exit: string } };
}

/** A hot market story for the home-screen news carousel. */
export interface HotNews {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  outlets: string[];
  heat: number; // 0–100 (buzz)
  impact?: number; // 0–100 (estimated market impact)
  category?: string; // macro | policy | indices | energy | geo | earnings | deals | tech | crypto | company | markets
  titleHe?: string; // Hebrew translation
  whyHe?: string; // one simple sentence: how this may affect the market / the stock
  whyEn?: string;
  dir?: 'up' | 'down' | 'neutral'; // likely direction of the effect (from the headline wording)
  tickers: string[];
}

/** Compact ranking row for every scored stock (the full analysis lives in data/stocks/<SYMBOL>.json). */
export interface RankEntry {
  symbol: string;
  rank: number;
  score: number;
  t: number; // technical pillar
  f: number; // fundamental pillar
  s: number; // sentiment pillar
  prevRank: number | null;
}

export interface DailyReport {
  generatedAt: string;
  asOf: string; // market date of the last candle
  methodologyVersion: string;
  universeSize: number;
  top: StockScore[]; // top 50 (full detail)
  ranks?: RankEntry[]; // ALL scored stocks, best first (S&P 500)
  mode?: 'full' | 'quick'; // quick = prices/technicals refreshed, news & fundamentals from the last full run
  fullAt?: string; // when news & fundamentals were last fetched
  hotNews?: HotNews[]; // hottest market stories right now (refreshed every run)
  marketNews?: HotNews[]; // News page: stories ranked by market impact
  newsAt?: string; // when the news sweep last ran (every ~20 minutes)
  quotes: Record<string, { price: number; changePct: number; name: string; sector?: string }>; // whole universe (S&P 500)
  sectorMedians: Record<string, { pe: number | null; netMargin: number | null; revenueGrowthYoY: number | null }>;
  disclaimer: string;
  source?: 'demo' | 'live-snapshot' | 'live';
  dataProvider?: string;
}
