import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { GoogleSignInButton } from '@/components/google-sign-in-button';
import { Text } from '@/components/ui/text';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth';
import { radius, spacing, typography, useTheme } from '@/theme';

const LOGO = require('../../../assets/images/splash-logo.png');

export default function LoginScreen() {
  const { signIn, serverUrl, setServerUrl } = useAuth();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';

  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showServerModal, setShowServerModal] = useState(false);
  const [serverDraft, setServerDraft] = useState(serverUrl);

  const hostDisplay = serverUrl
    ? serverUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    : 'Local Host';

  async function submit() {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Invalid credentials. Please verify and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function saveServer() {
    await setServerUrl(serverDraft);
    setShowServerModal(false);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Brand Header */}
        <View style={styles.header}>
          <View
            style={[
              styles.logoWrapper,
              {
                backgroundColor: isDark ? 'rgba(79, 70, 229, 0.14)' : 'rgba(79, 70, 229, 0.08)',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.35)' : 'rgba(79, 70, 229, 0.22)',
              },
            ]}>
            <Image source={LOGO} contentFit="contain" style={styles.logoImage} />
          </View>

          <View style={styles.headerTitles}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(79, 70, 229, 0.08)',
                  borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(79, 70, 229, 0.18)',
                },
              ]}>
              <Text
                variant="caption"
                weight="semiBold"
                style={{ color: colors.primary, fontSize: 10, letterSpacing: 1.2 }}>
                WORKSPACE ACCESS
              </Text>
            </View>

            <Text variant="title" weight="bold" style={styles.title}>
              Aura360
            </Text>
            <Text variant="body" muted style={styles.subtitle}>
              Your integrated daily command center
            </Text>
          </View>
        </View>

        {/* Authentication Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)',
            },
          ]}>
          {/* Email Field */}
          <View style={styles.fieldGroup}>
            <Text variant="label" weight="semiBold" style={{ color: colors.text }}>
              Email Address
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : colors.cardMuted,
                  borderColor: emailFocused ? colors.primary : colors.border,
                },
              ]}>
              <Ionicons
                name="mail-outline"
                size={19}
                color={emailFocused ? colors.primary : colors.textMuted}
                style={styles.leadingIcon}
              />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="name@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text variant="label" weight="semiBold" style={{ color: colors.text }}>
                Password
              </Text>
            </View>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : colors.cardMuted,
                  borderColor: passwordFocused ? colors.primary : colors.border,
                },
              ]}>
              <Ionicons
                name="lock-closed-outline"
                size={19}
                color={passwordFocused ? colors.primary : colors.textMuted}
                style={styles.leadingIcon}
              />
              <TextInput
                ref={passwordRef}
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Enter your password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={10}
                style={styles.trailingIcon}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={19}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
          </View>

          {/* Error Banner */}
          {error ? (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.16)' : '#fef2f2',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#fecaca',
                },
              ]}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text variant="caption" weight="medium" style={{ color: colors.danger, flex: 1 }}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* Sign In Button */}
          <Pressable
            accessibilityRole="button"
            disabled={loading}
            onPress={submit}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: colors.primary,
                opacity: loading ? 0.7 : pressed ? 0.88 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}>
            {loading ? (
              <Text variant="label" weight="bold" style={{ color: colors.primaryText }}>
                Signing in…
              </Text>
            ) : (
              <View style={styles.buttonInner}>
                <Text variant="label" weight="bold" style={{ color: colors.primaryText }}>
                  Sign in
                </Text>
                <Ionicons name="arrow-forward" size={17} color={colors.primaryText} />
              </View>
            )}
          </Pressable>

          {/* Or Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text variant="caption" weight="semiBold" muted style={styles.dividerText}>
              OR
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Google Sign In */}
          <GoogleSignInButton onError={setError} />

          {/* Sign Up Link */}
          <View style={styles.signUpPrompt}>
            <Text variant="body" muted style={{ fontSize: 14 }}>
              New to Aura?{' '}
            </Text>
            <Link href="/sign-up" asChild>
              <Pressable hitSlop={6}>
                <Text
                  variant="body"
                  weight="bold"
                  style={{ color: colors.primary, fontSize: 14 }}>
                  Create an account
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>

        {/* Server Endpoint Badge */}
        <View style={styles.footer}>
          <Pressable
            onPress={() => {
              setServerDraft(serverUrl);
              setShowServerModal(true);
            }}
            hitSlop={8}
            style={[
              styles.serverPill,
              {
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : colors.card,
                borderColor: colors.border,
              },
            ]}>
            <View style={styles.statusDot} />
            <Text variant="caption" muted style={{ fontSize: 11, fontWeight: '500' }}>
              Connected: {hostDisplay}
            </Text>
            <Ionicons name="options-outline" size={13} color={colors.textMuted} />
          </Pressable>
        </View>
      </ScrollView>

      {/* Server Config Modal */}
      <Modal
        visible={showServerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowServerModal(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="server-outline" size={20} color={colors.primary} />
                <Text variant="heading" weight="bold">
                  Backend Configuration
                </Text>
              </View>
              <Pressable hitSlop={8} onPress={() => setShowServerModal(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text variant="caption" muted>
              Configure the API server endpoint this mobile client connects to:
            </Text>

            <View
              style={[
                styles.modalInputBox,
                { backgroundColor: colors.cardMuted, borderColor: colors.border },
              ]}>
              <TextInput
                value={serverDraft ?? ''}
                onChangeText={setServerDraft}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="https://app.example.com"
                placeholderTextColor={colors.textMuted}
                style={[styles.modalInput, { color: colors.text }]}
              />
            </View>

            <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
              <Pressable
                onPress={saveServer}
                style={[styles.modalSaveButton, { backgroundColor: colors.primary }]}>
                <Text variant="label" weight="bold" style={{ color: colors.primaryText }}>
                  Save Server URL
                </Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  await setServerUrl(null);
                  setServerDraft('');
                  setShowServerModal(false);
                }}
                style={styles.modalResetButton}>
                <Text variant="caption" weight="semiBold" muted>
                  Reset to Default Localhost
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  logoWrapper: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  logoImage: {
    width: 48,
    height: 48,
  },
  headerTitles: {
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  title: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  fieldGroup: {
    gap: 7,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
  },
  leadingIcon: {
    marginRight: spacing.sm,
  },
  trailingIcon: {
    padding: 4,
  },
  textInput: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: 15,
    height: '100%',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  primaryButton: {
    height: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    letterSpacing: 1,
  },
  signUpPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalInputBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalInput: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    minHeight: 38,
  },
  modalSaveButton: {
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalResetButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
});

