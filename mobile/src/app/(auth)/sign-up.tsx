import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { GoogleSignInButton } from '@/components/google-sign-in-button';
import { Text } from '@/components/ui/text';
import { api, ApiError } from '@/lib/api';
import { radius, spacing, typography, useTheme } from '@/theme';

const LOGO = require('../../../assets/images/splash-logo.png');

export default function SignUpScreen() {
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!email.trim() || password.length < 8) {
      setError('Please enter your email and a password of at least 8 characters.');
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
      setError(e instanceof ApiError ? e.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.scrollContent}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)',
                alignItems: 'center',
              },
            ]}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: radius.pill,
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#ecfdf5',
                borderWidth: 1.5,
                borderColor: colors.success,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.xs,
              }}>
              <Ionicons name="mail-open-outline" size={32} color={colors.success} />
            </View>
            <Text variant="title" weight="bold" style={{ textAlign: 'center' }}>
              Check your email
            </Text>
            <Text variant="body" muted style={{ textAlign: 'center', lineHeight: 22 }}>
              We sent a verification link to <Text weight="bold">{email.trim()}</Text>. Verify your address and sign in.
            </Text>
            <Link href="/login" asChild>
              <Pressable
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary, width: '100%', marginTop: spacing.md },
                ]}>
                <Text variant="label" weight="bold" style={{ color: colors.primaryText }}>
                  Back to Sign In
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View
            style={[
              styles.logoWrapper,
              {
                backgroundColor: isDark ? 'rgba(79, 70, 229, 0.12)' : 'rgba(79, 70, 229, 0.08)',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(79, 70, 229, 0.2)',
              },
            ]}>
            <Image source={LOGO} contentFit="contain" style={styles.logoImage} />
          </View>

          <View style={styles.headerTitles}>
            <Text variant="headline" weight="bold" style={styles.title}>
              Create Account
            </Text>
            <Text variant="body" muted style={styles.subtitle}>
              Finance, fitness, food and life in one command center
            </Text>
          </View>
        </View>

        {/* Form Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)',
            },
          ]}>
          {/* Full Name Field */}
          <View style={styles.fieldGroup}>
            <Text variant="label" weight="semiBold" style={{ color: colors.text }}>
              Full Name (Optional)
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : colors.cardMuted,
                  borderColor: nameFocused ? colors.primary : colors.border,
                },
              ]}>
              <Ionicons
                name="person-outline"
                size={19}
                color={nameFocused ? colors.primary : colors.textMuted}
                style={styles.leadingIcon}
              />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Arun Kumar"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>
          </View>

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
                ref={emailRef}
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
            <Text variant="label" weight="semiBold" style={{ color: colors.text }}>
              Password
            </Text>
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
                placeholder="At least 8 characters"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                textContentType="newPassword"
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

          {/* Create Account Button */}
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
                Creating account…
              </Text>
            ) : (
              <View style={styles.buttonInner}>
                <Text variant="label" weight="bold" style={{ color: colors.primaryText }}>
                  Create Account
                </Text>
                <Ionicons name="arrow-forward" size={17} color={colors.primaryText} />
              </View>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text variant="caption" weight="semiBold" muted style={styles.dividerText}>
              OR
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Google Sign In */}
          <GoogleSignInButton onError={setError} />

          {/* Sign In Prompt */}
          <View style={styles.signUpPrompt}>
            <Text variant="body" muted style={{ fontSize: 14 }}>
              Already have an account?{' '}
            </Text>
            <Link href="/login" asChild>
              <Pressable hitSlop={6}>
                <Text
                  variant="body"
                  weight="bold"
                  style={{ color: colors.primary, fontSize: 14 }}>
                  Sign in
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
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
    gap: 4,
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
});

