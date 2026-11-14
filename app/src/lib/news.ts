import type { HotNews } from './types';
import type { Lang } from './i18n';

/** Headline in the app language (Hebrew translation when available). */
export function newsTitle(n: HotNews, lang: Lang) {
  const he = lang === 'he' && n.titleHe;
  return { text: he ? n.titleHe! : n.title, rtl: !!he };
}

/** One simple sentence: how this may affect the market / the stock. */
export function newsWhy(n: HotNews, lang: Lang) {
  return lang === 'he' ? n.whyHe : n.whyEn;
}

export const NEWS_CATEGORIES = ['macro', 'policy', 'indices', 'earnings', 'energy', 'geo', 'deals', 'tech', 'crypto', 'company'] as const;
