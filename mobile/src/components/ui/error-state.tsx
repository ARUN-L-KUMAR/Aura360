import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { Illustration } from '@/components/illustrations/illustration';
import { Button } from '@/components/ui/button';
import { useBlockMotion } from '@/components/ui/motion';
import { classifyError, type ErrorKind } from '@/components/ui/logic';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/i18n';
import type { SceneName } from '@/illustrations/registry';
import { ApiError } from '@/lib/api';
import { radius, spacing, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type { ErrorKind };

/** Icons per kind. The words live in `common:errorState.<kind>`. */
const PRESET_ICONS: Record<ErrorKind, IconName> = {
  generic: 'alert-circle-outline',
  network: 'cloud-offline-outline',
  timeout: 'time-outline',
  sessionExpired: 'lock-closed-outline',
  notFound: 'search-outline',
};

/** Artwork per kind for the `full` size. A timeout is a slow connection, so it gets the hourglass. */
const KIND_SCENES: Record<ErrorKind, SceneName> = {
  generic: 'generic-error',
  network: 'generic-offline',
  timeout: 'time-logs',
  sessionExpired: 'generic-session',
  notFound: 'generic-noresults',
};

/** Height of the spot illustration in the `full` size. */
const ART_HEIGHT = spacing.xxxl * 3;

/** Maps a thrown value (usually an `ApiError`) to the matching `ErrorState` kind. */
export function errorKindFromError(e: unknown): ErrorKind {
  if (e instanceof ApiError) return classifyError({ status: e.status, timeout: !!(e.data as { timeout?: boolean } | undefined)?.timeout });
  if (e instanceof Error) return classifyError({ name: e.name, message: e.message });
  return 'generic';
}

export type ErrorStateProps = {
  kind?: ErrorKind;
  /** Pass the caught error instead of `kind` to pick the kind automatically. */
  error?: unknown;
  title?: string;
  message?: string;
  /** Replaces the artwork with a plain icon tile (the compact `inline` size always shows an icon). */
  icon?: IconName;
  /** Artwork for the `full` size. Default: picked from the kind. Pass `null` for the plain icon tile. */
  scene?: SceneName | null;
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
export function ErrorState({ kind, error, title, message, icon, scene, onRetry, retryLabel, retrying, size = 'full', style }: ErrorStateProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const motion = useBlockMotion();
  const resolved = kind ?? (error !== undefined ? errorKindFromError(error) : 'generic');
  const presetIcon = PRESET_ICONS[resolved];
  // An explicit `icon` keeps the plain tile; otherwise the full size shows the artwork for the kind.
  const art = scene === null || icon ? undefined : (scene ?? KIND_SCENES[resolved]);
  const heading = title ?? t(`errorState.${resolved}.title`);
  const body = message ?? t(`errorState.${resolved}.message`);
  const action = retryLabel ?? t(`errorState.${resolved}.action`);

  if (size === 'inline') {
    return (
      <Animated.View
        {...motion}
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.md,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.errorBorder,
            backgroundColor: colors.errorContainer,
          },
          style,
        ]}>
        <Ionicons name={icon ?? presetIcon} size={24} color={colors.onErrorContainer} />
        <View style={{ flex: 1 }}>
          <Text variant="label" weight="semiBold" style={{ color: colors.onErrorContainer }}>
            {heading}
          </Text>
          <Text variant="caption" style={{ color: colors.onErrorContainer }}>
            {body}
          </Text>
        </View>
        {onRetry ? <Button title={action} variant="tertiary" size="sm" fullWidth={false} loading={retrying} onPress={onRetry} /> : null}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      {...motion}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={[{ alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl }, style]}>
      {art ? (
        <Illustration scene={art} accent="ai" height={ART_HEIGHT} style={{ marginBottom: spacing.xs }} />
      ) : (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: 72,
            height: 72,
            borderRadius: radius.xl,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.xs,
            backgroundColor: colors.errorContainer,
          }}>
          <Ionicons name={icon ?? presetIcon} size={32} color={colors.onErrorContainer} />
        </View>
      )}
      <Text variant="title" weight="bold" style={{ textAlign: 'center' }}>
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
    </Animated.View>
  );
}
