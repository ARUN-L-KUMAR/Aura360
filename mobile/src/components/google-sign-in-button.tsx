import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth';
import { radius, spacing, useTheme } from '@/theme';

WebBrowser.maybeCompleteAuthSession();

// The Google Web Client ID configured on Google Cloud Console
const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  '879007995314-604j7n663sbg1fou4aakkq4suvmlgrfq.apps.googleusercontent.com';

interface Props {
  onError?: (error: string) => void;
}

export function GoogleSignInButton({ onError }: Props) {
  const { signInWithGoogle } = useAuth();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      disabled={!request || loading}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isDark ? '#ffffff' : '#ffffff',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : colors.border,
          opacity: pressed || !request ? 0.8 : 1,
        },
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color="#1f2937" />
      ) : (
        <View style={styles.content}>
          <Ionicons name="logo-google" size={20} color="#ea4335" />
          <Text style={styles.text}>Continue with Google</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
});
