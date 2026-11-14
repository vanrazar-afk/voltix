import { useState } from 'react';
import Feather from '@expo/vector-icons/Feather';
import { colors, space } from '@/lib/theme';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useApp } from '@/lib/store';
import { T, Card, Button } from './ui';

/** Shown to email users until they click the confirmation link (groups and the league need a confirmed address). */
export function VerifyEmailCard({ onVerified }: { onVerified?: () => void }) {
  const t = useT();
  const auth = useAuth();
  const email = useApp((s) => s.account?.email);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <Card style={{ gap: space(3), alignItems: 'center' }}>
      <Feather name="mail" size={32} color={colors.brand2} />
      <T w="bold" size={17} style={{ textAlign: 'center' }}>
        {t('em_verify_t')}
      </T>
      <T color={colors.textDim} style={{ textAlign: 'center' }}>
        {t('em_verify_b', { e: email ?? '' })}
      </T>
      <Button
        label={t('em_verified_btn')}
        icon="check"
        onPress={async () => {
          const ok = await auth.refreshVerification().catch(() => false);
          if (ok) onVerified?.();
          else setMsg(t('em_not_yet'));
        }}
      />
      <Button
        label={t('em_resend')}
        variant="ghost"
        onPress={() => auth.resendVerification().then(() => setMsg(t('em_resent'))).catch(() => setMsg(t('em_err_many')))}
      />
      {msg && (
        <T size={12} color={colors.warn} style={{ textAlign: 'center' }}>
          {msg}
        </T>
      )}
    </Card>
  );
}
