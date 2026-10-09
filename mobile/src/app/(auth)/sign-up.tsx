import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { api, ApiError } from '@/lib/api';
import { spacing, useTheme } from '@/theme';

export default function SignUpScreen() {
  const { colors } = useTheme();
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
        <Card style={{ gap: spacing.md }}>
          <Text variant="heading">Check your email</Text>
          <Text muted>
            We sent a verification link to {email.trim()}. Open it, then come back here and sign in.
          </Text>
          <Link href="/login" style={{ color: colors.text, fontWeight: '600' }}>
            Back to sign in
          </Link>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <View style={{ gap: spacing.xs, marginBottom: spacing.lg }}>
        <Text variant="title">Create account</Text>
        <Text muted>Finance, fitness, food and more in one place.</Text>
      </View>

      <View style={{ gap: spacing.md }}>
        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <Input
          ref={emailRef}
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
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
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {error ? <Text color="danger">{error}</Text> : null}
        <Button title="Create account" onPress={submit} loading={loading} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
        <Text muted>Already have an account?</Text>
        <Link href="/login" style={{ color: colors.text, fontWeight: '600' }}>
          Sign in
        </Link>
      </View>
    </Screen>
  );
}
