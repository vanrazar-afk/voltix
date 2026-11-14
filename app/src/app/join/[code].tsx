import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { colors, space } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import { useApp, verifiedUid } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { chatAvailable, getInvite, joinWithInvite, type Invite } from '@/lib/chat';
import { T, Card, Button } from '@/components/ui';
import { SignInPrompt } from '@/components/SignInPrompt';

/** Landing page of an invite link: VOLTIX-URL/join/<code> */
export default function Join() {
  const t = useT();
  const { code } = useLocalSearchParams<{ code: string }>();
  const uid = useApp((s) => verifiedUid(s.account));
  const auth = useAuth();
  const [inv, setInv] = useState<Invite | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!uid || !chatAvailable()) return;
    getInvite(code)
      .then((i) => setInv(i && i.expiresAt.getTime() > Date.now() ? i : null))
      .catch(() => setInv(null));
  }, [uid, code]);

  const join = async () => {
    if (!inv) return;
    setBusy(true);
    setErr(null);
    try {
      const roomId = await joinWithInvite(inv);
      router.replace({ pathname: '/chat/[id]', params: { id: roomId } });
    } catch (e) {
      // Already a member? The join update is refused, but the room opens fine.
      router.replace({ pathname: '/chat/[id]', params: { id: inv.roomId } });
      setErr(String((e as { code?: string })?.code ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: space(5), justifyContent: 'center' }}>
      <Card style={{ gap: space(4), alignItems: 'center', paddingVertical: space(8), maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <Feather name="users" size={36} color={colors.brand2} />
        {!chatAvailable() ? (
          <T color={colors.textDim} style={{ textAlign: 'center' }}>
            {t('ch_unavailable')}
          </T>
        ) : !uid ? (
          <SignInPrompt text={t('ch_need_google')} returnTo={`/join/${code}`} />
        ) : inv === undefined ? (
          <T color={colors.textDim}>…</T>
        ) : inv === null ? (
          <T color={colors.textDim} style={{ textAlign: 'center' }}>
            {t('ch_join_bad')}
          </T>
        ) : (
          <>
            <T w="black" size={22} style={{ textAlign: 'center' }} accessibilityRole="header">
              {inv.roomName}
            </T>
            <T color={colors.textDim}>{t(`topic_${inv.topic}` as 'topic_general')}</T>
            <Button label={t('ch_join')} icon="log-in" onPress={join} style={{ opacity: busy ? 0.6 : 1, alignSelf: 'stretch' }} />
            <T size={12} color={colors.textMute} style={{ textAlign: 'center' }}>
              {t('ch_rules')}
            </T>
          </>
        )}
        {err && (
          <T size={12} color={colors.warn}>
            {err}
          </T>
        )}
      </Card>
    </View>
  );
}
