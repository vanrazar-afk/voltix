import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, radius, space } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useApp } from '@/lib/store';
import { T, Button, Chip } from '@/components/ui';
import { VerifyEmailCard } from '@/components/VerifyEmailCard';

const errKey = (code: string) => {
  const c = code.replace(/^.*auth\//, '').replace(/\).*$/, '');
  const map: Record<string, string> = {
    'email-already-in-use': 'em_err_exists',
    'invalid-email': 'em_err_email',
    'weak-password': 'em_err_weak',
    'invalid-credential': 'em_err_cred',
    'wrong-password': 'em_err_cred',
    'user-not-found': 'em_err_cred',
    'too-many-requests': 'em_err_many',
    'operation-not-allowed': 'em_err_disabled',
  };
  return map[c] ?? 'em_err_generic';
};

/** Sign in / create an account with email + password (Firebase). */
export default function EmailAuth() {
  const t = useT();
  const auth = useAuth();
  const account = useApp((s) => s.account);
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);

  const done = () => {
    const s = useApp.getState();
    const next = s.pendingPath;
    s.setPendingPath(null);
    if (!s.disclaimerAcceptedAt) router.replace('/onboarding');
    else router.replace((next || '/') as never);
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'reset') {
        await auth.resetPassword(email);
        setMsg({ text: t('em_reset_sent'), ok: true });
      } else if (mode === 'up') {
        await auth.signUpEmail(name, email, pw);
      } else {
        await auth.signInEmail(email, pw);
        if (useApp.getState().account?.verified) done();
      }
    } catch (e) {
      const code = String((e as { code?: string })?.code ?? (e as Error).message);
      setMsg({ text: t(errKey(code) as 'em_err_generic') });
    } finally {
      setBusy(false);
    }
  };

  // Signed in with email but not confirmed yet → verification step
  if (account?.mode === 'email' && account.verified === false) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: space(5), gap: space(4), maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <VerifyEmailCard onVerified={done} />
        <Button label={t('em_later')} variant="ghost" onPress={done} />
      </ScrollView>
    );
  }
  if (account && account.mode !== 'guest') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: space(6), gap: space(4), justifyContent: 'center' }}>
        <T style={{ textAlign: 'center' }}>{t('st_signed_in', { n: account.name || account.email || '' })}</T>
        <Button label={t('ch_open')} onPress={done} />
      </View>
    );
  }

  const input = {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.medium,
    fontSize: 16,
  };
  const ltr = { textAlign: 'left' as const, writingDirection: 'ltr' as const };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space(5), gap: space(3), maxWidth: 520, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <T w="black" size={24} accessibilityRole="header">
          {t(mode === 'up' ? 'em_title_up' : mode === 'reset' ? 'em_title_reset' : 'em_title_in')}
        </T>
        {mode !== 'reset' && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label={t('em_tab_in')} active={mode === 'in'} onPress={() => setMode('in')} />
            <Chip label={t('em_tab_up')} active={mode === 'up'} onPress={() => setMode('up')} />
          </View>
        )}
        {mode === 'up' && (
          <TextInput value={name} onChangeText={setName} placeholder={t('em_name')} placeholderTextColor={colors.textMute} maxLength={40} accessibilityLabel={t('em_name')} style={[input, { textAlign: t.lang === 'he' ? 'right' : 'left' }]} />
        )}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={t('em_email')}
          placeholderTextColor={colors.textMute}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          accessibilityLabel={t('em_email')}
          style={[input, ltr]}
        />
        {mode !== 'reset' && (
          <TextInput
            value={pw}
            onChangeText={setPw}
            placeholder={t('em_password')}
            placeholderTextColor={colors.textMute}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
            accessibilityLabel={t('em_password')}
            onSubmitEditing={submit}
            style={[input, ltr]}
          />
        )}
        {mode === 'up' && (
          <T size={12} color={colors.textMute}>
            {t('em_pw_rule')}
          </T>
        )}
        {msg && (
          <T size={13} color={msg.ok ? colors.up : colors.down}>
            {msg.text}
          </T>
        )}
        <Button label={t(mode === 'up' ? 'em_create' : mode === 'reset' ? 'em_send_reset' : 'em_sign_in')} onPress={submit} style={{ opacity: busy ? 0.6 : 1 }} />
        <Pressable onPress={() => (setMode(mode === 'reset' ? 'in' : 'reset'), setMsg(null))} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'center' }}>
          <T size={13} color={colors.brand2}>
            {t(mode === 'reset' ? 'em_back' : 'em_forgot')}
          </T>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
