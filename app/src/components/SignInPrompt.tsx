import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { colors, space } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useApp } from '@/lib/store';
import { T, Card, Button } from './ui';
import { VerifyEmailCard } from './VerifyEmailCard';

/** "Sign in to use this" — Google or email; for unconfirmed email accounts shows the confirmation step. */
export function SignInPrompt({ text, returnTo }: { text: string; returnTo?: string }) {
  const t = useT();
  const auth = useAuth();
  const account = useApp((s) => s.account);
  if (account?.mode === 'email' && account.verified === false) return <VerifyEmailCard />;
  return (
    <Card style={{ gap: space(3), alignItems: 'center', paddingVertical: space(6) }}>
      <Feather name="users" size={30} color={colors.brand2} />
      <T color={colors.textDim} style={{ textAlign: 'center' }}>
        {text}
      </T>
      {auth.available && (
        <Button
          label={t('login_google')}
          icon="log-in"
          onPress={() => {
            if (returnTo) useApp.getState().setPendingPath(returnTo);
            auth.signInWithGoogle();
          }}
          style={{ alignSelf: 'stretch' }}
        />
      )}
      {auth.available && (
        <Button
          label={t('login_email')}
          icon="mail"
          variant="ghost"
          onPress={() => {
            if (returnTo) useApp.getState().setPendingPath(returnTo);
            router.push('/auth-email');
          }}
          style={{ alignSelf: 'stretch' }}
        />
      )}
    </Card>
  );
}
