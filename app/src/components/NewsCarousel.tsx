import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Feather from '@expo/vector-icons/Feather';
import { colors, radius, space } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import { timeAgo } from '@/lib/format';
import type { HotNews } from '@/lib/types';
import { T, N, Row } from './ui';
import { newsTitle, newsWhy } from '@/lib/news';

export const NEWS_CARD_HEIGHT = 178;
const AUTO_MS = 7000;
const GRADS: [string, string][] = [
  ['#2A1F6E', '#141C33'],
  ['#123B57', '#141C33'],
  ['#3A2350', '#141C33'],
];

/** Swipeable carousel of the hottest market stories (same footprint as the old ranking card). */
export function NewsCarousel({ items }: { items: HotNews[] }) {
  const t = useT();
  const [w, setW] = useState(0);
  const [idx, setIdx] = useState(0);
  const ref = useRef<ScrollViewInstance>(null);
  const touched = useRef(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion).catch(() => {});
  }, []);

  const go = (i: number, animated = true) => {
    const n = (i + items.length) % items.length;
    ref.current?.scrollTo({ x: n * w, animated });
    setIdx(n);
  };

  // Auto-advance, paused for a while after the user swipes and when "reduce motion" is on
  useEffect(() => {
    if (!w || items.length < 2 || reduceMotion) return;
    const id = setInterval(() => {
      if (Date.now() - touched.current < AUTO_MS * 2) return;
      go(idx + 1);
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [w, idx, items.length, reduceMotion]);

  useEffect(() => {
    if (idx >= items.length) setIdx(0);
  }, [items.length, idx]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!w) return;
    setIdx(Math.round(e.nativeEvent.contentOffset.x / w));
  };

  if (!items.length) {
    return (
      <LinearGradient colors={GRADS[0]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={{ height: NEWS_CARD_HEIGHT, borderRadius: radius.xl, padding: space(5), justifyContent: 'center', gap: 6 }}>
        <Row style={{ gap: 8 }}>
          <Feather name="zap" size={16} color={colors.warn} />
          <T w="bold" size={13} color={colors.textDim}>
            {t('hot_news')}
          </T>
        </Row>
        <T color={colors.textDim}>{t('hot_news_empty')}</T>
      </LinearGradient>
    );
  }

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ height: NEWS_CARD_HEIGHT, borderRadius: radius.xl, overflow: 'hidden' }}
      accessibilityLabel={t('hot_news')}
    >
      {w > 0 && (
        <ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={() => (touched.current = Date.now())}
          onMomentumScrollEnd={onScrollEnd}
          onScrollEndDrag={onScrollEnd}
          scrollEventThrottle={32}
          // keep LTR paging order in RTL layouts so dots and swipes match
          style={{ direction: 'ltr' } as object}
        >
          {items.map((n, i) => (
            <Pressable
              key={n.id + i}
              onPress={() => WebBrowser.openBrowserAsync(n.url)}
              accessibilityRole="link"
              accessibilityLabel={`${newsTitle(n, t.lang).text}. ${n.source}, ${timeAgo(n.publishedAt, t.lang)}`}
              accessibilityHint={t('open_article')}
              style={{ width: w, height: NEWS_CARD_HEIGHT }}
            >
              <LinearGradient
                colors={GRADS[i % GRADS.length]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ flex: 1, padding: space(4), paddingBottom: 30, gap: 6, direction: t.lang === 'he' ? 'rtl' : 'ltr' } as object}
              >
                <Row style={{ justifyContent: 'space-between', gap: 8 }}>
                  <Row style={{ gap: 6 }}>
                    <Feather name="zap" size={14} color={colors.warn} />
                    <T w="bold" size={12} color={colors.warn}>
                      {t('hot_news')} #{i + 1}
                    </T>
                  </Row>
                  <T size={12} color={colors.textDim} numberOfLines={1} style={{ flexShrink: 1 }}>
                    {n.source} · {timeAgo(n.publishedAt, t.lang)}
                  </T>
                </Row>
                <T
                  w="bold"
                  size={17}
                  numberOfLines={2}
                  style={newsTitle(n, t.lang).rtl ? { writingDirection: 'rtl', textAlign: 'right', lineHeight: 25 } : { writingDirection: 'ltr', textAlign: 'left', lineHeight: 25 }}
                >
                  {newsTitle(n, t.lang).text}
                </T>
                {!!newsWhy(n, t.lang) && (
                  <T size={12} color={colors.textDim} numberOfLines={2}>
                    {newsWhy(n, t.lang)}
                  </T>
                )}
                <View style={{ flex: 1 }} />
                <Row style={{ justifyContent: 'space-between', gap: 8 }}>
                  <Row style={{ gap: 6, flexShrink: 1 }}>
                    {n.tickers.slice(0, 3).map((s) => (
                      <Pressable
                        key={s}
                        onPress={() => router.push({ pathname: '/stock/[symbol]', params: { symbol: s } })}
                        accessibilityRole="button"
                        accessibilityLabel={s}
                        hitSlop={8}
                        style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}
                      >
                        <N w="bold" size={12}>
                          {s}
                        </N>
                      </Pressable>
                    ))}
                    {n.outlets.length > 1 && (
                      <T size={11} color={colors.textDim} numberOfLines={1}>
                        {t('covered_by', { n: n.outlets.length })}
                      </T>
                    )}
                  </Row>
                  <HeatBar heat={n.heat} />
                </Row>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {items.length > 1 && (
        <Row style={{ position: 'absolute', bottom: 6, alignSelf: 'center', gap: 2, direction: 'ltr' } as object}>
          <Pressable onPress={() => ((touched.current = Date.now()), go(idx - 1))} accessibilityRole="button" accessibilityLabel={t('prev_story')} hitSlop={10} style={{ padding: 4 }}>
            <Feather name="chevron-left" size={14} color={colors.textDim} />
          </Pressable>
          {items.map((_, i) => (
            <View key={i} style={{ width: i === idx ? 14 : 5, height: 5, borderRadius: 3, backgroundColor: i === idx ? colors.text : 'rgba(255,255,255,0.3)', marginHorizontal: 1.5 }} />
          ))}
          <Pressable onPress={() => ((touched.current = Date.now()), go(idx + 1))} accessibilityRole="button" accessibilityLabel={t('next_story')} hitSlop={10} style={{ padding: 4 }}>
            <Feather name="chevron-right" size={14} color={colors.textDim} />
          </Pressable>
        </Row>
      )}
    </View>
  );
}

function HeatBar({ heat }: { heat: number }) {
  const t = useT();
  const bars = Math.max(1, Math.round(heat / 20));
  return (
    <Row style={{ gap: 2, alignItems: 'flex-end' }} accessibilityLabel={`${t('heat')} ${heat}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={{ width: 4, height: 6 + i * 3, borderRadius: 2, backgroundColor: i < bars ? colors.warn : 'rgba(255,255,255,0.18)' }} />
      ))}
    </Row>
  );
}
