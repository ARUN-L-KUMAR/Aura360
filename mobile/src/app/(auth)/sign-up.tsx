import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { GoogleSignInButton } from '@/components/google-sign-in-button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { api, ApiError } from '@/lib/api';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

export default function SignUpScreen() {
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!email.trim() || password.length < 8) {
      setError('Enter your email and a password of at least 8 characters.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api('/api/auth/register', {
        method: 'POST',
        anonymous: true,
        body: { name: name.trim() || undefined, email: email.trim(), password },
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Screen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <GlassCard
          glowColor={moduleColors.ai}
          style={{
            gap: spacing.md,
            padding: spacing.xl,
            alignItems: 'center',
            backgroundColor: isDark ? 'rgba(18, 26, 36, 0.95)' : '#ffffff',
          }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.pill,
              backgroundColor: `${colors.success}18`,
              borderWidth: 1.5,
              borderColor: colors.success,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="mail-open-outline" size={28} color={colors.success} />
          </View>
          <Text variant="heading" style={{ textAlign: 'center' }}>
            Check your email
          </Text>
          <Text muted style={{ textAlign: 'center' }}>
            We sent a verification link to {email.trim()}. Open it, then sign in to your new workspace.
          </Text>
          <Link href="/login" style={{ color: moduleColors.ai, fontWeight: '700', marginTop: spacing.xs }}>
            Back to sign in
          </Link>
        </GlassCard>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
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
          Create account
        </Text>
        <Text muted style={{ fontSize: 15, textAlign: 'center' }}>
          Finance, fitness, food and productivity in one place
        </Text>
      </View>

      <GlassCard
        glowColor={moduleColors.ai}
        style={{
          gap: spacing.md,
          padding: spacing.xl,
          backgroundColor: isDark ? 'rgba(18, 26, 36, 0.95)' : '#ffffff',
        }}>
        <Input
          label="Full Name (optional)"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
          placeholder="Arun Kumar"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />

        <Input
          ref={emailRef}
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
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="At least 8 characters"
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

        <Button title="Create Account" onPress={submit} loading={loading} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.xs }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <Text variant="caption" muted style={{ fontWeight: '600', textTransform: 'uppercase' }}>
            or
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </View>

        <GoogleSignInButton onError={setError} />

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, paddingTop: spacing.xs }}>
          <Text muted>Already have an account?</Text>
          <Link href="/login" style={{ color: moduleColors.ai, fontWeight: '700' }}>
            Sign in
          </Link>
        </View>
      </GlassCard>
    </Screen>
  );
}
