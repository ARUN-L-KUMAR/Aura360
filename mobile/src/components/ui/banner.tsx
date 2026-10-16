import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOut, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { describeSeverity, severityColors, type BannerItem, type NotifyAction, type Severity } from '@/lib/notify';
import { duration, layout, radius, spacing, useTheme } from '@/theme';

export type BannerProps = {
  /** Default `info`. */
  severity?: Severity;
  title?: string;
  message: string;
  action?: NotifyAction;
  /** Shows a dismiss button when set. */
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Persistent inline banner: severity icon + text, an optional action and an optional dismiss button. Use it directly
 * in a screen, or raise one app-wide with `useNotify().banner({ id, ... })`.
 *
 * Severity is never colour alone: the icon carries a spoken label ("Warning", "Error", ...) and the text is on the
 * tinted surface. Critical banners use a solid fill.
 */
export function Banner({ severity = 'info', title, message, action, onDismiss, style }: BannerProps) {
  const { colors } = useTheme();
  const tone = severityColors(colors, severity);
  const { icon, label } = describeSeverity(severity);
  const urgent = severity === 'error' || severity === 'critical';

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion={urgent ? 'assertive' : 'polite'}
      style={[styles.root, { backgroundColor: tone.background, borderColor: tone.border }, style]}>
      <View style={styles.icon} accessible accessibilityLabel={label}>
        <Ionicons name={icon} size={22} color={tone.icon} />
      </View>

      <View style={styles.body}>
        {title ? (
          <Text variant="label" weight="semiBold" color={tone.foreground}>
            {title}
          </Text>
        ) : null}
        <Text variant="body" color={tone.foreground}>
          {message}
        </Text>
        {action ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={action.label}
            haptic="tap"
            onPress={action.onPress}
            style={[styles.action, { borderColor: tone.foreground }]}>
            <Text variant="label" weight="semiBold" color={tone.foreground}>
              {action.label}
            </Text>
          </PressableScale>
        ) : null}
      </View>

      {onDismiss ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Dismiss ${label.toLowerCase()} message`}
          onPress={onDismiss}
          style={styles.dismiss}
          ringRadius={radius.pill}>
          <Ionicons name="close" size={20} color={tone.foreground} />
        </PressableScale>
      ) : null}
    </View>
  );
}

type HostProps = {
  banners: BannerItem[];
  onDismiss: (id: string) => void;
  /** Distance below the top safe area. Leaves room for the offline pill by default. */
  topOffset?: number;
};

/** Stacks the app-wide banners under the status bar (most severe first). Mounted by `NotifyProvider`. */
export function BannerHost({ banners, onDismiss, topOffset = spacing.xxxl }: HostProps) {
  const insets = useSafeAreaInsets();
  const { reduceMotion } = useTheme();
  if (banners.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + topOffset }]}>
      {banners.map((banner) => (
        <Animated.View
          key={banner.id}
          entering={reduceMotion ? FadeIn.duration(duration.fast) : FadeInUp.duration(duration.base)}
          exiting={reduceMotion ? FadeOut.duration(duration.fast) : FadeOutUp.duration(duration.fast)}
          // The banners below slide up to close the gap (none under reduce-motion).
          layout={reduceMotion ? undefined : LinearTransition.duration(duration.base)}>
          <Banner
            severity={banner.severity}
            title={banner.title}
            message={banner.message}
            action={banner.action}
            onDismiss={banner.dismissible ? () => onDismiss(banner.id) : undefined}
          />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
    gap: spacing.sm,
  },
  icon: { minHeight: layout.minTouchTarget - spacing.md, justifyContent: 'center' },
  body: { flex: 1, gap: spacing.xs, paddingVertical: spacing.sm },
  action: {
    alignSelf: 'flex-start',
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismiss: { width: layout.minTouchTarget, height: layout.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
  host: { position: 'absolute', left: layout.screenPadding, right: layout.screenPadding, gap: spacing.sm },
});
