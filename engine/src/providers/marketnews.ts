/**
 * Market "hot news" feed for the home-screen carousel (free RSS, server-side — no CORS needed on GitHub runners).
 *
 * There is no public "most viewed" counter, so heat is estimated the way news desks do it:
 *   1. coverage — how many different major outlets are running the same story right now (clustered headlines)
 *   2. prominence — position in each outlet's own Top Stories feed (editors put the most-read stories first)
 *   3. freshness — exponential decay, half-life 6 hours
 *   4. outlet weight — tier-1 financial outlets count more
 */
import { cleanCompanyName } from './googlenews.js';
import type { HotNews } from '../types.js';
export type { HotNews };

const UA = { 'User-Agent': 'Mozilla/5.0 (VOLTIX news engine)' };
const gn = (q: string) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

/** Feeds: each outlet's Top Stories / Markets section, plus Google News for outlets without public RSS. */
export const FEEDS: { url: string; source?: string; weight: number }[] = [
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114', source: 'CNBC', weight: 1 },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258', source: 'CNBC', weight: 1 },
  { url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', source: 'MarketWatch', weight: 1 },
  { url: 'https://feeds.content.dowjones.io/public/rss/mw_marketpulse', source: 'MarketWatch', weight: 0.8 },
  { url: gn('site:finance.yahoo.com when:1d'), weight: 0.9 },
  { url: 'https://www.investing.com/rss/news_25.rss', source: 'Investing.com', weight: 0.7 },
  { url: 'https://seekingalpha.com/market_currents.xml', source: 'Seeking Alpha', weight: 0.7 },
  // Google News "Business" top stories (Reuters, Bloomberg, WSJ, FT, AP… ranked by Google's prominence)
  { url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en', weight: 1.2 },
  { url: gn('stock market when:1d'), weight: 1 },
  { url: gn('site:bloomberg.com markets when:1d'), weight: 1 },
  { url: gn('site:reuters.com markets when:1d'), weight: 1 },
  { url: gn('site:wsj.com markets when:1d'), weight: 1 },
  { url: gn('site:ft.com markets when:1d'), weight: 0.9 },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839135', source: 'CNBC', weight: 0.9 }, // earnings
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664', source: 'CNBC', weight: 0.9 }, // finance
  { url: 'https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines', source: 'MarketWatch', weight: 0.7 },
  { url: gn('site:apnews.com business when:1d'), weight: 0.9 },
  { url: gn('site:barrons.com when:1d'), weight: 0.9 },
  { url: gn('site:economist.com finance when:2d'), weight: 0.7 },
  { url: gn('site:axios.com markets when:1d'), weight: 0.7 },
  { url: gn('site:foxbusiness.com markets when:1d'), weight: 0.7 },
  { url: gn('site:cnn.com business markets when:1d'), weight: 0.7 },
  { url: gn('site:fortune.com finance when:1d'), weight: 0.6 },
  { url: gn('site:businessinsider.com markets when:1d'), weight: 0.6 },
  { url: gn('site:forbes.com markets when:1d'), weight: 0.5 },
  { url: gn('site:benzinga.com when:1d'), weight: 0.5 },
  { url: gn('site:morningstar.com when:2d'), weight: 0.5 },
  { url: gn('site:fool.com when:1d'), weight: 0.4 },
  { url: gn('federal reserve OR inflation OR "jobs report" OR tariffs when:1d'), weight: 1 },
  { url: gn('earnings guidance stock when:1d'), weight: 0.8 },
];

/** Market-impact topics (first match wins for the label; weight = how much the topic moves the whole market). */
export const TOPICS: { key: string; weight: number; re: RegExp }[] = [
  { key: 'macro', weight: 1, re: /\b(fed|federal reserve|powell|fomc|rate (cut|hike)s?|interest rates?|inflation|cpi|pce|jobs report|payrolls|unemployment|jobless|gdp|recession|treasury yields?|bond yields?|10-year)\b/i },
  { key: 'policy', weight: 0.85, re: /\b(tariffs?|trade (war|deal|talks)|sanctions?|export controls?|white house|congress|shutdown|debt ceiling|stimulus|tax (bill|cut)s?|regulators?|antitrust|sec\b)/i },
  { key: 'indices', weight: 0.8, re: /\b(s&p 500|nasdaq|dow( jones)?|wall street|stock market|stocks (rally|fall|slide|drop|jump|surge|tumble|rise|sink)|record high|sell-?off|futures)\b/i },
  { key: 'energy', weight: 0.75, re: /\b(oil|crude|opec|brent|natural gas|gasoline)\b/i },
  { key: 'geo', weight: 0.7, re: /\b(war|ukraine|russia|china|taiwan|middle east|iran|israel|missile|ceasefire)\b/i },
  { key: 'earnings', weight: 0.6, re: /\b(earnings|quarterly|revenue|profit|guidance|forecast|results|beats?|miss(es)?|outlook)\b/i },
  { key: 'deals', weight: 0.55, re: /\b(merger|acquir(e|es|ed|ing)|acquisition|buyout|takeover|deal|ipo|stake)\b/i },
  { key: 'tech', weight: 0.5, re: /\b(ai|chips?|semiconductors?|cloud|data[- ]cent(er|re))\b/i },
  { key: 'crypto', weight: 0.4, re: /\b(bitcoin|crypto|ether(eum)?)\b/i },
];
const MEGA = new Set(['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'GOOG', 'AMZN', 'META', 'TSLA', 'AVGO', 'BRK.B', 'JPM', 'LLY', 'V', 'WMT', 'XOM', 'MA', 'ORCL', 'NFLX', 'COST', 'UNH']);

const TIER1 = /reuters|bloomberg|wall street journal|wsj|financial times|cnbc|marketwatch|barron|associated press|yahoo finance|the economist|axios|new york times/i;

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&#x2019;/gi, '’')
    .replace(/&#x201[cd];/gi, '"')
    .replace(/&#8217;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#821[12];/g, '–')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

interface Raw {
  title: string;
  url: string;
  source: string;
  at: number;
  pos: number; // position in its feed (0 = top)
  weight: number;
}

export function parseRss(xml: string, fallbackSource: string | undefined, weight: number): Raw[] {
  const out: Raw[] = [];
  let pos = 0;
  for (const m of xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/g)) {
    const it = m[1];
    const get = (tag: string) => decode(it.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? '');
    const src = get('source') || fallbackSource || '';
    let title = get('title');
    if (src && title.endsWith(` - ${src}`)) title = title.slice(0, -(src.length + 3));
    const at = new Date(get('pubDate') || get('dc:date')).getTime();
    const url = get('link') || it.match(/<link[^>]*href="([^"]+)"/)?.[1] || '';
    if (!title || !url || !src || Number.isNaN(at)) continue;
    out.push({ title, url, source: src, at, pos: pos++, weight });
  }
  return out;
}

const STOP = new Set(
  'a an the of to in on for and or as at by with from is are be its it this that after amid over under into vs new says say said will may could stock stocks shares market markets wall street us u.s. report reports buy sell better best top which why what how here now today should can this week year 2025 2026 2027 just big more than you your'.split(
    ' ',
  ),
);
const tokens = (t: string) =>
  new Set(
    t
      .toLowerCase()
      .replace(/[’']s\b/g, '')
      .replace(/[^a-z0-9$%.]+/g, ' ')
      .split(' ')
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
/** Same story = at least 3 shared meaningful words AND they make up half of the shorter headline. */
function similar(a: Set<string>, b: Set<string>) {
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter >= 3 ? inter / Math.max(1, Math.min(a.size, b.size)) : 0;
}

/** Keep the carousel about money: markets, companies, economy. */
const FINANCE =
  /\b(stocks?|shares?|market|nasdaq|dow|s&p|index|futures|earnings|revenue|profit|sales|guidance|forecast|investors?|analysts?|ipo|merger|acquisition|acquire|deal|buyout|stake|valuation|fed|federal reserve|rates?|inflation|cpi|jobs report|payrolls|gdp|economy|economic|recession|tariffs?|trade|treasur(y|ies)|bonds?|yields?|dollar|currency|oil|crude|gold|bitcoin|crypto|bank|banks|lender|billion|million|fine[sd]?|antitrust|sec|ceo|layoffs?|dividend|buyback|rally|selloff|sell-off|slump|selloff)\b|\$\d|\d%/i;

/** S&P 500 names that are also everyday words — matched only via an explicit ticker like (TGT). */
const GENERIC_NAMES = /^(Target|Ball|Block|Progressive|Southern|Public Storage|General Mills|Match Group|Fox|News|Booking|Equity Residential|Realty Income|Gap)$/;

/** How headlines usually name the biggest companies. */
const ALIASES: Record<string, string> = {
  META: 'Meta', GOOGL: 'Google|Alphabet', GOOG: 'Google|Alphabet', AMZN: 'Amazon', MSFT: 'Microsoft', AAPL: 'Apple', NVDA: 'Nvidia',
  TSLA: 'Tesla', 'BRK.B': 'Berkshire', JPM: 'JPMorgan', GS: 'Goldman', MS: 'Morgan Stanley', BAC: 'Bank of America', WFC: 'Wells Fargo',
  C: 'Citigroup|Citi', AVGO: 'Broadcom', AMD: 'AMD', INTC: 'Intel', NFLX: 'Netflix', DIS: 'Disney', WMT: 'Walmart', KO: 'Coca-Cola',
  XOM: 'Exxon', CVX: 'Chevron', BA: 'Boeing', UNH: 'UnitedHealth', LLY: 'Eli Lilly|Lilly', PFE: 'Pfizer', MRK: 'Merck', ORCL: 'Oracle',
  CRM: 'Salesforce', PLTR: 'Palantir', COST: 'Costco', HD: 'Home Depot', MCD: "McDonald's", NKE: 'Nike', SBUX: 'Starbucks', UBER: 'Uber',
  PYPL: 'PayPal', V: 'Visa', MA: 'Mastercard', T: 'AT&T', VZ: 'Verizon', CMCSA: 'Comcast', GE: 'GE Aerospace', F: 'Ford', GM: 'General Motors',
};

const JUNK = /^(live:|watch:|video:|podcast|newsletter|opinion:|quiz|crossword|horoscope)|sponsored|stock price|price target & analyst|^(I|I['’]m|My|We|We['’]re)\b.*\?$|\bam I wrong\b|\bshould I\b|\bmy (husband|wife|father|mother|son|daughter|kids?)\b|\bI inherited\b/i;

interface Story {
  rep: Raw;
  outlets: string[];
  heatRaw: number;
  impactRaw: number;
  category: string;
  newest: number;
  tickers: string[];
}

/** Cluster headlines into stories and score each for heat (buzz) and market impact. */
export function buildStories(items: Raw[], now: number, companies: { symbol: string; name: string }[]): Story[] {
  const fresh = items.filter((r) => now - r.at < 36 * 3600e3 && r.at - now < 3600e3 && !JUNK.test(r.title));
  // The headline we would show must itself be about money (not just one syndicated variant)
  const financial = (c: { raws: Raw[] }) => c.raws.filter((r) => FINANCE.test(r.title)).length * 2 >= c.raws.length;
  const clusters: { raws: Raw[]; tok: Set<string> }[] = [];
  for (const r of fresh.sort((a, b) => b.at - a.at)) {
    const tok = tokens(r.title);
    if (tok.size < 3) continue;
    const c = clusters.find((c) => similar(c.tok, tok) >= 0.5);
    if (c) c.raws.push(r);
    else clusters.push({ raws: [r], tok });
  }

  const names = companies
    .map((c) => {
      const alias = ALIASES[c.symbol];
      const name = cleanCompanyName(c.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return { symbol: c.symbol, re: new RegExp(`(?<![\\w&])(?:${alias ? `${alias}|` : ''}${name})(?![\\w&])`) }; // case-sensitive: names are capitalised
    })
    .filter((c) => c.re.source.length > 6 && !GENERIC_NAMES.test(cleanCompanyName(companies.find((x) => x.symbol === c.symbol)!.name)));
  const symbols = new Set(companies.map((c) => c.symbol));

  return clusters.filter(financial).map((c) => {
    const outlets = [...new Set(c.raws.map((r) => r.source))];
    const coverage = outlets.reduce((a, o) => a + (TIER1.test(o) ? 1.5 : 1), 0);
    const prominence = Math.max(...c.raws.map((r) => r.weight * Math.max(0, 1 - r.pos / 25)));
    const newest = Math.max(...c.raws.map((r) => r.at));
    const freshness = Math.pow(0.5, (now - newest) / (6 * 3600e3));
    const heatRaw = (coverage * 1.2 + prominence * 2) * (0.35 + 0.65 * freshness);
    // Representative headline: tier-1 outlet first, then the most prominent, then newest
    const rep = [...c.raws].sort((a, b) => Number(TIER1.test(b.source)) - Number(TIER1.test(a.source)) || a.pos - b.pos || b.at - a.at)[0];
    const explicit = [...rep.title.matchAll(/[($]([A-Z]{1,5}(?:\.[A-Z])?)\)?/g)].map((m) => m[1]).filter((x) => symbols.has(x));
    const tickers = [...new Set([...explicit, ...names.filter((n) => n.re.test(rep.title)).map((n) => n.symbol)])].slice(0, 4);
    // Market impact: topic weight (how broadly it moves stocks) × breadth of coverage × freshness, plus mega-cap weight
    const text = c.raws.map((r) => r.title).join(' | ');
    const topic = TOPICS.find((t) => t.re.test(text));
    const topicW = topic?.weight ?? 0.3;
    const mega = tickers.some((t) => MEGA.has(t)) ? 0.3 : tickers.length ? 0.1 : 0;
    const breadth = Math.min(1, coverage / 6);
    const impactRaw = (topicW + mega) * (0.45 + 0.55 * breadth) * (0.4 + 0.6 * freshness) * (0.8 + 0.2 * prominence);
    return { rep, outlets, heatRaw, impactRaw, category: topic?.key ?? (tickers.length ? 'company' : 'markets'), newest, tickers };
  });
}

const toNews = (s: Story, heatMax: number, impactMax: number): HotNews => ({
  id: Buffer.from(s.rep.url).toString('base64url').slice(-16),
  title: s.rep.title,
  url: s.rep.url,
  source: s.rep.source,
  publishedAt: new Date(s.newest).toISOString(),
  outlets: s.outlets,
  heat: Math.max(1, Math.round((s.heatRaw / heatMax) * 100)),
  impact: Math.max(1, Math.round((s.impactRaw / impactMax) * 100)),
  category: s.category,
  tickers: s.tickers,
});

export function rankHotNews(items: Raw[], now: number, companies: { symbol: string; name: string }[], limit = 12): HotNews[] {
  return rankNews(items, now, companies, limit, 0).hot;
}

/** hot = carousel (by buzz); impact = News page (by market impact). */
export function rankNews(items: Raw[], now: number, companies: { symbol: string; name: string }[], hotN = 12, impactN = 40) {
  const stories = buildStories(items, now, companies);
  const heatMax = Math.max(1e-9, ...stories.map((s) => s.heatRaw));
  const impactMax = Math.max(1e-9, ...stories.map((s) => s.impactRaw));
  const hot = [...stories].sort((a, b) => b.heatRaw - a.heatRaw).slice(0, hotN).map((s) => toNews(s, heatMax, impactMax));
  const impact = [...stories].sort((a, b) => b.impactRaw - a.impactRaw).slice(0, impactN).map((s) => toNews(s, heatMax, impactMax));
  return { hot, impact };
}

/** Free translation endpoints, tried in order (each may rate-limit a shared CI address). */
const TRANSLATORS: ((texts: string[]) => Promise<string[]>)[] = [
  // Google web endpoint (batched with newlines)
  async (texts) => {
    const q = texts.join('\n');
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=iw&dt=t&q=${encodeURIComponent(q)}`, { headers: UA, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`gtx ${res.status}`);
    const data = (await res.json()) as [[string, string][]];
    return data[0].map((seg) => seg[0]).join('').split('\n');
  },
  // Google dictionary-extension endpoint (array in, array out)
  async (texts) => {
    const qs = texts.map((t) => `q=${encodeURIComponent(t)}`).join('&');
    const res = await fetch(`https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=iw&${qs}`, { headers: UA, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`dict ${res.status}`);
    const data = (await res.json()) as (string | [string, string])[];
    return data.map((x) => (Array.isArray(x) ? x[0] : x));
  },
  // MyMemory (one request per headline)
  async (texts) => {
    const out: string[] = [];
    for (const t of texts) {
      const res = await fetch(`https://api.mymemory.translated.net/get?langpair=en|he&q=${encodeURIComponent(t)}`, { headers: UA, signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`mymemory ${res.status}`);
      const j = (await res.json()) as { responseStatus: number; responseData?: { translatedText?: string } };
      if (j.responseStatus !== 200) throw new Error(`mymemory ${j.responseStatus}`);
      out.push(j.responseData?.translatedText ?? '');
    }
    return out;
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Translate headlines to Hebrew, cached by story id across runs (so each headline is translated once).
 * Small batches, a pause between them, and fallback services when one is rate-limited; English stays if all fail.
 */
export async function translateTitles(news: HotNews[], cache: Map<string, string>, log: (s: string) => void = () => {}) {
  for (const n of news) if (cache.has(n.id)) n.titleHe = cache.get(n.id);
  const todo = [...new Map(news.filter((n) => !n.titleHe).map((n) => [n.id, n])).values()];
  let tr = 0;
  let done = 0;
  for (let i = 0; i < todo.length && tr < TRANSLATORS.length; ) {
    const batch = todo.slice(i, i + 8);
    try {
      const out = await TRANSLATORS[tr](batch.map((n) => n.title.replace(/\n/g, ' ')));
      batch.forEach((n, j) => {
        const he = out[j]?.trim();
        if (he && /[\u0590-\u05FF]/.test(he)) {
          cache.set(n.id, he);
          done++;
        }
      });
      i += batch.length;
      await sleep(400);
    } catch (e) {
      log(`translate: ${(e as Error).message} — trying next service`);
      tr++;
    }
  }
  for (const n of news) if (cache.has(n.id)) n.titleHe = cache.get(n.id);
  log(`translated ${done} new headlines (${todo.length} needed)`);
}

export async function loadMarketNews(
  companies: { symbol: string; name: string }[],
  log: (s: string) => void = () => {},
  translations: Map<string, string> = new Map(),
): Promise<{ hot: HotNews[]; impact: HotNews[] }> {
  const all: Raw[] = [];
  await Promise.all(
    FEEDS.map(async (f) => {
      try {
        const res = await fetch(f.url, { headers: UA, signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(String(res.status));
        const items = parseRss(await res.text(), f.source, f.weight);
        all.push(...items);
      } catch (e) {
        log(`news feed failed (${f.source ?? 'google'}): ${(e as Error).message}`);
      }
    }),
  );
  const ranked = rankNews(all, Date.now(), companies);
  await translateTitles([...ranked.hot, ...ranked.impact], translations, log);
  log(`news: ${all.length} headlines from ${new Set(all.map((r) => r.source)).size} outlets → ${ranked.hot.length} hot, ${ranked.impact.length} by impact`);
  return ranked;
}
