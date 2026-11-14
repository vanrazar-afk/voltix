import { useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, Share, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { colors, fonts, radius, space } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import { useData } from '@/lib/data';
import { useApp } from '@/lib/store';
import { fmtTime } from '@/lib/format';
import {
  createInvite,
  deleteMessage,
  deleteRoom,
  leaveRoom,
  MAX_MESSAGE,
  reportMessage,
  sendMessage,
  tokenize,
  useMessages,
  useRoom,
  type Message,
  type Room,
} from '@/lib/chat';
import { T, N, Row, Button } from '@/components/ui';

type MenuItem = { label: string; icon: keyof typeof Feather.glyphMap; danger?: boolean; onPress: () => void };

export default function ChatRoom() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const room = useRoom(id);
  const messages = useMessages(id);
  const uid = useApp((s) => (s.account?.mode === 'google' ? s.account.uid : null));
  const blocked = useApp((s) => s.blocked);
  const toggleBlock = useApp((s) => s.toggleBlock);
  const { report } = useData();
  const [text, setText] = useState('');
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);

  const flash = (s: string) => {
    setNote(s);
    setTimeout(() => setNote((n) => (n === s ? null : n)), 5000);
  };

  const invite = async (r: Room) => {
    if (inviteBusy) return;
    setInviteBusy(true);
    try {
      const url = await createInvite(r);
      const msg = `${t('ch_invite_msg', { n: r.name })} ${url}`;
      if (Platform.OS !== 'web') await Share.share({ message: msg });
      else if (typeof navigator !== 'undefined' && (navigator as Navigator).share) await (navigator as Navigator).share({ title: 'VOLTIX', text: t('ch_invite_msg', { n: r.name }), url }).catch(() => {});
      else {
        await navigator.clipboard?.writeText(msg);
        flash(t('ch_invite_copied'));
      }
    } catch (e) {
      flash(String((e as { code?: string })?.code ?? e));
    } finally {
      setInviteBusy(false);
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    try {
      await sendMessage(id, body);
    } catch (e) {
      setText(body);
      flash(String((e as { code?: string })?.code ?? e));
    }
  };

  const messageMenu = (m: Message) => {
    const mine = m.uid === uid;
    const items: MenuItem[] = [];
    if (mine) items.push({ label: t('ch_del_msg'), icon: 'trash-2', danger: true, onPress: () => deleteMessage(id, m.id).catch(() => {}) });
    else {
      items.push({
        label: t('ch_report'),
        icon: 'flag',
        danger: true,
        onPress: () => reportMessage(id, m, 'user-report').then(() => flash(t('ch_reported'))).catch((e) => flash(String(e?.code ?? e))),
      });
      items.push({ label: t(blocked.includes(m.uid) ? 'ch_unblock' : 'ch_block', { n: m.name }), icon: 'eye-off', onPress: () => toggleBlock(m.uid) });
    }
    setMenu(items);
  };

  const roomMenu = (r: Room) => {
    const items: MenuItem[] = [{ label: t('ch_invite'), icon: 'user-plus', onPress: () => invite(r) }];
    if (r.ticker) items.push({ label: r.ticker, icon: 'trending-up', onPress: () => router.push({ pathname: '/stock/[symbol]', params: { symbol: r.ticker! } }) });
    items.push({ label: t('ch_leave'), icon: 'log-out', danger: true, onPress: () => leaveRoom(id).then(() => router.back()).catch(() => {}) });
    if (r.createdBy === uid) items.push({ label: t('ch_delete'), icon: 'trash-2', danger: true, onPress: () => deleteRoom(id).then(() => router.back()).catch(() => {}) });
    setMenu(items);
  };

  if (room === undefined) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (room === null || !uid) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: space(6), alignItems: 'center', justifyContent: 'center', gap: space(4) }}>
        <Stack.Screen options={{ title: '' }} />
        <T color={colors.textDim} style={{ textAlign: 'center' }}>
          {t('ch_gone')}
        </T>
        <Button label={t('tab_chats')} onPress={() => router.replace('/chats')} variant="ghost" />
      </View>
    );
  }

  const known = (s: string) => !!report.quotes[s];
  const visible = messages ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: room.name,
          headerRight: () => (
            <Row style={{ gap: 4 }}>
              <Pressable onPress={() => invite(room)} accessibilityRole="button" accessibilityLabel={t('ch_invite')} style={{ padding: 10 }}>
                <Feather name="user-plus" size={20} color={colors.text} />
              </Pressable>
              <Pressable onPress={() => roomMenu(room)} accessibilityRole="button" accessibilityLabel="menu" style={{ padding: 10 }}>
                <Feather name="more-vertical" size={20} color={colors.text} />
              </Pressable>
            </Row>
          ),
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={{ flex: 1, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
          <Row style={{ paddingHorizontal: space(4), paddingVertical: 6, gap: 8 }}>
            <T size={12} color={colors.textDim}>
              {t(`topic_${room.topic}` as 'topic_general')}
              {room.ticker ? ` · ${room.ticker}` : ''} · {t('ch_members', { n: room.members.length })}
            </T>
          </Row>
          {room.members.length < 2 && (
            <View style={{ marginHorizontal: space(4), marginBottom: 8, padding: space(4), borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 10 }}>
              <T size={14} color={colors.textDim}>
                {t('ch_first')}
              </T>
              <Button label={t('ch_invite')} icon="user-plus" onPress={() => invite(room)} />
            </View>
          )}
          <FlatList
            inverted
            data={visible}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: space(4), gap: 8 }}
            renderItem={({ item, index }) => {
              const prevSame = visible[index + 1]?.uid === item.uid;
              return (
                <Bubble
                  m={item}
                  mine={item.uid === uid}
                  hidden={blocked.includes(item.uid)}
                  showName={!prevSame}
                  known={known}
                  onMenu={() => messageMenu(item)}
                />
              );
            }}
          />
          {note && (
            <T size={12} color={colors.warn} style={{ paddingHorizontal: space(4), paddingBottom: 4 }}>
              {note}
            </T>
          )}
          <Row style={{ gap: 8, padding: space(3), borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'flex-end' }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('ch_msg_ph')}
              placeholderTextColor={colors.textMute}
              multiline
              maxLength={MAX_MESSAGE}
              accessibilityLabel={t('ch_msg_ph')}
              onKeyPress={(e) => {
                const ne = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
                if (Platform.OS === 'web' && ne.key === 'Enter' && !ne.shiftKey) {
                  (e as unknown as { preventDefault: () => void }).preventDefault();
                  send();
                }
              }}
              style={{
                flex: 1,
                maxHeight: 120,
                minHeight: 44,
                color: colors.text,
                fontFamily: fonts.regular,
                fontSize: 15,
                backgroundColor: colors.card,
                borderRadius: 22,
                paddingHorizontal: 16,
                paddingVertical: 11,
                textAlign: t.lang === 'he' ? 'right' : 'left',
              }}
            />
            <Pressable
              onPress={send}
              accessibilityRole="button"
              accessibilityLabel={t('ch_send')}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() ? colors.brand : colors.cardHi, alignItems: 'center', justifyContent: 'center' }}
            >
              <Feather name="send" size={18} color="#fff" style={{ transform: [{ scaleX: t.lang === 'he' ? -1 : 1 }] }} />
            </Pressable>
          </Row>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={!!menu} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }} onPress={() => setMenu(null)} accessibilityLabel={t('cancel')}>
          <View style={{ backgroundColor: colors.bgElevated, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space(4), paddingBottom: space(8), gap: 4, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
            {menu?.map((it) => (
              <Pressable
                key={it.label}
                onPress={() => {
                  setMenu(null);
                  it.onPress();
                }}
                accessibilityRole="button"
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 8, borderRadius: radius.md, backgroundColor: pressed ? colors.cardHi : 'transparent' })}
              >
                <Feather name={it.icon} size={18} color={it.danger ? colors.down : colors.textDim} />
                <T color={it.danger ? colors.down : colors.text}>{it.label}</T>
              </Pressable>
            ))}
            <Pressable onPress={() => setMenu(null)} accessibilityRole="button" style={{ minHeight: 48, justifyContent: 'center', alignItems: 'center' }}>
              <T color={colors.textDim}>{t('cancel')}</T>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Bubble({ m, mine, hidden, showName, known, onMenu }: { m: Message; mine: boolean; hidden: boolean; showName: boolean; known: (s: string) => boolean; onMenu: () => void }) {
  const t = useT();
  return (
    <Row style={{ gap: 8, alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%', alignItems: 'flex-end' }}>
      {!mine && (
        <View style={{ width: 28 }}>
          {showName && m.photo ? <Image source={{ uri: m.photo }} style={{ width: 28, height: 28, borderRadius: 14 }} accessible={false} /> : null}
        </View>
      )}
      <Pressable
        onLongPress={onMenu}
        delayLongPress={350}
        accessibilityActions={[{ name: 'menu', label: mine ? t('ch_del_msg') : t('ch_report') }]}
        onAccessibilityAction={onMenu}
        accessibilityLabel={`${m.name}: ${hidden ? t('ch_hidden') : m.text}`}
        style={{
          flexShrink: 1,
          backgroundColor: mine ? colors.brand : colors.card,
          borderRadius: 16,
          borderBottomRightRadius: mine ? 4 : 16,
          borderBottomLeftRadius: mine ? 16 : 4,
          paddingHorizontal: 12,
          paddingVertical: 8,
          gap: 2,
        }}
      >
        {!mine && showName && (
          <T w="bold" size={12} color={colors.brand2}>
            {m.name}
          </T>
        )}
        {hidden ? (
          <T size={14} color={colors.textMute} style={{ fontStyle: 'italic' }}>
            {t('ch_hidden')}
          </T>
        ) : (
          <T size={15} color={mine ? '#fff' : colors.text}>
            {tokenize(m.text, known).map((p, i) =>
              p.ticker ? (
                <N
                  key={i}
                  w="bold"
                  size={15}
                  color={mine ? '#fff' : colors.brand2}
                  style={{ textDecorationLine: 'underline' }}
                  onPress={() => router.push({ pathname: '/stock/[symbol]', params: { symbol: p.ticker! } })}
                >
                  {p.text}
                </N>
              ) : (
                p.text
              ),
            )}
          </T>
        )}
        <T size={10} color={mine ? 'rgba(255,255,255,0.7)' : colors.textMute} style={{ alignSelf: 'flex-end' }}>
          {m.at ? fmtTime(m.at.toISOString()) : '…'}
        </T>
      </Pressable>
    </Row>
  );
}
