import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/lib/store';
import { useData } from '@/lib/data';
import { colors, fonts, radius, space } from '@/lib/theme';
import { fmtTime, timeAgo, usd } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { tradeBlock, useMarketStatus } from '@/lib/market';
import { T, N, Button, Card, Delta, Row } from '@/components/ui';
import { MarketBadge } from '@/components/MarketBadge';

/** Buy at the current market price, regular US session only. No quantity, no manual price. */
export default function Buy() {
  const t = useT();
  const params = useLocalSearchParams<{ symbol?: string }>();
  const { report, refresh } = useData();
  const addLot = useApp((s) => s.addLot);
  const market = useMarketStatus();
  const [symbol, setSymbol] = useState((params.symbol ?? '').toUpperCase());
  const quote = report.quotes[symbol];
  const block = tradeBlock(market, report.generatedAt);

  // Get the freshest prices when the screen opens
  useEffect(() => {
    refresh();
  }, []);

  const suggestions = useMemo(() => {
    const q = symbol.trim().toUpperCase();
    if (!q || report.quotes[q]) return [];
    return Object.entries(report.quotes)
      .filter(([s, v]) => s.startsWith(q) || v.name.toUpperCase().includes(q))
      .slice(0, 6);
  }, [symbol, report]);

  const buy = () => {
    if (!quote || block) return;
    addLot({ symbol, name: quote.name, price: quote.price, date: new Date().toISOString() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space(5), gap: space(4), maxWidth: 640, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <MarketBadge status={market} />

        <View style={{ gap: 6 }}>
          <T size={13} w="medium" color={colors.textDim}>
            {t('tr_pick')}
          </T>
          <TextInput
            value={symbol}
            onChangeText={(v) => setSymbol(v.toUpperCase())}
            placeholder="AAPL"
            placeholderTextColor={colors.textMute}
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel={t('tr_pick')}
            style={{ backgroundColor: colors.card, color: colors.text, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.medium, fontSize: 16, textAlign: 'left', writingDirection: 'ltr' }}
          />
          {suggestions.map(([s, v]) => (
            <Pressable key={s} onPress={() => setSymbol(s)} accessibilityRole="button" style={{ paddingVertical: 10, minHeight: 44, justifyContent: 'center' }}>
              <T size={14}>
                <N w="bold" size={14}>
                  {s}
                </N>{' '}
                · {v.name}
              </T>
            </Pressable>
          ))}
        </View>

        {quote && (
          <Card style={{ gap: 6 }}>
            <Row style={{ justifyContent: 'space-between', gap: 16 }}>
              <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <N w="black" size={20}>
                  {symbol}
                </N>
                <T size={13} color={colors.textDim} numberOfLines={1}>
                  {quote.name}
                </T>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <T size={11} color={colors.textMute}>
                  {t('tr_market_price')}
                </T>
                <N w="black" size={24}>
                  {usd(quote.price)}
                </N>
                <Delta value={quote.changePct} size={12} />
              </View>
            </Row>
            <T size={11} color={colors.textMute}>
              {t('tr_price_at', { t: `${fmtTime(report.generatedAt, t.lang)} (${timeAgo(report.generatedAt, t.lang)})` })}
            </T>
          </Card>
        )}

        <Button
          label={quote ? t('tr_buy_at', { p: usd(quote.price) }) : t('tr_buy')}
          icon="shopping-cart"
          onPress={buy}
          style={{ opacity: quote && !block ? 1 : 0.45 }}
        />
        {block === 'closed' && (
          <T size={13} color={colors.warn}>
            {t('tr_closed_note')}
          </T>
        )}
        {block === 'stale' && (
          <T size={13} color={colors.warn}>
            {t('tr_stale')}
          </T>
        )}
        <T size={12} color={colors.textMute}>
          {t('tr_how')}
        </T>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
