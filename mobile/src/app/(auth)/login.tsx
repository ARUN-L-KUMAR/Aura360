import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { GoogleSignInButton } from '@/components/google-sign-in-button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

export default function LoginScreen() {
  const { signIn, serverUrl, setServerUrl } = useAuth();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showServer, setShowServer] = useState(false);
  const [serverDraft, setServerDraft] = useState(serverUrl);

  async function submit() {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function saveServer() {
    await setServerUrl(serverDraft);
    setShowServer(false);
  }

  return (
    <Screen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      {/* Brand Hero Halo */}
      <View style={{ alignItems: 'center', marginBottom: spacing.xl, gap: spacing.sm }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 24,
            backgroundColor: isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.1)',
            borderWidth: 1.5,
            borderColor: `${moduleColors.ai}60`,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: moduleColors.ai,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 14,
            elevation: 8,
          }}>
          <Ionicons name="sparkles" size={36} color={moduleColors.ai} />
        </View>

        <Text variant="title" style={{ fontSize: 32, fontWeight: '800', letterSpacing: -0.5 }}>
          Aura360
        </Text>
        <Text muted style={{ fontSize: 15, textAlign: 'center' }}>
          Your integrated daily command center
        </Text>
      </View>

      {/* Login Form in GlassCard */}
      <GlassCard
        glowColor={moduleColors.ai}
        style={{
          gap: spacing.md,
          padding: spacing.xl,
          backgroundColor: isDark ? 'rgba(18, 26, 36, 0.95)' : '#ffffff',
        }}>
        <Input
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="user@example.com"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <Input
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          placeholder="••••••••"
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        {error ? (
          <View
            style={{
              padding: spacing.md,
              borderRadius: radius.md,
              backgroundColor: `${colors.danger}18`,
              borderWidth: 1,
              borderColor: `${colors.danger}40`,
            }}>
            <Text color="danger" style={{ fontWeight: '600' }}>
              {error}
            </Text>
          </View>
        ) : null}

        <Button title="Sign in" onPress={submit} loading={loading} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.xs }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <Text variant="caption" muted style={{ fontWeight: '600', textTransform: 'uppercase' }}>
            or
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </View>

        <GoogleSignInButton onError={setError} />

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, paddingTop: spacing.xs }}>
          <Text muted>New to Aura?</Text>
          <Link href="/sign-up" style={{ color: moduleColors.ai, fontWeight: '700' }}>
            Create an account
          </Link>
        </View>
      </GlassCard>

      {/* Server Endpoint Config */}
      <View style={{ gap: spacing.sm, alignItems: 'center', marginTop: spacing.xl }}>
        <Pressable onPress={() => setShowServer((v) => !v)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="settings-outline" size={14} color={colors.textMuted} />
          <Text variant="caption" muted>
            Server: {serverUrl}
          </Text>
        </Pressable>

        {showServer ? (
          <GlassCard style={{ alignSelf: 'stretch', gap: spacing.sm, padding: spacing.md }}>
            <Input
              label="Backend URL"
              value={serverDraft}
              onChangeText={setServerDraft}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="https://your-server.example.com"
            />
            <Button title="Save Server URL" variant="secondary" onPress={saveServer} />
            <Button
              title="Reset to default local URL"
              variant="ghost"
              onPress={async () => {
                await setServerUrl(null);
                setServerDraft('');
                setShowServer(false);
              }}
            />
          </GlassCard>
        ) : null}
      </View>
    </Screen>
  );
}
