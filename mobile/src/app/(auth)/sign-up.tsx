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
import { SuccessCheck } from '@/components/ui/success-check';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/i18n';
import { directional } from '@/i18n/rtl';
import { api } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
import { userErrorMessage } from '@/lib/user-error';
import { layout, spacing } from '@/theme';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const MIN_PASSWORD_LENGTH = 8;

function emailProblem(email: string) {
  if (!email.trim()) return 'validation.emailRequired';
  if (!EMAIL_PATTERN.test(email.trim())) return 'validation.emailInvalid';
  return null;
}

function passwordProblem(password: string) {
  if (!password) return 'validation.passwordChoose';
  if (password.length < MIN_PASSWORD_LENGTH) return 'validation.passwordShort';
  return null;
}

export default function SignUpScreen() {
  const { t } = useTranslation('auth');
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

  const emailKey = touched.email ? emailProblem(email) : null;
  const passwordKey = touched.password ? passwordProblem(password) : null;

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
      analytics.track('sign_up', { method: 'password' });
      setDone(true);
    } catch (e) {
      haptics.error();
      setError(userErrorMessage(e, t('signUp.failed')));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Screen contentContainerStyle={authContentStyle}>
        <View style={styles.column}>
          <EmptyState
            illustration={<SuccessCheck size={72} accessibilityLabel={t('signUp.done.created')} />}
            title={t('signUp.done.title')}
            description={t('signUp.done.description', { email: email.trim() })}
            actionTitle={t('signUp.done.action')}
            onAction={() => router.navigate('/login')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen showsVerticalScrollIndicator={false} contentContainerStyle={authContentStyle}>
      <View style={styles.column}>
        <AuthHeader title={t('signUp.title')} subtitle={t('signUp.subtitle')} />

        <View style={styles.form}>
          <Input
            label={t('fields.name')}
            leftIcon="person-outline"
            placeholder={t('fields.namePlaceholder')}
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
            label={t('fields.email')}
            leftIcon="mail-outline"
            placeholder={t('fields.emailPlaceholder')}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) setError(null);
            }}
            onBlur={() => setTouched((s) => ({ ...s, email: true }))}
            error={emailKey ? t(emailKey) : null}
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
            label={t('fields.password')}
            leftIcon="lock-closed-outline"
            placeholder={t('fields.newPasswordPlaceholder', { count: MIN_PASSWORD_LENGTH })}
            helper={t('validation.passwordShort', { count: MIN_PASSWORD_LENGTH })}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) setError(null);
            }}
            onBlur={() => setTouched((s) => ({ ...s, password: true }))}
            error={passwordKey ? t(passwordKey, { count: MIN_PASSWORD_LENGTH }) : null}
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          {error ? <Banner severity="error" title={t('signUp.errorTitle')} message={error} /> : null}

          <Button title={t('signUp.submit')} size="lg" rightIcon={directional('arrow-forward', 'arrow-back')} loading={loading} onPress={submit} />
        </View>

        <SocialSignIn onError={setError} />

        <View style={styles.prompt}>
          <Text variant="body" color="textSecondary">
            {t('signUp.haveAccount')}
          </Text>
          <Link href="/login" asChild>
            <Button
              title={t('signUp.signIn')}
              variant="ghost"
              size="sm"
              fullWidth={false}
              accessibilityRole="link"
              style={styles.promptLink}
            />
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
  promptLink: {
    paddingHorizontal: spacing.xs,
  },
});
