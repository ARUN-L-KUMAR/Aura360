import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { GlassSurface, useGlassSupported } from '@/components/ui/glass-surface';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { duration, layout, radius, spacing, typeScale, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Height of the bar below the status bar / notch. */
export const APP_BAR_HEIGHT = 56;
/** Scroll distance over which the large title hands over to the small one. */
export const APP_BAR_COLLAPSE_DISTANCE = typeScale.headline.lineHeight + spacing.sm;
/** Scroll offset after which the bar gets its glass / solid background. */
const BACKGROUND_AT = APP_BAR_COLLAPSE_DISTANCE - spacing.sm;

/**
 * Scroll plumbing for a collapsing header. Attach `scrollHandler` to an `Animated.ScrollView` / `Animated.FlatList`
 * and give `scrollY` to `<TopAppBar>` and `<LargeTitle>`. (`<Screen title>` does all of this for you.)
 */
export function useCollapsingHeader() {
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  return { scrollHandler, scrollY };
}

export type AppBarAction = {
  icon: IconName;
  /** Spoken name of the button. Required: icon-only buttons have no visible text. */
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Count shown on the button (notifications). Included in the accessibility label. */
  badge?: number;
};

/** 44pt icon button for app bars (back, search, menu...). */
export function AppBarButton({ icon, label, onPress, disabled, badge }: AppBarAction) {
  const { colors } = useTheme();
  const count = badge && badge > 0 ? badge : 0;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={count ? `${label}, ${count} new` : label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      ringRadius={radius.pill}
      style={styles.button}>
      <Ionicons name={icon} size={24} color={disabled ? colors.textDisabled : colors.text} />
      {count ? (
        <View style={[styles.badge, { backgroundColor: colors.error }]}>
          <Text variant="caption" weight="semiBold" color="onError" numberOfLines={1} maxFontSizeMultiplier={1}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

export type TopAppBarProps = {
  title: string;
  /** Scroll offset from `useCollapsingHeader`. Enables the glass background once scrolled and the title hand-over. */
  scrollY?: SharedValue<number>;
  /** A `<LargeTitle>` sits in the content: the small title fades in as it scrolls away. Otherwise it is always shown. */
  large?: boolean;
  /** Shows a back button on the leading edge. */
  onBack?: () => void;
  backLabel?: string;
  /** Replaces the back button (e.g. a close button or avatar). */
  leading?: ReactNode;
  /** Trailing icon buttons, 44pt each. Keep to three or fewer. */
  actions?: AppBarAction[];
  /** Centre the small title (iOS style). Defaults to centred on iOS, leading on Android. */
  centerTitle?: boolean;
  /** Add the status bar / notch inset above the bar. Default true. */
  topInset?: boolean;
  /** Draw the background even at scroll offset 0. */
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Top app bar: leading action, small title, trailing actions. With `scrollY` + `large` it pairs with `<LargeTitle>`
 * for the collapsing large-title pattern. Overlays the content (absolute), so the scroll view needs top padding of
 * `insets.top + APP_BAR_HEIGHT`. Only transform / opacity animate, on the UI thread.
 */
export function TopAppBar({
  title,
  scrollY,
  large = false,
  onBack,
  backLabel = 'Back',
  leading,
  actions = [],
  centerTitle = Platform.OS === 'ios',
  topInset = true,
  elevated = false,
  style,
}: TopAppBarProps) {
  const { colors, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const blur = useGlassSupported();
  const [scrolled, setScrolled] = useState(false);

  useAnimatedReaction(
    () => (scrollY ? scrollY.value > (large ? BACKGROUND_AT : spacing.xs) : false),
    (now, previous) => {
      if (now !== previous) scheduleOnRN(setScrolled, now);
    },
    [scrollY, large],
  );

  const titleStyle = useAnimatedStyle(() => {
    if (!scrollY || !large) return { opacity: 1 };
    const t = interpolate(scrollY.value, [BACKGROUND_AT - spacing.md, APP_BAR_COLLAPSE_DISTANCE], [0, 1], Extrapolation.CLAMP);
    return { opacity: t, transform: [{ translateY: reduceMotion ? 0 : (1 - t) * spacing.sm }] };
  });

  const hasBackground = scrolled || elevated;
  const hasLeading = !!(leading || onBack);
  // Reserve the same room on both sides so a centred title stays centred whatever buttons are shown.
  const slot = Math.max(1, actions.length) * layout.minTouchTarget + spacing.xs;

  const titleNode = (
    <Text
      variant="title"
      weight="semiBold"
      numberOfLines={1}
      accessibilityRole="header"
      // The large title is the screen's heading for screen readers; the small copy would just repeat it.
      accessibilityElementsHidden={large}
      importantForAccessibility={large ? 'no-hide-descendants' : 'auto'}>
      {title}
    </Text>
  );

  return (
    <View pointerEvents="box-none" style={[styles.bar, { paddingTop: topInset ? insets.top : 0 }, style]}>
      {hasBackground ? (
        <Animated.View
          pointerEvents="none"
          // Real glass appears without a fade (the system animates it); the solid fallback fades in and out.
          entering={blur || reduceMotion ? undefined : FadeIn.duration(duration.fast)}
          exiting={blur || reduceMotion ? undefined : FadeOut.duration(duration.fast)}
          style={StyleSheet.absoluteFill}>
          <GlassSurface style={[StyleSheet.absoluteFill, styles.glassEdge, { borderBottomColor: colors.glassBorder }]} />
        </Animated.View>
      ) : null}

      <View style={styles.row}>
        {centerTitle ? (
          <Animated.View pointerEvents="none" style={[styles.centerTitle, { paddingHorizontal: slot }, titleStyle]}>
            {titleNode}
          </Animated.View>
        ) : null}

        {leading ?? (onBack ? <AppBarButton icon="chevron-back" label={backLabel} onPress={onBack} /> : null)}

        {centerTitle ? (
          <View style={styles.spacer} />
        ) : (
          <Animated.View style={[styles.leadingTitle, { paddingLeft: hasLeading ? spacing.xs : layout.screenPadding - spacing.xs }, titleStyle]}>
            {titleNode}
          </Animated.View>
        )}

        {actions.map((action) => (
          <AppBarButton key={action.label} {...action} />
        ))}
      </View>
    </View>
  );
}

/** The large screen title that lives at the top of the scroll content and fades as it scrolls under the bar. */
export function LargeTitle({ title, subtitle, scrollY }: { title: string; subtitle?: string; scrollY?: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    if (!scrollY) return { opacity: 1 };
    return { opacity: interpolate(scrollY.value, [0, APP_BAR_COLLAPSE_DISTANCE * 0.75], [1, 0], Extrapolation.CLAMP) };
  });
  return (
    <Animated.View style={[styles.largeTitle, style]}>
      <Text variant="headline" accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" color="textSecondary">
          {subtitle}
        </Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  glassEdge: { borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 },
  row: {
    height: APP_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  spacer: { flex: 1 },
  leadingTitle: { flex: 1, justifyContent: 'center', paddingRight: spacing.sm },
  centerTitle: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  button: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    minWidth: 16,
    height: 16,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeTitle: { gap: spacing.xs },
});
