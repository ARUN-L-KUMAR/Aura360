import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { analytics } from '@/lib/telemetry';
import { userErrorMessage } from '@/lib/user-error';
import { useAuth } from '@/providers/auth';

WebBrowser.maybeCompleteAuthSession();

// The Google Web Client ID configured on Google Cloud Console
const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  '879007995314-604j7n663sbg1fou4aakkq4suvmlgrfq.apps.googleusercontent.com';

interface Props {
  /** Called with a message when sign-in fails, and with an empty string when a new attempt starts (to clear it). */
  onError?: (error: string) => void;
}

export function GoogleSignInButton({ onError }: Props) {
  const { t } = useTranslation('auth');
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const [request, , promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_CLIENT_ID,
    responseType: 'id_token',
    scopes: ['openid', 'profile', 'email'],
  });

  async function handlePress() {
    try {
      onError?.('');
      setLoading(true);
      const res = await promptAsync();
      if (res.type === 'success') {
        const idToken = res.params?.id_token || res.authentication?.idToken;
        if (idToken) {
          await signInWithGoogle(idToken);
          // Google can create the account on first use, so this is reported as a sign-in either way.
          analytics.track('sign_in', { method: 'google' });
        } else {
          onError?.(t('social.googleNoToken'));
        }
      } else if (res.type === 'error') {
        onError?.(t('social.googleFailed'));
      }
    } catch (e) {
      onError?.(userErrorMessage(e, t('social.googleFailed'), { unauthorized: t('social.googleFailed') }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      title={t('social.google')}
      variant="tertiary"
      leftIcon="logo-google"
      loading={loading}
      disabled={!request}
      onPress={handlePress}
      accessibilityHint={t('social.googleHint')}
    />
  );
}
