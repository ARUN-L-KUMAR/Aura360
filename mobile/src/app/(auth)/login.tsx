import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { AUTH_FORM_MAX_WIDTH, AuthHeader, SocialSignIn, authContentStyle } from '@/components/auth-form-parts';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordField } from '@/components/ui/password-field';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { ApiError } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/providers/auth';
import { useNotify } from '@/providers/notify';
import { layout, spacing } from '@/theme';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

function emailProblem(email: string) {
  if (!email.trim()) return 'Enter your email address.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address, like name@example.com.';
  return null;
}

function passwordProblem(password: string) {
  return password ? null : 'Enter your password.';
}

export default function LoginScreen() {
  const { signIn, serverUrl, setServerUrl } = useAuth();
  const notify = useNotify();

  const passwordRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showServerSheet, setShowServerSheet] = useState(false);
  const [serverDraft, setServerDraft] = useState(serverUrl);
  const [savingServer, setSavingServer] = useState(false);

  const emailError = touched.email ? emailProblem(email) : null;
  const passwordError = touched.password ? passwordProblem(password) : null;

  const hostDisplay = serverUrl ? serverUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : 'Local host';

  async function submit() {
    if (loading) return;
    setTouched({ email: true, password: true });
    const firstProblem = emailProblem(email) ? emailRef : passwordProblem(password) ? passwordRef : null;
    if (firstProblem) {
      haptics.error();
      firstProblem.current?.focus();
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e) {
      haptics.error();
      setError(e instanceof ApiError ? e.message : 'Invalid credentials. Check your email and password and try again.');
    } finally {
      setLoading(false);
    }
  }

  function openServerSheet() {
    setServerDraft(serverUrl);
    setShowServerSheet(true);
  }

  async function saveServer() {
    setSavingServer(true);
    try {
      await setServerUrl(serverDraft);
      setShowServerSheet(false);
      notify.success('Server address saved.');
    } catch (e) {
      notify.error(e);
    } finally {
      setSavingServer(false);
    }
  }

  async function resetServer() {
    setSavingServer(true);
    try {
      await setServerUrl(null);
      setServerDraft('');
      setShowServerSheet(false);
      notify.success('Server address reset to the default.');
    } catch (e) {
      notify.error(e);
    } finally {
      setSavingServer(false);
    }
  }

  return (
    <Screen showsVerticalScrollIndicator={false} contentContainerStyle={authContentStyle}>
      <View style={styles.column}>
        <AuthHeader title="Welcome back" subtitle="Sign in to your Aura360 workspace." />

        <View style={styles.form}>
          <Input
            ref={emailRef}
            label="Email"
            leftIcon="mail-outline"
            placeholder="name@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) setError(null);
            }}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            error={emailError}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <PasswordField
            ref={passwordRef}
            leftIcon="lock-closed-outline"
            placeholder="Enter your password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) setError(null);
            }}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            error={passwordError}
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          {error ? <Banner severity="error" title="Could not sign in" message={error} /> : null}

          <Button title="Sign in" size="lg" rightIcon="arrow-forward" loading={loading} onPress={submit} />
        </View>

        <SocialSignIn onError={setError} />

        <View style={styles.prompt}>
          <Text variant="body" color="textSecondary">
            New to Aura360?
          </Text>
          <Link href="/sign-up" asChild>
            <Button title="Create an account" variant="ghost" size="sm" fullWidth={false} />
          </Link>
        </View>

        <View style={styles.footer}>
          <Button
            title={`Server: ${hostDisplay}`}
            variant="tertiary"
            size="sm"
            fullWidth={false}
            rightIcon="options-outline"
            accessibilityHint="Change the server address"
            onPress={openServerSheet}
          />
        </View>
      </View>

      <BottomSheet
        visible={showServerSheet}
        onClose={() => setShowServerSheet(false)}
        title="Server connection"
        footer={
          <View style={styles.sheetActions}>
            <Button title="Save server address" loading={savingServer} onPress={saveServer} />
            <Button title="Reset to default" variant="tertiary" disabled={savingServer} onPress={resetServer} />
          </View>
        }>
        <View style={styles.sheetBody}>
          <Text variant="body" color="textSecondary">
            Choose the server this app connects to. Leave it as the default unless your team gave you an address.
          </Text>
          <Input
            label="Server URL"
            leftIcon="server-outline"
            placeholder="https://app.example.com"
            helper="Include https://, for example https://app.example.com"
            value={serverDraft ?? ''}
            onChangeText={setServerDraft}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            textContentType="URL"
            returnKeyType="done"
            onSubmitEditing={saveServer}
          />
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  column: {
    width: '100%',
    maxWidth: AUTH_FORM_MAX_WIDTH,
    alignSelf: 'center',
    gap: layout.sectionGap,
  },
  form: { gap: layout.cardPadding },
  prompt: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: spacing.xs,
  },
  footer: { alignItems: 'center' },
  sheetBody: { gap: layout.cardPadding },
  sheetActions: { gap: spacing.sm },
});
