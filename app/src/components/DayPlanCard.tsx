import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors, radius, space } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import { fmtTime, usd } from '@/lib/format';
import type { DayPlan } from '@/lib/types';
import { T, N, Row, Card } from './ui';

const BIAS_COLOR = { bullish: colors.up, neutral: colors.warn, bearish: colors.down } as const;

/** Same-day trading plan on the stock page: entry, stop, targets and the reasoning. */
export function DayPlanCard({ plan }: { plan?: DayPlan | null }) {
  const t = useT();
  const [more, setMore] = useState(false);
  const [why, setWhy] = useState(false);
  if (!plan) return null;
  const tx = plan.text[t.lang === 'he' ? 'he' : 'en'];
  const hasTrade = plan.setup !== 'none';
  const riskPerShare = plan.entry - plan.stop;
  // 1% risk of a $10,000 account, but never more shares than the account can pay for
  const exampleShares = riskPerShare > 0 ? Math.min(Math.floor(100 / riskPerShare), Math.floor(10000 / plan.entry)) : 0;
  const pctFrom = (x: number) => ((x / plan.entry - 1) * 100).toFixed(1);

  return (
    <Card style={{ gap: space(3) }}>
      <Row style={{ justifyContent: 'space-between', gap: 8 }}>
        <Row style={{ gap: 8, flexShrink: 1 }}>
          <Feather name="zap" size={18} color={colors.brand2} />
          <T w="bold" size={17} accessibilityRole="header">
            {t('dp_title')}
          </T>
        </Row>
        <View style={{ backgroundColor: plan.session === 'live' ? colors.upBg : colors.bgElevated, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
          <T size={11} w="bold" color={plan.session === 'live' ? colors.up : colors.textDim}>
            {t(plan.session === 'live' ? 'dp_live' : 'dp_next')} · {fmtTime(plan.asOf, t.lang)}
          </T>
        </View>
      </Row>

      <Row style={{ gap: 8, flexWrap: 'wrap' }}>
        <Tag color={BIAS_COLOR[plan.bias]} label={t(`dp_bias_${plan.bias}` as 'dp_bias_bullish')} />
        <Tag color={colors.brand2} label={t(`dp_setup_${plan.setup}` as 'dp_setup_pullback')} />
        {plan.warnings.map((w) => (
          <Tag key={w} color={colors.warn} label={t(`dp_warn_${w}` as 'dp_warn_low_vol')} icon="alert-triangle" />
        ))}
      </Row>

      {hasTrade && (
        <>
          <Row style={{ gap: 8 }}>
            <Box label={t(plan.entryType === 'limit' ? 'dp_entry_limit' : 'dp_entry_stop')} value={usd(plan.entry)} color={colors.brand2} big />
            <Box label={t('dp_stop')} value={usd(plan.stop)} sub={`${pctFrom(plan.stop)}%`} color={colors.down} />
          </Row>
          <Row style={{ gap: 8 }}>
            <Box label={t('dp_t1')} value={usd(plan.target1)} sub={`+${pctFrom(plan.target1)}%`} color={colors.up} />
            <Box label={t('dp_t2')} value={usd(plan.target2)} sub={`+${pctFrom(plan.target2)}%`} color={colors.up} />
            <Box label={t('dp_rr')} value={`1:${plan.rr}`} />
          </Row>
          <Ruler plan={plan} />
        </>
      )}

      {/* One short line; the full reasoning opens on tap */}
      <T size={14} color={colors.text}>
        {firstSentence(tx.entry)}
      </T>
      <Row style={{ gap: 8 }}>
        <ToggleChip icon="help-circle" label={t('dp_why')} on={why} onPress={() => setWhy(!why)} />
        <ToggleChip icon="sliders" label={t('dp_more')} on={more} onPress={() => setMore(!more)} />
      </Row>
      {why && (
        <View style={{ gap: space(3) }}>
          <Why icon="compass" title={t('dp_why_bias')} text={tx.bias} />
          <Why icon="log-in" title={t('dp_why_entry')} text={tx.entry} />
          <Why icon="log-out" title={t(hasTrade ? 'dp_why_exit' : 'dp_levels')} text={tx.exit} />
        </View>
      )}

      {more && (
        <View style={{ gap: space(3) }}>
          <View style={{ gap: 4 }}>
            <T w="bold" size={13}>
              {t('dp_levels_title')}
            </T>
            <LevelRow k="R2" v={plan.levels.r2} />
            <LevelRow k="R1" v={plan.levels.r1} />
            {plan.levels.vwap !== undefined && <LevelRow k="VWAP" v={plan.levels.vwap} />}
            <LevelRow k={t('dp_pivot')} v={plan.levels.pivot} />
            <LevelRow k="S1" v={plan.levels.s1} />
            <LevelRow k="S2" v={plan.levels.s2} />
            <LevelRow k={t('dp_prev_hl')} v={`${usd(plan.levels.prevHigh)} / ${usd(plan.levels.prevLow)}`} />
            {plan.levels.open !== undefined && <LevelRow k={t('dp_today_ohl')} v={`${usd(plan.levels.open)} · ${usd(plan.levels.dayHigh!)} / ${usd(plan.levels.dayLow!)}`} />}
            <LevelRow k="ATR" v={`${usd(plan.atr)} (${plan.atrPct.toFixed(1)}%)`} />
          </View>
          {hasTrade && (
            <Why icon="percent" title={t('dp_size_title')} text={t('dp_size', { r: usd(riskPerShare), n: exampleShares, v: usd(exampleShares * plan.entry, 0) })} />
          )}
          <Why icon="clock" title={t('dp_rules_title')} text={t('dp_rules')} />
          <T size={11} color={colors.textMute}>
            {t('dp_method')}
          </T>
        </View>
      )}
      <T size={10} color={colors.textMute}>
        {t('dp_disclaimer')}
      </T>
    </Card>
  );
}

function Tag({ label, color, icon }: { label: string; color: string; icon?: keyof typeof Feather.glyphMap }) {
  return (
    <Row style={{ gap: 4, backgroundColor: colors.bgElevated, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
      {icon && <Feather name={icon} size={11} color={color} />}
      <T size={12} w="bold" color={color}>
        {label}
      </T>
    </Row>
  );
}

function Box({ label, value, sub, color, big }: { label: string; value: string; sub?: string; color?: string; big?: boolean }) {
  return (
    <View style={{ flex: big ? 1.4 : 1, backgroundColor: colors.bgElevated, borderRadius: radius.md, padding: 10, gap: 2 }}>
      <T size={11} color={colors.textDim} numberOfLines={1}>
        {label}
      </T>
      <N w="black" size={big ? 22 : 16} color={color}>
        {value}
      </N>
      {sub && (
        <N size={11} color={colors.textMute}>
          {sub}
        </N>
      )}
    </View>
  );
}

function Why({ icon, title, text }: { icon: keyof typeof Feather.glyphMap; title: string; text: string }) {
  return (
    <Row style={{ gap: 10, alignItems: 'flex-start' }}>
      <Feather name={icon} size={16} color={colors.textDim} style={{ marginTop: 3 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <T w="bold" size={13}>
          {title}
        </T>
        <T size={13} color={colors.textDim}>
          {text}
        </T>
      </View>
    </Row>
  );
}

function LevelRow({ k, v }: { k: string; v: number | string }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <T size={12} color={colors.textDim}>
        {k}
      </T>
      <N size={12}>{typeof v === 'number' ? usd(v) : v}</N>
    </Row>
  );
}

/** Horizontal price ruler: stop · entry · target 1 · target 2, with the current price marked. Always left→right = low→high. */
function Ruler({ plan }: { plan: DayPlan }) {
  const t = useT();
  const lo = Math.min(plan.stop, plan.last) - plan.atr * 0.05;
  const hi = Math.max(plan.target2, plan.last) + plan.atr * 0.05;
  const x = (v: number) => `${((v - lo) / (hi - lo)) * 100}%` as const;
  const marks: { v: number; c: string; l: string }[] = [
    { v: plan.stop, c: colors.down, l: t('dp_stop_s') },
    { v: plan.entry, c: colors.brand2, l: t('dp_entry_s') },
    { v: plan.target1, c: colors.up, l: 'T1' },
    { v: plan.target2, c: colors.up, l: 'T2' },
  ];
  return (
    <View style={{ height: 46, marginTop: 4, direction: 'ltr' } as object} accessible accessibilityLabel={`${t('dp_now')} ${usd(plan.last)}`}>
      <View style={{ position: 'absolute', top: 14, left: 0, right: 0, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)' }} />
      <View style={{ position: 'absolute', top: 14, left: x(plan.stop), width: `${((plan.entry - plan.stop) / (hi - lo)) * 100}%`, height: 4, backgroundColor: colors.downBg }} />
      <View style={{ position: 'absolute', top: 14, left: x(plan.entry), width: `${((plan.target2 - plan.entry) / (hi - lo)) * 100}%`, height: 4, backgroundColor: colors.upBg }} />
      {marks.map((m) => (
        <View key={m.l} style={{ position: 'absolute', left: x(m.v), top: 8, alignItems: 'center', transform: [{ translateX: -10 }], width: 20 }}>
          <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: m.c }} />
          <T size={10} w="bold" color={m.c} style={{ marginTop: 2 }}>
            {m.l}
          </T>
        </View>
      ))}
      <View style={{ position: 'absolute', left: x(plan.last), top: 0, alignItems: 'center', transform: [{ translateX: -20 }], width: 40 }}>
        <T size={9} color={colors.text}>
          {t('dp_now')}
        </T>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.text, marginTop: 1 }} />
      </View>
    </View>
  );
}

const firstSentence = (x: string) => {
  const m = x.match(/^(.+?[.!?])(\s|$)/);
  return (m ? m[1] : x).replace(/ — .*$/, '').trim();
};

function ToggleChip({ icon, label, on, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: on }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        minHeight: 36,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: on ? colors.brand2 : colors.border,
        backgroundColor: on ? 'rgba(124,92,255,0.15)' : 'transparent',
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <Feather name={icon} size={14} color={on ? colors.brand2 : colors.textDim} />
      <T size={12} w="bold" color={on ? colors.brand2 : colors.textDim}>
        {label}
      </T>
    </Pressable>
  );
}
