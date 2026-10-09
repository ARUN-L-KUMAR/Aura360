import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth';
import { spacing, useTheme } from '@/theme';

export default function LoginScreen() {
  const { signIn, serverUrl, setServerUrl } = useAuth();
  const { colors } = useTheme();
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
      <View style={{ gap: spacing.xs, marginBottom: spacing.lg }}>
        <Text variant="title">Aura360</Text>
        <Text muted>Sign in to your personal dashboard.</Text>
      </View>

      <View style={{ gap: spacing.md }}>
        <Input
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
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {error ? <Text color="danger">{error}</Text> : null}
        <Button title="Sign in" onPress={submit} loading={loading} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
        <Text muted>New here?</Text>
        <Link href="/sign-up" style={{ color: colors.text, fontWeight: '600' }}>
          Create an account
        </Link>
      </View>

      <View style={{ gap: spacing.sm, alignItems: 'center' }}>
        <Pressable onPress={() => setShowServer((v) => !v)} hitSlop={8}>
          <Text variant="caption" muted>
            Server: {serverUrl}
          </Text>
        </Pressable>
        {showServer ? (
          <View style={{ alignSelf: 'stretch', gap: spacing.sm }}>
            <Input
              value={serverDraft}
              onChangeText={setServerDraft}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="https://your-server.example.com"
            />
            <Button title="Save server address" variant="secondary" onPress={saveServer} />
            <Button
              title="Use automatic address"
              variant="ghost"
              onPress={async () => {
                await setServerUrl(null);
                setServerDraft('');
                setShowServer(false);
              }}
            />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
