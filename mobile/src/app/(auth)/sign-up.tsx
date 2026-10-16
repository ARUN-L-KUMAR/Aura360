import { Link, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { AUTH_FORM_MAX_WIDTH, AuthHeader, SocialSignIn, authContentStyle } from '@/components/auth-form-parts';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PasswordField } from '@/components/ui/password-field';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { api, ApiError } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { layout, spacing } from '@/theme';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const MIN_PASSWORD_LENGTH = 8;

function emailProblem(email: string) {
  if (!email.trim()) return 'Enter your email address.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address, like name@example.com.';
  return null;
}

function passwordProblem(password: string) {
  if (!password) return 'Choose a password.';
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  return null;
}

export default function SignUpScreen() {
  const router = useRouter();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const emailError = touched.email ? emailProblem(email) : null;
  const passwordError = touched.password ? passwordProblem(password) : null;

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
      await api('/api/auth/register', {
        method: 'POST',
        anonymous: true,
        body: { name: name.trim() || undefined, email: email.trim(), password },
      });
      haptics.success();
      setDone(true);
    } catch (e) {
      haptics.error();
      setError(e instanceof ApiError ? e.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Screen contentContainerStyle={authContentStyle}>
        <View style={styles.column}>
          <EmptyState
            icon="mail-open-outline"
            title="Check your email"
            description={`We sent a verification link to ${email.trim()}. Verify your address, then sign in.`}
            actionTitle="Back to sign in"
            onAction={() => router.navigate('/login')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen showsVerticalScrollIndicator={false} contentContainerStyle={authContentStyle}>
      <View style={styles.column}>
        <AuthHeader title="Create your account" subtitle="Finance, fitness, food and life in one place." />

        <View style={styles.form}>
          <Input
            label="Name (optional)"
            leftIcon="person-outline"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => emailRef.current?.focus()}
          />

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
            newPassword
            leftIcon="lock-closed-outline"
            placeholder="At least 8 characters"
            helper={`Use at least ${MIN_PASSWORD_LENGTH} characters.`}
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

          {error ? <Banner severity="error" title="Could not create your account" message={error} /> : null}

          <Button title="Create account" size="lg" rightIcon="arrow-forward" loading={loading} onPress={submit} />
        </View>

        <SocialSignIn onError={setError} />

        <View style={styles.prompt}>
          <Text variant="body" color="textSecondary">
            Already have an account?
          </Text>
          <Link href="/login" asChild>
            <Button title="Sign in" variant="ghost" size="sm" fullWidth={false} />
          </Link>
        </View>
      </View>
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
});
