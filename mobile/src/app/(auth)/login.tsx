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
import { useTranslation } from '@/i18n';
import { directional } from '@/i18n/rtl';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
import { userErrorMessage } from '@/lib/user-error';
import { useAuth } from '@/providers/auth';
import { useNotify } from '@/providers/notify';
import { layout, spacing } from '@/theme';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

function emailProblem(email: string) {
  if (!email.trim()) return 'validation.emailRequired';
  if (!EMAIL_PATTERN.test(email.trim())) return 'validation.emailInvalid';
  return null;
}

function passwordProblem(password: string) {
  return password ? null : 'validation.passwordRequired';
}

export default function LoginScreen() {
  const { t } = useTranslation('auth');
  const { signIn, serverUrl, setServerUrl, sessionExpired, dismissSessionExpired } = useAuth();
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
  const [serverError, setServerError] = useState<string | null>(null);
  const [savingServer, setSavingServer] = useState(false);

  const emailKey = touched.email ? emailProblem(email) : null;
  const passwordKey = touched.password ? passwordProblem(password) : null;

  const hostDisplay = serverUrl ? serverUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : t('server.localHost');

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
      analytics.track('sign_in', { method: 'password' });
    } catch (e) {
      haptics.error();
      // A 401 here means the details were wrong (not an expired session).
      setError(userErrorMessage(e, t('signIn.failed'), { unauthorized: t('signIn.invalid') }));
    } finally {
      setLoading(false);
    }
  }

  function openServerSheet() {
    setServerDraft(serverUrl);
    setServerError(null);
    setShowServerSheet(true);
  }

  async function saveServer() {
    if (savingServer) return;
    setSavingServer(true);
    setServerError(null);
    try {
      await setServerUrl(serverDraft);
      setShowServerSheet(false);
      notify.success(t('server.saved'));
    } catch (e) {
      haptics.error();
      setServerError(userErrorMessage(e, t('server.saveFailed')));
    } finally {
      setSavingServer(false);
    }
  }

  async function resetServer() {
    if (savingServer) return;
    setSavingServer(true);
    setServerError(null);
    try {
      await setServerUrl(null);
      setServerDraft('');
      setShowServerSheet(false);
      notify.success(t('server.resetDone'));
    } catch (e) {
      notify.error(userErrorMessage(e, t('server.saveFailed')));
    } finally {
      setSavingServer(false);
    }
  }

  return (
    <Screen showsVerticalScrollIndicator={false} contentContainerStyle={authContentStyle}>
      <View style={styles.column}>
        {sessionExpired ? <Banner severity="warning" message={t('sessionExpired.message')} onDismiss={dismissSessionExpired} /> : null}

        <AuthHeader title={t('signIn.title')} subtitle={t('signIn.subtitle')} />

        <View style={styles.form}>
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
            label={t('fields.password')}
            leftIcon="lock-closed-outline"
            placeholder={t('fields.passwordPlaceholder')}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) setError(null);
            }}
            onBlur={() => setTouched((s) => ({ ...s, password: true }))}
            error={passwordKey ? t(passwordKey) : null}
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          {error ? <Banner severity="error" title={t('signIn.errorTitle')} message={error} /> : null}

          <Button title={t('signIn.submit')} size="lg" rightIcon={directional('arrow-forward', 'arrow-back')} loading={loading} onPress={submit} />
        </View>

        <SocialSignIn onError={setError} />

        <View style={styles.prompt}>
          <Text variant="body" color="textSecondary">
            {t('signIn.newHere')}
          </Text>
          <Link href="/sign-up" asChild>
            <Button title={t('signIn.createAccount')} variant="ghost" size="sm" fullWidth={false} accessibilityRole="link" />
          </Link>
        </View>

        <View style={styles.footer}>
          <Button
            title={t('server.button', { host: hostDisplay })}
            variant="tertiary"
            size="sm"
            fullWidth={false}
            rightIcon="options-outline"
            accessibilityHint={t('server.buttonHint')}
            onPress={openServerSheet}
          />
        </View>
      </View>

      <BottomSheet
        visible={showServerSheet}
        onClose={() => setShowServerSheet(false)}
        title={t('server.sheetTitle')}
        footer={
          <View style={styles.sheetActions}>
            <Button title={t('server.save')} loading={savingServer} onPress={saveServer} />
            <Button title={t('server.reset')} variant="tertiary" disabled={savingServer} onPress={resetServer} />
          </View>
        }>
        <View style={styles.sheetBody}>
          <Text variant="body" color="textSecondary">
            {t('server.intro')}
          </Text>
          <Input
            label={t('server.urlLabel')}
            leftIcon="server-outline"
            placeholder={t('server.urlPlaceholder')}
            helper={t('server.urlHelper')}
            value={serverDraft ?? ''}
            onChangeText={(text) => {
              setServerDraft(text);
              if (serverError) setServerError(null);
            }}
            error={serverError}
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
