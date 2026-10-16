import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useLatest } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { GlassSurface, useGlassSupported } from '@/components/ui/glass-surface';
import { Text } from '@/components/ui/text';
import { describeSeverity, severityColors, type Severity } from '@/lib/notify';
import { duration, easing, layout, radius, spacing, useTheme } from '@/theme';

export type DialogAction = {
  label: string;
  onPress: () => void;
  /** `primary` filled, `secondary` quiet, `destructive` red. Default `secondary`. */
  variant?: 'primary' | 'secondary' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
};

export type DialogProps = {
  visible: boolean;
  /** Backdrop tap or Android back (only when `dismissible`). */
  onClose?: () => void;
  title: string;
  message?: string;
  /** Extra content under the message (e.g. an input). */
  children?: ReactNode;
  /** Shown with a severity icon above the title when set. */
  severity?: Severity;
  /** One to three actions, in reading order (e.g. Cancel, then Delete). */
  actions: DialogAction[];
  /** Backdrop tap and back close it. Default true; set false for acknowledgements that must be answered. */
  dismissible?: boolean;
  /** Use the glass surface (iOS 26+; solid elsewhere). Default false (opaque card). */
  glass?: boolean;
};

const MAX_WIDTH = 400;
const MIN_ACTION_WIDTH = layout.minTouchTarget * 3;
const ENTER_SCALE = 0.94;

const BUTTON_VARIANT = { primary: 'primary', secondary: 'tertiary', destructive: 'destructive' } as const;

/**
 * Modal alert / confirm dialog. Centred card over a dimmed backdrop; fades and scales in (fades only with
 * reduce-motion). Screen readers are trapped inside it, and Android back / backdrop tap close it when `dismissible`.
 * For the imperative `confirm()` / `alert()` API use `useNotify()`.
 */
export function Dialog({ visible, onClose, title, message, children, severity, actions, dismissible = true, glass = false }: DialogProps) {
  const { colors, reduceMotion, elevation } = useTheme();
  const { width } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const visibleRef = useLatest(visible);
  const glassActive = useGlassSupported() && glass;

  if (visible && !mounted) setMounted(true);

  const finish = useCallback(() => {
    if (!visibleRef.current) setMounted(false);
  }, [visibleRef]);

  useEffect(() => {
    if (visible) {
      progress.value = withTiming(1, { duration: reduceMotion ? duration.fast : duration.base, easing: Easing.bezier(...easing.decelerate) });
    } else {
      progress.value = withTiming(0, { duration: duration.fast, easing: Easing.bezier(...easing.accelerate) }, (done) => {
        if (done) scheduleOnRN(finish);
      });
    }
  }, [visible, reduceMotion, progress, finish]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: reduceMotion ? [] : [{ scale: ENTER_SCALE + (1 - ENTER_SCALE) * progress.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  if (!mounted) return null;

  const Surface = glass ? GlassSurface : View;
  const tone = severity ? severityColors(colors, severity) : null;
  const described = severity ? describeSeverity(severity) : null;
  const sideBySide = actions.length === 2;
  const close = dismissible ? onClose : undefined;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={close ?? (() => {})}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            disabled={!close}
            accessible={!!close}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            importantForAccessibility={close ? 'yes' : 'no-hide-descendants'}
          />
        </Animated.View>

        <Animated.View
          accessibilityViewIsModal
          onAccessibilityEscape={close}
          style={[
            styles.cardWrap,
            { width: Math.min(MAX_WIDTH, width - layout.screenPadding * 2) },
            glassActive ? null : [{ backgroundColor: glass ? colors.glassSolid : colors.card }, elevation(4)],
            cardStyle,
          ]}>
          <Surface
            style={[styles.card, glass ? null : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }]}>
            {described && tone ? (
              <View style={[styles.iconBadge, { backgroundColor: tone.background }]} accessible accessibilityLabel={described.label}>
                <Ionicons name={described.icon} size={24} color={tone.icon} />
              </View>
            ) : null}
            <Text variant="title" accessibilityRole="header" style={styles.centered}>
              {title}
            </Text>
            {message ? (
              <Text variant="body" color="textSecondary" style={styles.centered}>
                {message}
              </Text>
            ) : null}
            {children}

            <View style={[styles.actions, sideBySide ? styles.actionsRow : null]}>
              {actions.map((action, index) => (
                <View key={`${action.label}-${index}`} style={sideBySide ? styles.actionHalf : null}>
                  <Button
                    title={action.label}
                    variant={BUTTON_VARIANT[action.variant ?? 'secondary']}
                    loading={action.loading}
                    disabled={action.disabled}
                    onPress={action.onPress}
                  />
                </View>
              ))}
            </View>
          </Surface>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardWrap: { borderRadius: radius.xl },
  card: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  iconBadge: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  centered: { textAlign: 'center' },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  actionHalf: { flexGrow: 1, flexBasis: MIN_ACTION_WIDTH },
});
