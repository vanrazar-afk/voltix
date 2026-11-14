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
  { url: 'https://finance.yahoo.com/news/rssindex', source: 'Yahoo Finance', weight: 0.9 },
  { url: 'https://www.investing.com/rss/news_25.rss', source: 'Investing.com', weight: 0.7 },
  { url: 'https://seekingalpha.com/market_currents.xml', source: 'Seeking Alpha', weight: 0.7 },
  // Google News "Business" top stories (Reuters, Bloomberg, WSJ, FT, AP… ranked by Google's prominence)
  { url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en', weight: 1.2 },
  { url: gn('stock market when:1d'), weight: 1 },
  { url: gn('site:bloomberg.com markets when:1d'), weight: 1 },
  { url: gn('site:reuters.com markets when:1d'), weight: 1 },
  { url: gn('site:wsj.com markets when:1d'), weight: 1 },
  { url: gn('site:ft.com markets when:1d'), weight: 0.9 },
];

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
  'a an the of to in on for and or as at by with from is are be its it this that after amid over under into vs new says say said will may could stock stocks shares market markets wall street us u.s. report reports'.split(
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
function similar(a: Set<string>, b: Set<string>) {
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / Math.max(1, Math.min(a.size, b.size));
}

const JUNK = /^(live:|watch:|video:|podcast|newsletter|opinion:|quiz|crossword|horoscope)|sponsored|stock price|price target & analyst/i;

export function rankHotNews(items: Raw[], now: number, companies: { symbol: string; name: string }[], limit = 12): HotNews[] {
  const fresh = items.filter((r) => now - r.at < 36 * 3600e3 && r.at - now < 3600e3 && !JUNK.test(r.title));
  const clusters: { raws: Raw[]; tok: Set<string> }[] = [];
  for (const r of fresh.sort((a, b) => b.at - a.at)) {
    const tok = tokens(r.title);
    if (tok.size < 3) continue;
    const c = clusters.find((c) => similar(c.tok, tok) >= 0.5);
    if (c) c.raws.push(r);
    else clusters.push({ raws: [r], tok });
  }

  const names = companies
    .map((c) => ({ symbol: c.symbol, re: new RegExp(`\\b${cleanCompanyName(c.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i') }))
    .filter((c) => c.re.source.length > 6);

  const scored = clusters.map((c) => {
    const outlets = [...new Set(c.raws.map((r) => r.source))];
    const coverage = outlets.reduce((a, o) => a + (TIER1.test(o) ? 1.5 : 1), 0);
    const prominence = Math.max(...c.raws.map((r) => r.weight * Math.max(0, 1 - r.pos / 25)));
    const newest = Math.max(...c.raws.map((r) => r.at));
    const freshness = Math.pow(0.5, (now - newest) / (6 * 3600e3));
    const raw = (coverage * 1.2 + prominence * 2) * (0.35 + 0.65 * freshness);
    // Representative headline: tier-1 outlet first, then the most prominent, then newest
    const rep = [...c.raws].sort(
      (a, b) => Number(TIER1.test(b.source)) - Number(TIER1.test(a.source)) || a.pos - b.pos || b.at - a.at,
    )[0];
    const text = c.raws.map((r) => r.title).join(' | ');
    const tickers = names.filter((n) => n.re.test(text)).map((n) => n.symbol).slice(0, 4);
    return { rep, outlets, raw, newest, tickers };
  });

  scored.sort((a, b) => b.raw - a.raw);
  const top = scored.slice(0, limit);
  const max = top[0]?.raw || 1;
  return top.map((s) => ({
    id: Buffer.from(s.rep.url).toString('base64url').slice(-16),
    title: s.rep.title,
    url: s.rep.url,
    source: s.rep.source,
    publishedAt: new Date(s.newest).toISOString(),
    outlets: s.outlets,
    heat: Math.max(1, Math.round((s.raw / max) * 100)),
    tickers: s.tickers,
  }));
}

export async function loadHotNews(companies: { symbol: string; name: string }[], log: (s: string) => void = () => {}): Promise<HotNews[]> {
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
  const ranked = rankHotNews(all, Date.now(), companies);
  log(`hot news: ${all.length} headlines → ${ranked.length} stories`);
  return ranked;
}
