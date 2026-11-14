import { useState } from 'react';
import { Image, Modal, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { colors, radius, space } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import { useApp } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { T, Row, LangToggle } from './ui';
import { GoogleButton } from './GoogleButton';

/** Round avatar: the Google profile photo when signed in with Google, otherwise a generic person icon. */
export function Avatar({ size = 36 }: { size?: number }) {
  const account = useApp((s) => s.account);
  const photo = account?.mode === 'google' ? account.photo : null;
  if (photo) return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2 }} accessible={false} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.cardHi, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
      <Feather name="user" size={size * 0.52} color={colors.textDim} />
    </View>
  );
}

/** Avatar button (top corner of each tab) that opens the account menu: guide, settings, language, sign-in/out. */
export function ProfileButton() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const account = useApp((s) => s.account);
  const auth = useAuth();
  const signedIn = !!account && account.mode !== 'guest';

  const go = (path: '/guide' | '/settings' | '/accessibility') => {
    setOpen(false);
    router.push(path);
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={t('menu_open')} hitSlop={6} style={{ padding: 2 }}>
        <Avatar size={38} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={() => setOpen(false)} accessibilityLabel={t('cancel')}>
          <Pressable
            onPress={() => {}}
            style={{
              position: 'absolute',
              top: space(14),
              start: space(4),
              width: 300,
              maxWidth: '92%',
              backgroundColor: colors.bgElevated,
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.border,
              padding: space(4),
              gap: 4,
            } as object}
          >
            <Row style={{ gap: 12, paddingBottom: space(3), borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 4 }}>
              <Avatar size={48} />
              <View style={{ flex: 1 }}>
                <T w="bold" size={16} numberOfLines={1}>
                  {signedIn ? account?.name || account?.email : t('menu_guest')}
                </T>
                <T size={12} color={colors.textDim} numberOfLines={1}>
                  {signedIn ? account?.email : t('menu_guest_sub')}
                </T>
              </View>
            </Row>
            <Item icon="book-open" label={t('tab_learn')} onPress={() => go('/guide')} />
            <Item icon="settings" label={t('tab_settings')} onPress={() => go('/settings')} />
            <Item icon="eye" label={t('st_a11y')} onPress={() => go('/accessibility')} />
            <Row style={{ justifyContent: 'space-between', minHeight: 48 }}>
              <Row style={{ gap: 12 }}>
                <Feather name="globe" size={18} color={colors.textDim} />
                <T>{t('st_lang')}</T>
              </Row>
              <LangToggle />
            </Row>
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
            {signedIn ? (
              <Item
                icon="log-out"
                label={t('st_sign_out')}
                onPress={() => {
                  setOpen(false);
                  auth.signOutUser();
                }}
              />
            ) : auth.available ? (
              <>
                <View style={{ paddingVertical: 6 }}>
                  <GoogleButton width={260} onBefore={() => setOpen(false)} />
                </View>
                <Item
                  icon="mail"
                  label={t('login_email')}
                  onPress={() => {
                    setOpen(false);
                    router.push('/auth-email');
                  }}
                />
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function Item({ icon, label, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 4, borderRadius: radius.md, backgroundColor: pressed ? colors.cardHi : 'transparent' })}
    >
      <Feather name={icon} size={18} color={colors.textDim} />
      <T>{label}</T>
    </Pressable>
  );
}

/** Standard top bar for tab screens: avatar (start) + title + optional trailing element. */
export function TabHeader({ title, trailing }: { title: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', gap: 12, marginBottom: space(3) }}>
      <Row style={{ gap: 12, flex: 1 }}>
        <ProfileButton />
        {typeof title === 'string' ? (
          <T w="black" size={24} accessibilityRole="header" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </T>
        ) : (
          title
        )}
      </Row>
      {trailing}
    </Row>
  );
}
