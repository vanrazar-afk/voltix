import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import Feather from '@expo/vector-icons/Feather';
import { colors, fonts, radius, space } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import { useData } from '@/lib/data';
import { useAuth } from '@/lib/auth';
import { useApp } from '@/lib/store';
import { chatAvailable } from '@/lib/chat';
import { fmtTime, pct, usd } from '@/lib/format';
import { tradeBlock, useMarketStatus } from '@/lib/market';
import { joinLeague, leaveLeague, NICK_RE, playerValue, START_CASH, trade, TRADES_PER_DAY, tradesLeft, useMyPlayer, usePlayers, type Player } from '@/lib/league';
import { T, N, Row, Card, Button, Chip, Disclaimer } from '@/components/ui';
import { TabHeader } from '@/components/ProfileMenu';
import { MarketBadge } from '@/components/MarketBadge';

const errText = (code: string, t: ReturnType<typeof useT>) => {
  const k = `lg_err_${code.replace(/^.*\//, '').replace(/-/g, '_')}`;
  const v = t(k as 'lg_err_generic');
  return v === k ? `${t('lg_err_generic')} (${code})` : v;
};

function leagueUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const base = ((Constants.expoConfig?.experiments as { baseUrl?: string } | undefined)?.baseUrl ?? '').replace(/\/$/, '');
    return `${window.location.origin}${base}/league`;
  }
  return 'voltix://league';
}

export default function League() {
  const t = useT();
  const auth = useAuth();
  const uid = useApp((s) => (s.account?.mode === 'google' ? s.account.uid : null));
  const me = useMyPlayer();
  const players = usePlayers(!!uid);
  const { report } = useData();
  const market = useMarketStatus();
  const [tab, setTab] = useState<'table' | 'mine'>('table');
  const [ticket, setTicket] = useState<{ side: 'buy' | 'sell'; symbol?: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const price = (s: string) => report.quotes[s]?.price;
  const standings = useMemo(
    () =>
      (players ?? [])
        .map((p) => ({ p, value: playerValue(p, price) }))
        .sort((a, b) => b.value - a.value)
        .map((x, i) => ({ ...x, rank: i + 1 })),
    [players, report],
  );
  const mine = standings.find((x) => x.p.uid === uid);

  const invite = async () => {
    const msg = t('lg_invite_msg');
    const url = leagueUrl();
    try {
      if (Platform.OS !== 'web') await Share.share({ message: `${msg} ${url}` });
      else if ((navigator as Navigator).share) await (navigator as Navigator).share({ title: 'VOLTIX', text: msg, url });
      else {
        await navigator.clipboard?.writeText(`${msg} ${url}`);
        setNote(t('lg_link_copied'));
      }
    } catch {
      /* cancelled */
    }
  };

  const header = (
    <TabHeader
      title={t('lg_title')}
      trailing={
        <Pressable onPress={invite} accessibilityRole="button" accessibilityLabel={t('lg_invite')} style={{ padding: 8 }}>
          <Feather name="user-plus" size={22} color={colors.text} />
        </Pressable>
      }
    />
  );

  // ---- Not available / not signed in / not registered ----
  if (!chatAvailable() || !uid || me === null || me === undefined) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: space(4), gap: space(4), maxWidth: 640, width: '100%', alignSelf: 'center' }}>
          {header}
          <Rules />
          {!chatAvailable() ? (
            <Card>
              <T color={colors.textDim}>{t('ch_unavailable')}</T>
            </Card>
          ) : !uid ? (
            <Card style={{ gap: space(3), alignItems: 'center' }}>
              <T color={colors.textDim} style={{ textAlign: 'center' }}>
                {t('lg_need_google')}
              </T>
              <Button label={t('login_google')} icon="log-in" onPress={() => auth.signInWithGoogle()} />
            </Card>
          ) : me === undefined ? (
            <T color={colors.textDim}>…</T>
          ) : (
            <JoinCard />
          )}
          <Disclaimer compact />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const left = tradesLeft(me);
  const value = mine?.value ?? playerValue(me, price);
  const ret = (value / START_CASH - 1) * 100;
  const block = tradeBlock(market, report.generatedAt);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space(4), gap: space(4), paddingBottom: space(12), maxWidth: 760, width: '100%', alignSelf: 'center' }}>
        {header}
        <Card style={{ gap: space(3) }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <T size={12} color={colors.textDim}>
                {t('lg_you_are', { n: me.nickname })}
              </T>
              <N w="black" size={30}>
                {usd(value, 0)}
              </N>
              <N w="bold" color={ret >= 0 ? colors.up : colors.down}>
                {pct(ret)}
              </N>
            </View>
            <View style={{ alignItems: 'center' }}>
              <N w="black" size={30} color={colors.brand2}>
                #{mine?.rank ?? '—'}
              </N>
              <T size={12} color={colors.textDim}>
                {t('lg_of', { n: standings.length })}
              </T>
            </View>
          </Row>
          <Row style={{ gap: space(3) }}>
            <Mini label={t('lg_cash')} value={usd(me.cash, 0)} />
            <Mini label={t('lg_trades_left')} value={`${left}/${TRADES_PER_DAY}`} color={left ? colors.text : colors.down} />
          </Row>
          <MarketBadge status={market} />
          <Row style={{ gap: space(3) }}>
            <Button label={t('tr_buy')} icon="plus" onPress={() => setTicket({ side: 'buy' })} style={{ flex: 1, opacity: block || !left ? 0.5 : 1 }} />
            <Button label={t('tr_sell')} icon="minus" variant="danger" onPress={() => setTicket({ side: 'sell' })} style={{ flex: 1, opacity: block || !left || !Object.keys(me.holdings).length ? 0.5 : 1 }} />
          </Row>
          {note && (
            <T size={12} color={colors.warn}>
              {note}
            </T>
          )}
        </Card>

        <Row style={{ gap: 8 }}>
          <Chip label={t('lg_table')} active={tab === 'table'} onPress={() => setTab('table')} />
          <Chip label={t('lg_mine')} active={tab === 'mine'} onPress={() => setTab('mine')} />
        </Row>

        {tab === 'table' ? (
          <View style={{ gap: 8 }}>
            {standings.map(({ p, value: v, rank }) => {
              const r = (v / START_CASH - 1) * 100;
              const isMe = p.uid === uid;
              return (
                <Row
                  key={p.uid}
                  style={{ gap: 12, backgroundColor: isMe ? colors.cardHi : colors.card, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: isMe ? colors.brand : colors.border }}
                  accessibilityLabel={`${rank}. ${p.nickname}, ${pct(r)}`}
                >
                  <N w="black" size={15} color={rank <= 3 ? colors.warn : colors.textDim} style={{ width: 30 }}>
                    {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
                  </N>
                  <View style={{ flex: 1 }}>
                    <T w="bold" numberOfLines={1}>
                      {p.nickname}
                    </T>
                    <T size={11} color={colors.textMute}>
                      {t('lg_positions', { n: Object.keys(p.holdings).length })}
                    </T>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <N w="bold" color={r >= 0 ? colors.up : colors.down}>
                      {pct(r)}
                    </N>
                    <N size={11} color={colors.textDim}>
                      {usd(v, 0)}
                    </N>
                  </View>
                </Row>
              );
            })}
          </View>
        ) : (
          <MyLeaguePortfolio me={me} onSell={(s) => setTicket({ side: 'sell', symbol: s })} />
        )}

        <T size={11} color={colors.textMute}>
          {t('lg_rules_short')}
        </T>
        <LeaveButton me={me} />
        <Disclaimer compact />
      </ScrollView>

      {ticket && <TradeTicket me={me} initial={ticket} onClose={(msg) => (setTicket(null), msg && setNote(msg))} />}
    </SafeAreaView>
  );
}

function Rules() {
  const t = useT();
  const items: [keyof typeof Feather.glyphMap, string][] = [
    ['dollar-sign', t('lg_rule_cash')],
    ['repeat', t('lg_rule_trades')],
    ['clock', t('lg_rule_hours')],
    ['bar-chart-2', t('lg_rule_rank')],
  ];
  return (
    <Card style={{ gap: 10 }}>
      <T w="bold" size={16}>
        {t('lg_how')}
      </T>
      {items.map(([icon, txt]) => (
        <Row key={txt} style={{ gap: 10, alignItems: 'flex-start' }}>
          <Feather name={icon} size={16} color={colors.brand2} style={{ marginTop: 3 }} />
          <T size={14} color={colors.textDim} style={{ flex: 1 }}>
            {txt}
          </T>
        </Row>
      ))}
    </Card>
  );
}

function JoinCard() {
  const t = useT();
  const [nick, setNick] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ok = NICK_RE.test(nick.trim());
  const join = async () => {
    if (!ok || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await joinLeague(nick);
    } catch (e) {
      setErr(errText(String((e as { code?: string; message?: string })?.code ?? (e as Error).message), t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card style={{ gap: space(3) }}>
      <T w="bold">{t('lg_pick_nick')}</T>
      <T size={12} color={colors.textDim}>
        {t('lg_nick_note')}
      </T>
      <TextInput
        value={nick}
        onChangeText={setNick}
        maxLength={20}
        placeholder={t('lg_nick_ph')}
        placeholderTextColor={colors.textMute}
        accessibilityLabel={t('lg_pick_nick')}
        style={{ backgroundColor: colors.bgElevated, color: colors.text, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.medium, fontSize: 16, textAlign: t.lang === 'he' ? 'right' : 'left' }}
      />
      {err && (
        <T size={12} color={colors.down}>
          {err}
        </T>
      )}
      <Button label={t('lg_join')} icon="award" onPress={join} style={{ opacity: ok && !busy ? 1 : 0.5 }} />
    </Card>
  );
}

function MyLeaguePortfolio({ me, onSell }: { me: Player; onSell: (s: string) => void }) {
  const t = useT();
  const { report } = useData();
  const rows = Object.entries(me.holdings);
  return (
    <View style={{ gap: 8 }}>
      {rows.length === 0 && (
        <Card>
          <T color={colors.textDim}>{t('lg_no_holdings')}</T>
        </Card>
      )}
      {rows.map(([s, h]) => {
        const q = report.quotes[s];
        const now = q ? h.qty * q.price : h.cost;
        const r = h.cost ? (now / h.cost - 1) * 100 : 0;
        return (
          <Row key={s} style={{ gap: 12, backgroundColor: colors.card, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flex: 1 }}>
              <N w="bold">{s}</N>
              <T size={11} color={colors.textMute}>
                {t('lg_qty_avg', { q: h.qty, p: usd(h.cost / h.qty) })}
              </T>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <N w="bold">{usd(now, 0)}</N>
              <N size={12} w="bold" color={r >= 0 ? colors.up : colors.down}>
                {pct(r)}
              </N>
            </View>
            <Pressable onPress={() => onSell(s)} accessibilityRole="button" accessibilityLabel={`${t('tr_sell')} ${s}`} style={{ paddingHorizontal: 12, minHeight: 40, justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.downBg }}>
              <T w="bold" size={13} color={colors.down}>
                {t('tr_sell')}
              </T>
            </Pressable>
          </Row>
        );
      })}
      {me.log.length > 0 && (
        <View style={{ gap: 6, marginTop: space(3) }}>
          <T w="bold">{t('lg_activity')}</T>
          {me.log.slice(0, 12).map((l, i) => (
            <Row key={i} style={{ gap: 8 }}>
              <T size={12} w="bold" color={l.side === 'buy' ? colors.up : colors.down} style={{ width: 54 }}>
                {t(l.side === 'buy' ? 'tr_buy' : 'tr_sell')}
              </T>
              <N size={12} style={{ flex: 1 }}>
                {l.qty} × {l.symbol} @ {usd(l.price)}
              </N>
              <T size={11} color={colors.textMute}>
                {new Date(l.at).toLocaleDateString(t.lang === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short' })} {fmtTime(new Date(l.at).toISOString(), t.lang)}
              </T>
            </Row>
          ))}
        </View>
      )}
    </View>
  );
}

function TradeTicket({ me, initial, onClose }: { me: Player; initial: { side: 'buy' | 'sell'; symbol?: string }; onClose: (msg?: string) => void }) {
  const t = useT();
  const { report } = useData();
  const market = useMarketStatus();
  const [side, setSide] = useState(initial.side);
  const [symbol, setSymbol] = useState(initial.symbol ?? '');
  const [qtyText, setQtyText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const q = report.quotes[symbol];
  const held = me.holdings[symbol]?.qty ?? 0;
  const qty = Math.floor(Number(qtyText) || 0);
  const maxBuy = q ? Math.floor(me.cash / q.price) : 0;
  const total = q ? qty * q.price : 0;
  const block = tradeBlock(market, report.generatedAt);
  const left = tradesLeft(me);

  const suggestions = useMemo(() => {
    const s = symbol.trim().toUpperCase();
    if (side === 'sell') return Object.keys(me.holdings).filter((x) => x !== s).map((x) => [x, report.quotes[x]?.name ?? x] as const);
    if (!s || report.quotes[s]) return [];
    return Object.entries(report.quotes)
      .filter(([k, v]) => k.startsWith(s) || v.name.toUpperCase().includes(s))
      .slice(0, 5)
      .map(([k, v]) => [k, v.name] as const);
  }, [symbol, side, report, me]);

  const reason = block === 'closed' ? t('tr_closed_note') : block === 'stale' ? t('tr_stale') : !left ? t('lg_err_no_trades_left') : null;
  const valid = !!q && qty > 0 && (side === 'buy' ? qty <= maxBuy : qty <= held) && !reason;

  const submit = async () => {
    if (!valid || busy || !q) return;
    setBusy(true);
    setErr(null);
    try {
      await trade(side, symbol, qty, q.price);
      onClose(t('lg_done', { s: `${t(side === 'buy' ? 'tr_buy' : 'tr_sell')} ${qty} × ${symbol} @ ${usd(q.price)}` }));
    } catch (e) {
      setErr(errText(String((e as { code?: string; message?: string })?.code ?? (e as Error).message), t));
      setBusy(false);
    }
  };

  const input = { backgroundColor: colors.card, color: colors.text, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.medium, fontSize: 16, textAlign: 'left' as const, writingDirection: 'ltr' as const };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => onClose()}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <Pressable style={{ flex: 1 }} onPress={() => onClose()} accessibilityLabel={t('cancel')} />
        <View style={{ backgroundColor: colors.bgElevated, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space(5), gap: space(3), maxWidth: 640, width: '100%', alignSelf: 'center' }}>
          <Row style={{ gap: 8 }}>
            <Chip label={t('tr_buy')} active={side === 'buy'} onPress={() => setSide('buy')} />
            <Chip label={t('tr_sell')} active={side === 'sell'} onPress={() => setSide('sell')} />
            <View style={{ flex: 1 }} />
            <T size={12} color={colors.textDim}>
              {t('lg_trades_left')}: {left}/{TRADES_PER_DAY}
            </T>
          </Row>
          <TextInput value={symbol} onChangeText={(v) => setSymbol(v.toUpperCase())} placeholder="AAPL" placeholderTextColor={colors.textMute} autoCapitalize="characters" autoCorrect={false} accessibilityLabel={t('ah_symbol')} style={input} />
          {suggestions.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {suggestions.map(([s, name]) => (
                <Chip key={s} label={`${s} · ${name}`.slice(0, 28)} onPress={() => setSymbol(s)} />
              ))}
            </ScrollView>
          )}
          {q && (
            <Row style={{ justifyContent: 'space-between' }}>
              <T size={13} color={colors.textDim} numberOfLines={1} style={{ flex: 1 }}>
                {q.name}
              </T>
              <N w="bold">{usd(q.price)}</N>
            </Row>
          )}
          <Row style={{ gap: 8 }}>
            <TextInput value={qtyText} onChangeText={(v) => setQtyText(v.replace(/[^0-9]/g, ''))} placeholder={t('lg_qty')} placeholderTextColor={colors.textMute} keyboardType="number-pad" accessibilityLabel={t('lg_qty')} style={[input, { flex: 1 }]} />
            <Chip label={t('lg_max')} onPress={() => setQtyText(String(side === 'buy' ? maxBuy : held))} />
          </Row>
          {q && qty > 0 && (
            <T size={13} color={colors.textDim}>
              {t('lg_total', { v: usd(total) })} · {t('lg_cash_after', { v: usd(side === 'buy' ? me.cash - total : me.cash + total) })}
            </T>
          )}
          {(reason || err) && (
            <T size={12} color={colors.warn}>
              {err ?? reason}
            </T>
          )}
          <Button label={t(side === 'buy' ? 'tr_buy' : 'tr_sell')} icon={side === 'buy' ? 'plus' : 'minus'} variant={side === 'buy' ? 'primary' : 'danger'} onPress={submit} style={{ opacity: valid && !busy ? 1 : 0.5 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function LeaveButton({ me }: { me: Player }) {
  const t = useT();
  const [armed, setArmed] = useState(false);
  return (
    <Pressable
      onPress={() => {
        if (!armed) {
          setArmed(true);
          setTimeout(() => setArmed(false), 6000);
        } else leaveLeague(me).catch(() => {});
      }}
      accessibilityRole="button"
      style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 }}
    >
      <T size={13} color={colors.down}>
        {armed ? t('lg_leave_confirm') : t('lg_leave')}
      </T>
    </Pressable>
  );
}

function Mini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgElevated, borderRadius: radius.md, padding: 10 }}>
      <N w="black" size={18} color={color}>
        {value}
      </N>
      <T size={11} color={colors.textDim}>
        {label}
      </T>
    </View>
  );
}
