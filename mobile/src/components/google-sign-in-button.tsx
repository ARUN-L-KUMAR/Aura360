import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
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
        } else {
          onError?.('No ID token received from Google.');
        }
      } else if (res.type === 'error') {
        onError?.(res.error?.message || 'Google sign-in was cancelled or encountered an error.');
      }
    } catch (e) {
      onError?.(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Could not launch Google authentication window.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      title="Continue with Google"
      variant="tertiary"
      leftIcon="logo-google"
      loading={loading}
      disabled={!request}
      onPress={handlePress}
      accessibilityHint="Opens Google to sign in"
    />
  );
}
