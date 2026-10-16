import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ApiError } from '@/lib/api';
import { radius, spacing, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type ErrorKind = 'generic' | 'network' | 'timeout' | 'sessionExpired' | 'notFound';

type Preset = { icon: IconName; title: string; message: string; actionLabel: string };

const PRESETS: Record<ErrorKind, Preset> = {
  generic: {
    icon: 'alert-circle-outline',
    title: 'Something went wrong',
    message: "We couldn't load this just now. Please try again.",
    actionLabel: 'Try again',
  },
  network: {
    icon: 'cloud-offline-outline',
    title: "Can't connect",
    message: 'Check your internet connection and try again.',
    actionLabel: 'Try again',
  },
  timeout: {
    icon: 'time-outline',
    title: 'That took too long',
    message: 'The server is slow to respond. Give it a moment and try again.',
    actionLabel: 'Try again',
  },
  sessionExpired: {
    icon: 'lock-closed-outline',
    title: 'Session expired',
    message: 'Sign in again to pick up where you left off.',
    actionLabel: 'Sign in',
  },
  notFound: {
    icon: 'search-outline',
    title: 'Not found',
    message: 'This may have been moved or deleted.',
    actionLabel: 'Go back',
  },
};

/** Maps a thrown value (usually an `ApiError`) to the matching `ErrorState` kind. */
export function errorKindFromError(e: unknown): ErrorKind {
  if (e instanceof ApiError) {
    if (e.status === 0) return (e.data as { timeout?: boolean } | undefined)?.timeout ? 'timeout' : 'network';
    if (e.status === 401) return 'sessionExpired';
    if (e.status === 404) return 'notFound';
    if (e.status === 408 || e.status === 504) return 'timeout';
    return 'generic';
  }
  if (e instanceof Error) {
    if (e.name === 'AbortError') return 'timeout';
    if (/network request failed|failed to fetch|network error|offline/i.test(e.message)) return 'network';
  }
  return 'generic';
}

export type ErrorStateProps = {
  kind?: ErrorKind;
  /** Pass the caught error instead of `kind` to pick the kind automatically. */
  error?: unknown;
  title?: string;
  message?: string;
  icon?: IconName;
  /** Retry (or "Sign in" / "Go back", depending on kind). The action button is hidden without it. */
  onRetry?: () => void;
  retryLabel?: string;
  /** Shows the action button as busy while retrying. */
  retrying?: boolean;
  /** `full` fills a screen or panel. `inline` is a compact row for use inside a list or card. Default `full`. */
  size?: 'full' | 'inline';
  style?: StyleProp<ViewStyle>;
};

/** Error with a way forward. Announced to screen readers as an alert. */
export function ErrorState({ kind, error, title, message, icon, onRetry, retryLabel, retrying, size = 'full', style }: ErrorStateProps) {
  const { colors } = useTheme();
  const preset = PRESETS[kind ?? (error !== undefined ? errorKindFromError(error) : 'generic')];
  const heading = title ?? preset.title;
  const body = message ?? preset.message;
  const action = retryLabel ?? preset.actionLabel;

  if (size === 'inline') {
    return (
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.errorBorder,
            backgroundColor: colors.errorContainer,
          },
          style,
        ]}>
        <Ionicons name={icon ?? preset.icon} size={24} color={colors.onErrorContainer} />
        <View style={{ flex: 1 }}>
          <Text variant="label" weight="semiBold" style={{ color: colors.onErrorContainer }}>
            {heading}
          </Text>
          <Text variant="caption" style={{ color: colors.onErrorContainer }}>
            {body}
          </Text>
        </View>
        {onRetry ? <Button title={action} variant="tertiary" size="sm" fullWidth={false} loading={retrying} onPress={onRetry} /> : null}
      </View>
    );
  }

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={[{ alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl }, style]}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.xs,
          backgroundColor: colors.errorContainer,
        }}>
        <Ionicons name={icon ?? preset.icon} size={32} color={colors.onErrorContainer} />
      </View>
      <Text variant="title" style={{ textAlign: 'center' }}>
        {heading}
      </Text>
      <Text variant="body" color="textSecondary" style={{ textAlign: 'center', maxWidth: 320 }}>
        {body}
      </Text>
      {onRetry ? (
        <View style={{ marginTop: spacing.md }}>
          <Button title={action} loading={retrying} fullWidth={false} onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
