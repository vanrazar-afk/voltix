import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import Constants from 'expo-constants';
import { preferGoogleRedirect, startGoogleRedirect, useAuth } from '@/lib/auth';
import { useApp } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { colors } from '@/lib/theme';
import { T, Button } from './ui';

/**
 * Google's own "Sign in with Google" button (Google Identity Services). Unlike the Firebase popup/redirect,
 * it does not depend on third-party cookies or the firebaseapp.com helper, so it works on our GitHub Pages
 * address, in installed (home-screen) web apps and on mobile browsers. The ID token is handed to Firebase.
 */
const CLIENT_ID = (Constants.expoConfig?.extra as { googleWebClientId?: string } | undefined)?.googleWebClientId ?? '';

type Gis = {
  accounts: {
    id: {
      initialize: (o: Record<string, unknown>) => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
    };
  };
};
declare global {
  interface Window {
    google?: Gis;
  }
}

let loading: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no-window'));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        loading = null;
        reject(new Error('gis-load-failed'));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

// One global callback; the most recently mounted button decides what happens before sign-in.
let beforeSignIn: (() => void) | null = null;
let onToken: ((idToken: string) => void) | null = null;
let initialized = false;

export function GoogleButton({ onBefore, width = 300 }: { onBefore?: () => void; width?: number }) {
  const t = useT();
  const auth = useAuth();
  const ref = useRef<unknown>(null);
  const [failed, setFailed] = useState(false);
  const [redirect] = useState(preferGoogleRedirect);

  useEffect(() => {
    beforeSignIn = onBefore ?? null;
    onToken = (tok) => {
      beforeSignIn?.();
      auth.signInWithGoogleIdToken(tok).catch(() => {});
    };
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || !CLIENT_ID || redirect) return;
    let alive = true;
    loadGis()
      .then(() => {
        if (!alive || !window.google) return;
        if (!initialized) {
          window.google.accounts.id.initialize({
            client_id: CLIENT_ID,
            callback: (r: { credential?: string }) => r.credential && onToken?.(r.credential),
            ux_mode: 'popup',
            auto_select: false,
            itp_support: true,
            use_fedcm_for_button: true,
          });
          initialized = true;
        }
        const el = ref.current as unknown as HTMLElement | null;
        if (el) {
          el.innerHTML = '';
          window.google.accounts.id.renderButton(el, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            shape: 'pill',
            text: 'continue_with',
            logo_alignment: 'left',
            locale: t.lang === 'he' ? 'he' : 'en',
            width: Math.min(400, Math.max(200, Math.round(width))),
          });
        }
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [t.lang, width]);

  // Phones / home-screen app: full-page redirect to Google and back (no pop-up window)
  if (redirect) {
    return (
      <View style={{ alignSelf: 'stretch', gap: 6 }}>
        <Button
          label={t('login_google')}
          icon="log-in"
          onPress={() => {
            onBefore?.();
            startGoogleRedirect(useApp.getState().pendingPath);
          }}
        />
        {!!auth.error && (
          <T size={12} color={colors.warn} style={{ textAlign: 'center' }}>
            {auth.error}
          </T>
        )}
      </View>
    );
  }
  // Native builds or Google script blocked: fall back to the Firebase flow
  if (Platform.OS !== 'web' || !CLIENT_ID || failed) {
    return <Button label={t('login_google')} icon="log-in" onPress={() => (onBefore?.(), auth.signInWithGoogle())} />;
  }
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View ref={ref as never} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={t('login_google')} />
      {!!auth.error && (
        <T size={12} color={colors.warn}>
          {auth.error}
        </T>
      )}
    </View>
  );
}
