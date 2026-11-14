import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { colors, radius, space } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import { useData } from '@/lib/data';
import { timeAgo } from '@/lib/format';
import { newsTitle, NEWS_CATEGORIES } from '@/lib/news';
import type { HotNews } from '@/lib/types';
import { T, N, Row, Chip, Disclaimer } from '@/components/ui';
import { TabHeader } from '@/components/ProfileMenu';

const impactColor = (x: number) => (x >= 70 ? colors.down : x >= 40 ? colors.warn : colors.textDim);

export default function News() {
  const t = useT();
  const { report, refresh, loading } = useData();
  const [cat, setCat] = useState<string | null>(null);
  const all = report.marketNews?.length ? report.marketNews : report.hotNews ?? [];
  const cats = useMemo(() => NEWS_CATEGORIES.filter((c) => all.some((n) => n.category === c)), [all]);
  const list = cat ? all.filter((n) => n.category === cat) : all;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <FlatList
        data={list}
        keyExtractor={(n) => n.id}
        renderItem={({ item, index }) => <NewsRow n={item} rank={index + 1} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.brand2} />}
        contentContainerStyle={{ padding: space(4), paddingBottom: space(10), maxWidth: 760, width: '100%', alignSelf: 'center' }}
        ListHeaderComponent={
          <View style={{ gap: space(3), marginBottom: space(3) }}>
            <TabHeader title={t('nw_title')} />
            <T size={13} color={colors.textDim}>
              {t('nw_sub')}
            </T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Chip label={t('nw_all')} active={!cat} onPress={() => setCat(null)} />
              {cats.map((c) => (
                <Chip key={c} label={t(`cat_${c}` as 'cat_macro')} active={cat === c} onPress={() => setCat(cat === c ? null : c)} />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <T color={colors.textDim} style={{ textAlign: 'center', marginTop: 30 }}>
            {t('nw_empty')}
          </T>
        }
        ListFooterComponent={
          <View style={{ gap: space(3), marginTop: space(5) }}>
            <T size={11} color={colors.textMute}>
              {t('nw_method')}
            </T>
            <Disclaimer compact />
          </View>
        }
      />
    </SafeAreaView>
  );
}

function NewsRow({ n, rank }: { n: HotNews; rank: number }) {
  const t = useT();
  const title = newsTitle(n, t.lang);
  const impact = n.impact ?? n.heat;
  return (
    <Pressable
      onPress={() => WebBrowser.openBrowserAsync(n.url)}
      accessibilityRole="link"
      accessibilityLabel={`${rank}. ${title.text}. ${t('nw_impact')} ${impact}. ${n.source}`}
      style={({ pressed }) => ({ backgroundColor: pressed ? colors.cardHi : colors.card, borderRadius: radius.lg, padding: space(4), borderWidth: 1, borderColor: colors.border, gap: 8 })}
    >
      <Row style={{ justifyContent: 'space-between', gap: 8 }}>
        <Row style={{ gap: 8 }}>
          <N w="black" size={13} color={colors.textMute}>
            #{rank}
          </N>
          {n.category && (
            <View style={{ backgroundColor: colors.bgElevated, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
              <T size={11} w="bold" color={colors.brand2}>
                {t(`cat_${n.category}` as 'cat_macro')}
              </T>
            </View>
          )}
        </Row>
        <Row style={{ gap: 6 }}>
          <T size={11} color={colors.textMute}>
            {t('nw_impact')}
          </T>
          <View style={{ width: 54, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <View style={{ width: `${impact}%`, height: 6, backgroundColor: impactColor(impact) }} />
          </View>
          <N size={11} w="bold" color={impactColor(impact)}>
            {impact}
          </N>
        </Row>
      </Row>
      <T w="bold" size={16} style={title.rtl ? { writingDirection: 'rtl', textAlign: 'right' } : { writingDirection: 'ltr', textAlign: 'left' }}>
        {title.text}
      </T>
      <Row style={{ justifyContent: 'space-between', gap: 8 }}>
        <T size={12} color={colors.textDim} numberOfLines={1} style={{ flexShrink: 1 }}>
          {n.source} · {timeAgo(n.publishedAt, t.lang)}
          {n.outlets.length > 1 ? ` · ${t('covered_by', { n: n.outlets.length })}` : ''}
        </T>
        <Row style={{ gap: 6 }}>
          {n.tickers.slice(0, 3).map((s) => (
            <Pressable
              key={s}
              onPress={() => router.push({ pathname: '/stock/[symbol]', params: { symbol: s } })}
              accessibilityRole="button"
              accessibilityLabel={s}
              hitSlop={8}
              style={{ backgroundColor: colors.bgElevated, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}
            >
              <N w="bold" size={12}>
                {s}
              </N>
            </Pressable>
          ))}
        </Row>
      </Row>
    </Pressable>
  );
}
