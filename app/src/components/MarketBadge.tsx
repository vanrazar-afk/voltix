import { View } from 'react-native';
import { colors, radius } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import type { MarketStatus } from '@/lib/market';
import { T, Row } from './ui';

const fmtLocal = (d: Date, lang: 'he' | 'en') =>
  d.toLocaleString(lang === 'he' ? 'he-IL' : 'en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

function untilText(ms: number, lang: 'he' | 'en') {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (lang === 'he') return h ? `${h} ש' ו-${mm} דק'` : `${mm} דק'`;
  return h ? `${h}h ${mm}m` : `${mm}m`;
}

/** "Market open · closes in 2h 10m" / "Market closed · opens Mon 16:30" (local time). */
export function MarketBadge({ status }: { status: MarketStatus }) {
  const t = useT();
  const open = status.open;
  const detail = open
    ? t('mk_closes_in', { n: untilText(status.closesAt!.getTime() - Date.now(), t.lang) })
    : status.nextOpen
      ? t('mk_opens', { n: fmtLocal(status.nextOpen, t.lang) })
      : '';
  return (
    <Row
      style={{ gap: 8, alignSelf: 'flex-start', backgroundColor: open ? colors.upBg : 'rgba(255,255,255,0.08)', borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6 }}
      accessibilityRole="text"
      accessibilityLabel={`${t(open ? 'mk_open' : 'mk_closed')}. ${detail}`}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: open ? colors.up : colors.down }} />
      <T w="bold" size={12} color={open ? colors.up : colors.text}>
        {t(open ? 'mk_open' : 'mk_closed')}
        {!open && status.reason !== 'post' && status.reason !== 'pre' ? ` (${t(`mk_${status.reason}` as 'mk_weekend')})` : ''}
      </T>
      {!!detail && (
        <T size={12} color={colors.textDim}>
          · {detail}
        </T>
      )}
    </Row>
  );
}
