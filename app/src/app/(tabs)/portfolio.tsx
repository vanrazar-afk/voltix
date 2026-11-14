import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { useApp, type ClosedTrade, type Lot } from '@/lib/store';
import { useData } from '@/lib/data';
import { colors, radius, scoreColor, space } from '@/lib/theme';
import { useT, sectorName } from '@/lib/i18n';
import { fmtDate, pct, usd } from '@/lib/format';
import { tradeBlock, useMarketStatus } from '@/lib/market';
import { T, N, Row, Card, Button, SectionTitle, Disclaimer, Delta } from '@/components/ui';
import { ScoreRing } from '@/components/charts';
import { MarketBadge } from '@/components/MarketBadge';
import { TabHeader } from '@/components/ProfileMenu';

const PALETTE = ['#7C5CFF', '#3DD6F5', '#2BD98B', '#FFB547', '#FF5C7A', '#A78BFA', '#5EEAD4', '#F472B6', '#FACC15', '#60A5FA'];
const ret = (buy: number, now: number) => (buy > 0 ? ((now - buy) / buy) * 100 : 0);

interface Open {
  lot: Lot;
  price: number | null;
  dayPct: number;
  retPct: number | null;
  score: number | null;
  sector: string;
}

export default function Portfolio() {
  const t = useT();
  const lots = useApp((s) => s.lots);
  const history = useApp((s) => s.history);
  const sellLot = useApp((s) => s.sellLot);
  const { report, bySymbol, rankOf } = useData();
  const market = useMarketStatus();
  const block = tradeBlock(market, report.generatedAt);
  const [armed, setArmed] = useState<string | null>(null);

  const open = useMemo<Open[]>(
    () =>
      lots.map((lot) => {
        const q = report.quotes[lot.symbol];
        return {
          lot,
          price: q?.price ?? null,
          dayPct: q?.changePct ?? 0,
          retPct: q ? ret(lot.price, q.price) : null,
          score: bySymbol(lot.symbol)?.score ?? rankOf(lot.symbol)?.score ?? null,
          sector: q?.sector ?? 'Other',
        };
      }),
    [lots, report, bySymbol, rankOf],
  );

  const priced = open.filter((o) => o.retPct !== null);
  const avgOpen = priced.length ? priced.reduce((a, o) => a + o.retPct!, 0) / priced.length : null;
  const realized = history.map((h) => ret(h.buyPrice, h.sellPrice));
  const avgRealized = realized.length ? realized.reduce((a, x) => a + x, 0) / realized.length : null;
  const wins = [...priced.map((o) => o.retPct!), ...realized].filter((x) => x > 0).length;
  const total = priced.length + realized.length;
  const scored = open.filter((o) => o.score !== null);
  const portfolioScore = scored.length ? Math.round(scored.reduce((a, o) => a + o.score!, 0) / scored.length) : null;

  const bySector = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of open) m.set(o.sector, (m.get(o.sector) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [open]);

  const sell = (o: Open) => {
    if (block || o.price === null) return;
    const price = o.price;
    const doIt = () => {
      sellLot(o.lot.id, price);
      setArmed(null);
    };
    if (Platform.OS !== 'web') {
      Alert.alert(t('tr_sell'), t('tr_sell_confirm', { p: usd(price) }), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('tr_sell'), style: 'destructive', onPress: doIt },
      ]);
    } else if (armed === o.lot.id) doIt();
    else {
      setArmed(o.lot.id);
      setTimeout(() => setArmed((a) => (a === o.lot.id ? null : a)), 6000);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space(4), gap: space(4), paddingBottom: space(12), maxWidth: 760, width: '100%', alignSelf: 'center' }}>
        <TabHeader title={t('tab_portfolio')} />
        <LinearGradient colors={['#123A4A', '#141C33']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={{ borderRadius: radius.xl, padding: space(5), gap: space(3) }}>
          <MarketBadge status={market} />
          <Row style={{ gap: space(3) }}>
            <Stat label={t('pf_avg_ret')} value={avgOpen === null ? '—' : pct(avgOpen)} color={avgOpen === null ? undefined : avgOpen >= 0 ? colors.up : colors.down} />
            <Stat label={t('pf_open')} value={`${open.length}`} />
            <Stat label={t('pf_realized')} value={avgRealized === null ? '—' : pct(avgRealized)} color={avgRealized === null ? undefined : avgRealized >= 0 ? colors.up : colors.down} />
          </Row>
          {total > 0 && (
            <T size={12} color={colors.textDim}>
              {t('pf_win')}: {wins}/{total}
            </T>
          )}
        </LinearGradient>

        {open.length === 0 ? (
          <Card style={{ alignItems: 'center', gap: space(3), paddingVertical: space(8) }}>
            <Feather name="briefcase" size={40} color={colors.textMute} />
            <T w="bold" size={17}>
              {t('pf_empty_t')}
            </T>
            <T color={colors.textDim} style={{ textAlign: 'center' }}>
              {t('pf_empty_b')}
            </T>
          </Card>
        ) : (
          <>
            <Row style={{ gap: space(3) }}>
              <Card style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                {portfolioScore !== null ? <ScoreRing score={portfolioScore} size={64} /> : <Feather name="minus-circle" size={40} color={colors.textMute} />}
                <T size={12} color={colors.textDim} style={{ textAlign: 'center' }}>
                  {t('pf_score')}
                </T>
              </Card>
              <Card style={{ flex: 2, gap: 8 }}>
                <T size={12} color={colors.textDim}>
                  {t('pf_sectors')}
                </T>
                <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' }}>
                  {bySector.map(([s, v], i) => (
                    <View key={s} style={{ flex: v, backgroundColor: PALETTE[i % PALETTE.length] }} />
                  ))}
                </View>
                {bySector.slice(0, 4).map(([s, v], i) => (
                  <Row key={s} style={{ gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: PALETTE[i % PALETTE.length] }} />
                    <T size={12} style={{ flex: 1 }}>
                      {sectorName(s, t.lang)}
                    </T>
                    <N size={12} color={colors.textDim}>
                      {((v / open.length) * 100).toFixed(0)}%
                    </N>
                  </Row>
                ))}
              </Card>
            </Row>

            <View>
              <SectionTitle title={t('pf_open')} icon="list" />
              <View style={{ gap: 10 }}>
                {open.map((o) => (
                  <Pressable
                    key={o.lot.id}
                    onPress={() => router.push({ pathname: '/stock/[symbol]', params: { symbol: o.lot.symbol } })}
                    accessibilityRole="button"
                    accessibilityLabel={`${o.lot.symbol}, ${t('pf_bought_at', { p: usd(o.lot.price) })}${o.retPct !== null ? `, ${pct(o.retPct)}` : ''}`}
                    style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border }}
                  >
                    <Row style={{ gap: 10 }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Row style={{ gap: 8 }}>
                          <N w="bold" size={16}>
                            {o.lot.symbol}
                          </N>
                          {o.score !== null && (
                            <View style={{ paddingHorizontal: 6, borderRadius: 6, backgroundColor: colors.bgElevated }}>
                              <N size={11} w="bold" color={scoreColor(o.score)}>
                                {o.score}
                              </N>
                            </View>
                          )}
                        </Row>
                        <T size={12} color={colors.textDim} numberOfLines={1}>
                          {o.lot.name}
                        </T>
                        <T size={12} color={colors.textMute}>
                          {t('pf_bought_at', { p: usd(o.lot.price) })} · {fmtDate(o.lot.date, t.lang)}
                        </T>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 3 }}>
                        <N w="bold" size={15}>
                          {o.price !== null ? usd(o.price) : '—'}
                        </N>
                        {o.retPct !== null && (
                          <N size={13} w="bold" color={o.retPct >= 0 ? colors.up : colors.down}>
                            {pct(o.retPct)}
                          </N>
                        )}
                        <Delta value={o.dayPct} size={10} />
                      </View>
                    </Row>
                    <Pressable
                      onPress={() => sell(o)}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !!block }}
                      accessibilityLabel={`${t('tr_sell')} ${o.lot.symbol}`}
                      style={{
                        marginTop: 10,
                        minHeight: 40,
                        borderRadius: radius.md,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: armed === o.lot.id ? colors.down : colors.downBg,
                        opacity: block ? 0.4 : 1,
                      }}
                    >
                      <T w="bold" size={14} color={armed === o.lot.id ? '#fff' : colors.down}>
                        {armed === o.lot.id ? t('tr_sell_confirm', { p: o.price !== null ? usd(o.price) : '' }) : `${t('tr_sell')}${o.price !== null ? ` · ${usd(o.price)}` : ''}`}
                      </T>
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}

        <Button label={t('pf_add')} icon="shopping-cart" onPress={() => router.push('/add-holding')} style={{ opacity: block === 'closed' ? 0.6 : 1 }} />
        {block === 'closed' && (
          <T size={12} color={colors.textDim}>
            {t('tr_closed_note')}
          </T>
        )}

        {history.length > 0 && (
          <View>
            <SectionTitle title={t('pf_history')} icon="clock" />
            <View style={{ gap: 8 }}>
              {history.map((h) => (
                <HistoryRow key={h.id} h={h} />
              ))}
            </View>
          </View>
        )}

        <T size={11} color={colors.textMute} style={{ textAlign: 'center' }}>
          {t('pf_local')}
        </T>
        <Disclaimer compact />
      </ScrollView>
    </SafeAreaView>
  );
}

function HistoryRow({ h }: { h: ClosedTrade }) {
  const t = useT();
  const r = ret(h.buyPrice, h.sellPrice);
  return (
    <Row style={{ gap: 10, backgroundColor: colors.card, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flex: 1 }}>
        <N w="bold">{h.symbol}</N>
        <T size={11} color={colors.textMute}>
          {fmtDate(h.buyDate, t.lang)} → {fmtDate(h.sellDate, t.lang)}
        </T>
      </View>
      <N size={12} color={colors.textDim}>
        {usd(h.buyPrice)} → {usd(h.sellPrice)}
      </N>
      <N w="bold" color={r >= 0 ? colors.up : colors.down} style={{ minWidth: 64, textAlign: 'right' }}>
        {pct(r)}
      </N>
    </Row>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radius.md, padding: 10 }}>
      <N w="black" size={20} color={color}>
        {value}
      </N>
      <T size={11} color={colors.textDim}>
        {label}
      </T>
    </View>
  );
}
