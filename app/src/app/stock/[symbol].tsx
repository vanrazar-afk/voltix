import { useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import Feather from '@expo/vector-icons/Feather';
import { useData, useStockDetail } from '@/lib/data';
import { useApp } from '@/lib/store';
import type { Factor, PillarResult, StockScore } from '@/lib/types';
import { colors, pillarMeta, radius, space } from '@/lib/theme';
import { useT, factorLabel, factorValue, pillarSummary, sentimentSummary, sectorName } from '@/lib/i18n';
import { fmtDate, pct, timeAgo, usd } from '@/lib/format';
import { T, N, Row, Card, Delta, Button, SectionTitle, Disclaimer, DemoBanner } from '@/components/ui';
import { ScoreRing, PillarBar, LevelsChart } from '@/components/charts';
import { PriceChart } from '@/components/PriceChart';
import { DayPlanCard } from '@/components/DayPlanCard';

const SOURCE_NAMES: Record<string, string> = {
  reuters: 'Reuters', bloomberg: 'Bloomberg', wsj: 'WSJ', ft: 'Financial Times', cnbc: 'CNBC',
  marketwatch: 'MarketWatch', barrons: "Barron's", yahoo: 'Yahoo Finance', seekingalpha: 'Seeking Alpha', benzinga: 'Benzinga',
};

export default function StockScreen() {
  const t = useT();
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const { bySymbol, isDemo, report } = useData();
  const inline = bySymbol(symbol);
  const { detail, state } = useStockDetail(symbol, inline);
  const s = inline ?? detail ?? undefined;
  const watching = useApp((st) => st.watchlist.includes(symbol));
  const toggleWatch = useApp((st) => st.toggleWatch);
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<StockTab>('overview');
  const [openPillar, setOpenPillar] = useState<'technical' | 'fundamental' | 'sentiment' | null>(null);

  const starButton = (sym: string) => () => (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        toggleWatch(sym);
      }}
      hitSlop={12}
      style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
      accessibilityRole="button"
      accessibilityState={{ selected: watching }}
      accessibilityLabel={watching ? t('watch_remove') : t('watch_add')}
    >
      <Feather name="star" size={22} color={watching ? colors.warn : colors.textDim} />
    </Pressable>
  );

  if (!s) {
    // Analysis still loading, or a stock without enough history to score
    const q = report.quotes[symbol];
    const loadingDetail = state === 'loading';
    return (
      <>
        <Stack.Screen options={{ title: symbol, headerRight: starButton(symbol) }} />
        <ScrollView contentContainerStyle={{ padding: space(4), gap: space(4), paddingBottom: space(12), maxWidth: 760, width: '100%', alignSelf: 'center' }}>
          <Card style={{ gap: 6 }}>
            <Row style={{ gap: space(4) }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <T size={12} w="bold" color={colors.textDim} style={{ textAlign: 'center' }}>
                  {loadingDetail ? '…' : t('no_score')}
                </T>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T w="black" size={22} numberOfLines={2} accessibilityRole="header">
                  {q?.name ?? symbol}
                </T>
                {q?.sector && (
                  <T size={13} color={colors.textDim}>
                    {sectorName(q.sector, t.lang)}
                  </T>
                )}
                {q && (
                  <Row style={{ gap: 8, marginTop: 4 }}>
                    <N w="bold" size={22}>
                      {usd(q.price)}
                    </N>
                    <Delta value={q.changePct} />
                  </Row>
                )}
              </View>
            </Row>
            <T size={13} color={colors.textDim} style={{ marginTop: 8 }}>
              {loadingDetail ? t('detail_loading') : t('unscored_note')}
            </T>
          </Card>
          <PriceChart symbol={symbol} />
          <Button label={t('add_to_portfolio')} icon="plus" onPress={() => router.push({ pathname: '/add-holding', params: { symbol } })} />
          <Disclaimer />
        </ScrollView>
      </>
    );
  }

  const chartW = Math.min(width, 720) - space(8) - space(8);
  const pickTab = (k: StockTab, pillar?: 'technical' | 'fundamental' | 'sentiment') => {
    Haptics.selectionAsync().catch(() => {});
    setTab(k);
    if (pillar) setOpenPillar(pillar);
  };
  const warn = s.flags.includes('earnings_soon') && s.nextEarningsDate
    ? { icon: 'calendar' as const, text: t('earnings_on', { d: fmtDate(s.nextEarningsDate, t.lang) }), color: colors.warn }
    : s.flags.includes('overbought')
      ? { icon: 'alert-triangle' as const, text: t('overbought'), color: colors.down }
      : null;

  return (
    <>
      <Stack.Screen options={{ title: s.symbol, headerRight: starButton(s.symbol) }} />
      <ScrollView
        stickyHeaderIndices={[isDemo ? 2 : 1]}
        contentContainerStyle={{ padding: space(4), gap: space(4), paddingBottom: space(12), maxWidth: 760, width: '100%', alignSelf: 'center' }}
      >
        {isDemo && <DemoBanner />}

        {/* Header: score, price, the three parts (tap one to open its analysis) */}
        <Card style={{ gap: space(4) }}>
          <Row style={{ gap: space(4) }}>
            <ScoreRing score={s.score} size={84} pillars={[s.technical.score, s.fundamental.score, s.sentiment.score]} />
            <View style={{ flex: 1, gap: 2 }}>
              <T w="black" size={21} numberOfLines={1}>
                {s.name}
              </T>
              <Row style={{ gap: 8 }}>
                <N w="bold" size={21}>
                  {usd(s.price)}
                </N>
                <Delta value={s.changePct} />
              </Row>
              <Row style={{ gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                <Badge icon="hash" text={t('rank_of', { n: s.rank })} />
                {warn && <Badge icon={warn.icon} text={warn.text} color={warn.color} />}
              </Row>
            </View>
          </Row>
          <View style={{ gap: 12 }}>
            <PillarBar label={t('p_tech')} value={s.technical.score} max={50} color={colors.tech} onPress={() => pickTab('analysis', 'technical')} />
            <PillarBar label={t('p_fund')} value={s.fundamental.score} max={30} color={colors.fund} onPress={() => pickTab('analysis', 'fundamental')} />
            <PillarBar label={t('p_sent')} value={s.sentiment.score} max={20} color={colors.sent} onPress={() => pickTab('analysis', 'sentiment')} />
          </View>
        </Card>

        {/* Tabs (sticky) */}
        <View style={{ backgroundColor: colors.bg, paddingVertical: 4 }}>
          <Row style={{ backgroundColor: colors.card, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: colors.border }} accessibilityRole="tablist">
            {STOCK_TABS.map((k) => (
              <Pressable
                key={k}
                onPress={() => pickTab(k)}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === k }}
                style={{ flex: 1, minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === k ? colors.brand : 'transparent' }}
              >
                <T size={13} w="bold" color={tab === k ? '#fff' : colors.textDim} numberOfLines={1}>
                  {t(`tab_s_${k}` as 'tab_s_overview')}
                </T>
              </Pressable>
            ))}
          </Row>
        </View>

        {tab === 'overview' && (
          <>
            <PriceChart symbol={s.symbol} />
            <Card style={{ gap: space(3) }}>
              <SectionTitle title={t('levels_title')} icon="crosshair" color={colors.brand2} />
              <LevelsChart labels={[t('target'), t('stop')]} data={s.sparkline} entry={s.levels.entry} target={s.levels.target} stop={s.levels.stop} width={chartW} />
              <Row style={{ gap: 8 }}>
                <Level label={t('last_price')} value={usd(s.levels.entry)} color={colors.text} />
                <Level label={t('exit_target')} value={usd(s.levels.target)} sub={pct((s.levels.target / s.price - 1) * 100, 1)} color={colors.up} />
                <Level label={t('stop')} value={usd(s.levels.stop)} sub={pct((s.levels.stop / s.price - 1) * 100, 1)} color={colors.down} />
              </Row>
              <T size={11} color={colors.textMute}>
                {t('rr')} 1:{s.levels.riskReward}
                {s.analystTarget ? ` · ${t('analyst_avg')} ${usd(s.analystTarget)}` : ''}
              </T>
            </Card>
            <Button label={t('add_to_portfolio')} icon="plus" onPress={() => router.push({ pathname: '/add-holding', params: { symbol: s.symbol } })} />
          </>
        )}

        {tab === 'day' && <DayPlanCard plan={s.dayPlan} />}

        {tab === 'analysis' && (
          <>
            <Pillar k="technical" title={t('p_tech')} max={50} p={s.technical} sector={s.sector} open={openPillar === 'technical'} onToggle={() => setOpenPillar(openPillar === 'technical' ? null : 'technical')} />
            <Pillar k="fundamental" title={t('p_fund')} max={30} p={s.fundamental} sector={s.sector} open={openPillar === 'fundamental'} onToggle={() => setOpenPillar(openPillar === 'fundamental' ? null : 'fundamental')} />
            <SentimentPillar s={s} open={openPillar === 'sentiment'} onToggle={() => setOpenPillar(openPillar === 'sentiment' ? null : 'sentiment')} />
          </>
        )}

        {tab === 'news' && <NewsList s={s} />}

        <Disclaimer compact />
      </ScrollView>
    </>
  );
}

const STOCK_TABS = ['overview', 'day', 'analysis', 'news'] as const;
type StockTab = (typeof STOCK_TABS)[number];

function Badge({ icon, text, color = colors.brand2 }: { icon: keyof typeof Feather.glyphMap; text: string; color?: string }) {
  return (
    <Row style={{ gap: 5, backgroundColor: colors.bgElevated, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
      <Feather name={icon} size={12} color={color} />
      <T size={12} color={color}>{text}</T>
    </Row>
  );
}

function Level({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgElevated, borderRadius: radius.md, padding: 10, gap: 2 }}>
      <T size={11} color={colors.textDim}>{label}</T>
      <N w="bold" size={15} color={color}>{value}</N>
      {sub && <N size={11} color={color}>{sub}</N>}
    </View>
  );
}

function Pillar({ title, k, p, sector, max, open, onToggle }: { title: string; k: 'technical' | 'fundamental'; p: PillarResult; sector: string; max: number; open: boolean; onToggle: () => void }) {
  const t = useT();
  const meta = pillarMeta[k];
  return (
    <Card style={{ gap: space(3) }}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={({ pressed }) => ({ gap: 8, opacity: pressed ? 0.75 : 1 })}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row style={{ gap: 8 }}>
            <Feather name={meta.icon} size={18} color={meta.color} />
            <T w="bold" size={16}>
              {title}
            </T>
          </Row>
          <Row style={{ gap: 6 }}>
            <N w="black" size={18} color={meta.color}>
              {Math.round(p.score)}
              <N size={12} color={colors.textMute}> / {max}</N>
            </N>
            <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textDim} />
          </Row>
        </Row>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' }}>
          <View style={{ width: `${Math.min(100, (p.score / max) * 100)}%`, height: 6, backgroundColor: meta.color }} />
        </View>
        <T size={13} color={colors.textDim}>
          {pillarSummary(k, p, sector, t.lang)}
        </T>
      </Pressable>
      {open && <FactorTable factors={p.factors} color={meta.color} />}
    </Card>
  );
}

function FactorTable({ factors, color }: { factors: Factor[]; color: string }) {
  const t = useT();
  return (
    <View style={{ borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      <Row style={{ backgroundColor: colors.bgElevated, paddingVertical: 8, paddingHorizontal: 10 }}>
        <T size={11} w="bold" color={colors.textMute} style={{ flex: 1.4 }}>{t('col_metric')}</T>
        <T size={11} w="bold" color={colors.textMute} style={{ flex: 1.2 }}>{t('col_value')}</T>
        <T size={11} w="bold" color={colors.textMute} style={{ width: 54 }}>{t('col_points')}</T>
      </Row>
      {factors.map((f, i) => (
        <Row key={f.key} style={{ paddingVertical: 9, paddingHorizontal: 10, backgroundColor: i % 2 ? colors.card : colors.cardHi, gap: 6 }}>
          <Row style={{ flex: 1.4, gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: f.signal === 'positive' ? colors.up : f.signal === 'negative' ? colors.down : colors.warn }} />
            <T size={12} style={{ flex: 1 }}>{factorLabel(f, t.lang)}</T>
          </Row>
          <T size={12} color={colors.textDim} style={{ flex: 1.2 }}>{factorValue(f, t.lang)}</T>
          <N size={12} w="bold" color={f.points < 0 ? colors.down : f.max && f.points / f.max >= 0.6 ? color : colors.textDim} style={{ width: 54 }}>
            {f.points < 0 ? `${f.points}` : f.max ? `${f.points}/${f.max}` : '—'}
          </N>
        </Row>
      ))}
    </View>
  );
}

function SentimentPillar({ s, open, onToggle }: { s: StockScore; open: boolean; onToggle: () => void }) {
  const t = useT();
  const r = s.sentiment;
  const total = Math.max(1, r.positive + r.negative + r.neutral);
  return (
    <Card style={{ gap: space(3) }}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={({ pressed }) => ({ gap: 8, opacity: pressed ? 0.75 : 1 })}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row style={{ gap: 8 }}>
            <Feather name="message-circle" size={18} color={colors.sent} />
            <T w="bold" size={16}>
              {t('p_sent')}
            </T>
          </Row>
          <Row style={{ gap: 6 }}>
            <N w="black" size={18} color={colors.sent}>
              {Math.round(r.score)}
              <N size={12} color={colors.textMute}> / 20</N>
            </N>
            <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textDim} />
          </Row>
        </Row>
        <View style={{ flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.border }}>
          <View style={{ flex: r.positive / total, backgroundColor: colors.up }} />
          <View style={{ flex: r.neutral / total, backgroundColor: colors.textMute }} />
          <View style={{ flex: r.negative / total, backgroundColor: colors.down }} />
        </View>
        <T size={13} color={colors.textDim}>
          {sentimentSummary(r, t.lang)}
        </T>
      </Pressable>
      {open && (
        <Row style={{ gap: 14, flexWrap: 'wrap' }}>
          <T size={12} color={colors.up}>● {t('positive')} {r.positive}</T>
          <T size={12} color={colors.textDim}>● {t('neutral')} {r.neutral}</T>
          <T size={12} color={colors.down}>● {t('negative')} {r.negative}</T>
          <T size={12} color={colors.textMute}>{t('sources_n', { n: r.sourcesCovered.length })}</T>
        </Row>
      )}
    </Card>
  );
}

function NewsList({ s }: { s: StockScore }) {
  const t = useT();
  const r = s.sentiment;
  if (!r.articles.length)
    return (
      <Card>
        <T size={13} color={colors.textMute}>
          {t('no_articles')}
        </T>
      </Card>
    );
  return (
    <View style={{ gap: 8 }}>
      {r.articles.slice(0, 12).map((a, i) => (
        <Pressable
          key={i}
          onPress={() => !a.url.includes('example.com') && WebBrowser.openBrowserAsync(a.url)}
          accessibilityRole="link"
          style={({ pressed }) => ({ backgroundColor: pressed ? colors.cardHi : colors.card, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.border, gap: 6, transform: [{ scale: pressed ? 0.99 : 1 }] })}
        >
          <Row style={{ gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: a.label === 'positive' ? colors.up : a.label === 'negative' ? colors.down : colors.textMute }} />
            <T size={11} color={colors.textMute}>
              {a.publisher ?? SOURCE_NAMES[a.source] ?? a.source} · {timeAgo(a.datetime, t.lang)}
            </T>
          </Row>
          <T size={14} style={{ writingDirection: 'ltr', textAlign: 'left' }}>
            {a.headline}
          </T>
        </Pressable>
      ))}
    </View>
  );
}
