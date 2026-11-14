import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fonts, radius, space } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import { useData } from '@/lib/data';
import { createRoom, TOPICS, type Topic } from '@/lib/chat';
import { T, Chip, Button } from '@/components/ui';

export default function NewChat() {
  const t = useT();
  const { report } = useData();
  const params = useLocalSearchParams<{ ticker?: string }>();
  const [name, setName] = useState(params.ticker ? `${params.ticker}` : '');
  const [topic, setTopic] = useState<Topic>(params.ticker ? 'stock' : 'market');
  const [ticker, setTicker] = useState(params.ticker ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sym = ticker.trim().toUpperCase();
  const tickerOk = topic !== 'stock' || !!report.quotes[sym];
  const canCreate = name.trim().length > 0 && tickerOk && !busy;

  const create = async () => {
    if (!canCreate) return;
    setBusy(true);
    setErr(null);
    try {
      const id = await createRoom(name, topic, topic === 'stock' ? sym : null);
      router.replace({ pathname: '/chat/[id]', params: { id, invite: '1' } });
    } catch (e) {
      setErr(String((e as { code?: string })?.code ?? e));
      setBusy(false);
    }
  };

  const input = { color: colors.text, fontFamily: fonts.regular, fontSize: 16, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, textAlign: (t.lang === 'he' ? 'right' : 'left') as 'right' | 'left' };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(4), gap: space(4), maxWidth: 640, width: '100%', alignSelf: 'center' }}>
      <View style={{ gap: 6 }}>
        <T w="bold">{t('ch_name')}</T>
        <TextInput value={name} onChangeText={setName} placeholder={t('ch_name_ph')} placeholderTextColor={colors.textMute} maxLength={60} accessibilityLabel={t('ch_name')} style={input} />
      </View>
      <View style={{ gap: 8 }}>
        <T w="bold">{t('ch_topic')}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TOPICS.map((k) => (
            <Chip key={k} label={t(`topic_${k}` as 'topic_general')} active={topic === k} onPress={() => setTopic(k)} />
          ))}
        </View>
      </View>
      {topic === 'stock' && (
        <View style={{ gap: 6 }}>
          <T w="bold">{t('ch_ticker')}</T>
          <TextInput
            value={ticker}
            onChangeText={setTicker}
            placeholder="AAPL"
            placeholderTextColor={colors.textMute}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            accessibilityLabel={t('ch_ticker')}
            style={[input, { textAlign: 'left', writingDirection: 'ltr' }]}
          />
          {!!sym && !tickerOk && (
            <T size={12} color={colors.down}>
              {t('ch_ticker_bad')}
            </T>
          )}
          {!!sym && tickerOk && (
            <T size={12} color={colors.textDim}>
              {report.quotes[sym]?.name}
            </T>
          )}
        </View>
      )}
      {err && (
        <T size={12} color={colors.warn}>
          {err}
        </T>
      )}
      <Button label={t('ch_create')} icon="check" onPress={create} style={{ opacity: canCreate ? 1 : 0.5 }} />
      <T size={12} color={colors.textMute}>
        {t('ch_rules')}
      </T>
    </ScrollView>
  );
}
