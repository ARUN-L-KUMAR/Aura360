import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useEffect, useRef, type ComponentProps } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { GlassSurface, useGlassSupported } from '@/components/ui/glass-surface';
import { capCount } from '@/components/ui/logic';
import { instant, usePop } from '@/components/ui/motion';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { modules } from '@/features/modules';
import { useTranslation } from '@/i18n';
import { directionSign } from '@/i18n/rtl';
import { haptics } from '@/lib/haptics';
import { radius, spacing, spring, useTheme, type ModuleKey } from '@/theme';

export type { BottomTabBarProps };

type IconName = ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  /** Module whose compact catalog name (`common:modules.<key>.short`) labels the tab. Home has its own (`common:tabs.home`). */
  module?: ModuleKey;
  activeIcon: IconName;
  inactiveIcon: IconName;
  /** Module whose accent colours this tab. Home uses the brand accent. */
  accent: ModuleKey;
}

const TAB_CONFIG: Record<string, TabConfig> = {
  index: { activeIcon: 'home', inactiveIcon: 'home-outline', accent: 'ai' },
  finance: { module: 'finance', activeIcon: 'wallet', inactiveIcon: 'wallet-outline', accent: 'finance' },
  fashion: { module: 'fashion', activeIcon: 'shirt', inactiveIcon: 'shirt-outline', accent: 'fashion' },
  saved: { module: 'saved', activeIcon: 'bookmark', inactiveIcon: 'bookmark-outline', accent: 'saved' },
  fitness: { module: 'fitness', activeIcon: 'barbell', inactiveIcon: 'barbell-outline', accent: 'fitness' },
  food: { module: 'food', activeIcon: 'restaurant', inactiveIcon: 'restaurant-outline', accent: 'food' },
  skincare: { module: 'skincare', activeIcon: 'sparkles', inactiveIcon: 'sparkles-outline', accent: 'skincare' },
  notes: { module: 'notes', activeIcon: 'document-text', inactiveIcon: 'document-text-outline', accent: 'notes' },
  time: { module: 'time', activeIcon: 'time', inactiveIcon: 'time-outline', accent: 'time' },
  ai: { module: 'ai', activeIcon: 'chatbubble-ellipses', inactiveIcon: 'chatbubble-ellipses-outline', accent: 'ai' },
};

/** How many tabs fit on screen at once: 5 whole tabs and half of the next, so the strip visibly continues. */
const VISIBLE_TABS = 5.5;
const MIN_ITEM_WIDTH = 64;
const MAX_ITEM_WIDTH = 96;
const ITEM_HEIGHT = 56;
/** How far the strip widens with the system font size (labels are capped at 1.2x). */
const MAX_LABEL_SCALE = 1.2;
const PILL_HEIGHT = 32;
const PILL_INSET = spacing.sm;
const ICON_SIZE = 22;
/** The sliding pill stretches by this much per tab of distance still to travel, up to `MAX_STRETCH_TABS` tabs. */
const STRETCH_PER_TAB = 0.06;
const MAX_STRETCH_TABS = 3;
const FADE_STEPS = 6;
const FADE_STEP_WIDTH = spacing.xs;

export type AppTabsProps = BottomTabBarProps & {
  /** Badge counts by route name, e.g. `{ notes: 3 }`. A route's `tabBarBadge` option is used when this has no entry. */
  badges?: Record<string, number | undefined>;
};

/**
 * Bottom navigation for the ten module tabs: a glass strip that scrolls sideways. Every tab has an icon and a label,
 * the active one is accent-coloured with a sliding indicator pill, and the strip keeps it centred on screen.
 */
export function AppTabs({ state, descriptors, navigation, insets, badges }: AppTabsProps) {
  const { colors, accent: accentFor, elevation, reduceMotion } = useTheme();
  const { t } = useTranslation('common');
  const { width: viewport, fontScale } = useWindowDimensions();
  const glassActive = useGlassSupported();

  const count = state.routes.length;
  // Tabs widen with large text (up to the labels' own cap) so a label like "Skincare" is not cut off.
  const labelScale = Math.min(MAX_LABEL_SCALE, Math.max(1, fontScale));
  const itemWidth = Math.round(Math.min(MAX_ITEM_WIDTH * labelScale, Math.max(MIN_ITEM_WIDTH * labelScale, viewport / VISIBLE_TABS)));
  const contentWidth = count * itemWidth;
  const maxScroll = Math.max(0, contentWidth - viewport);
  const pillWidth = itemWidth - PILL_INSET * 2;

  const scrollRef = useRef<Animated.ScrollView>(null);
  const placed = useRef(false);
  const sized = useRef(false);
  const scrollX = useSharedValue(0);
  const initialPill = state.index * itemWidth + PILL_INSET;
  const sign = directionSign();
  const pillX = useSharedValue(initialPill);
  const pillTarget = useSharedValue(initialPill);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  // Geometry is derived from the window width, not from onLayout refs, so it can never be stale: slide the pill and
  // bring the active tab to the middle of the strip whenever the route (or the width) changes.
  const scrollToActive = (animated: boolean) => {
    const to = Math.min(maxScroll, Math.max(0, state.index * itemWidth + itemWidth / 2 - viewport / 2));
    scrollRef.current?.scrollTo({ x: to, animated: animated && !reduceMotion });
  };

  useEffect(() => {
    const toPill = state.index * itemWidth + PILL_INSET;
    const first = !placed.current;
    placed.current = true;
    pillTarget.value = toPill;
    pillX.value = first || reduceMotion ? withTiming(toPill, instant) : withSpring(toPill, spring.gentle);
    scrollToActive(!first);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scrollToActive only reads the values listed here
  }, [state.index, itemWidth, maxScroll, viewport, reduceMotion, pillX, pillTarget]);

  // The pill stretches a little while it travels, like a drop being pulled along, then settles to its width.
  const pillStyle = useAnimatedStyle(() => {
    const distance = Math.abs(pillTarget.value - pillX.value) / itemWidth;
    return {
      transform: [{ translateX: pillX.value * sign }, { scaleX: reduceMotion ? 1 : 1 + Math.min(distance, MAX_STRETCH_TABS) * STRETCH_PER_TAB }],
    };
  });

  // Fades sit on the start / end sides (logical), so they follow the reading direction.
  const startFade = useAnimatedStyle(() => ({ opacity: interpolate(scrollX.value, [0, spacing.lg], [0, 1], Extrapolation.CLAMP) }));
  const endFade = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, [maxScroll - spacing.lg, maxScroll], [1, 0], Extrapolation.CLAMP),
  }));

  const activeConfig = TAB_CONFIG[state.routes[state.index]?.name ?? ''];
  const activePill = accentFor(activeConfig?.accent ?? 'ai');

  return (
    <GlassSurface
      accessibilityRole="tablist"
      // Level-3 shadow on the opaque fallback (Android, older iOS, reduce transparency); real glass is translucent.
      style={[styles.bar, { paddingBottom: Math.max(insets?.bottom ?? 0, spacing.sm) }, glassActive ? null : elevation(3)]}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        // The first scrollTo can fire before the strip has a size; once content is measured, jump to the active tab.
        onContentSizeChange={() => {
          if (!sized.current) {
            sized.current = true;
            scrollToActive(false);
          }
        }}
        keyboardShouldPersistTaps="handled"
        // Don't snap or paginate: a free-scrolling strip is easiest to flick, and centring happens on selection.
        contentContainerStyle={{ width: contentWidth, minHeight: ITEM_HEIGHT }}>
        <Animated.View
          pointerEvents="none"
          style={[styles.pill, { width: pillWidth, backgroundColor: activePill.soft }, pillStyle]}
        />
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const known = TAB_CONFIG[route.name];
          const config: TabConfig = known ?? {
            activeIcon: 'ellipse',
            inactiveIcon: 'ellipse-outline',
            accent: 'ai',
          };
          const tint = accentFor(config.accent);
          const color = focused ? tint.text : colors.textMuted;

          const badge = badges?.[route.name] ?? (typeof options.tabBarBadge === 'number' ? options.tabBarBadge : undefined);
          const title = known ? (known.module ? modules[known.module].short : t('tabs.home')) : (options.title ?? route.name);
          const label = options.tabBarAccessibilityLabel ?? title;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              haptics.select();
              navigation.navigate(route.name);
            }
          };

          return (
            <PressableScale
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={badge ? t('badge.withCount', { label, count: badge }) : label}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              scaleTo={0.94}
              ringRadius={radius.lg}
              style={[styles.item, { width: itemWidth }]}>
              <View style={styles.iconSlot}>
                <TabIcon name={focused ? config.activeIcon : config.inactiveIcon} focused={focused} color={color} />
                {badge ? (
                  <View style={[styles.badge, { backgroundColor: colors.error }]}>
                    <Text variant="caption" weight="semiBold" color="onError" numberOfLines={1} maxFontSizeMultiplier={1}>
                      {capCount(badge)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text variant="caption" weight={focused ? 'semiBold' : 'medium'} color={color} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {title}
              </Text>
            </PressableScale>
          );
        })}
      </Animated.ScrollView>

      {/* Edge fades: tell the user the strip continues. Each appears only on the side that has more tabs. */}
      <Fade side="start" color={colors.glassSolid} style={startFade} />
      <Fade side="end" color={colors.glassSolid} style={endFade} />
    </GlassSurface>
  );
}

/** The tab's icon; it pops when its tab becomes the active one. */
function TabIcon({ name, focused, color }: { name: IconName; focused: boolean; color: string }) {
  const pop = usePop(focused);
  return (
    <Animated.View style={pop}>
      <Ionicons name={name} size={ICON_SIZE} color={color} />
    </Animated.View>
  );
}

function Fade({ side, color, style }: { side: 'start' | 'end'; color: string; style: ComponentProps<typeof Animated.View>['style'] }) {
  const steps = Array.from({ length: FADE_STEPS }, (_, i) => i);
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.fade, side === 'start' ? styles.fadeStart : styles.fadeEnd, side === 'start' ? styles.rowStart : styles.rowEnd, style]}>
      {steps.map((i) => (
        // Start: solid at the edge, fading inwards. End: mirrored.
        <View key={i} style={{ width: FADE_STEP_WIDTH, backgroundColor: color, opacity: 0.9 * (1 - i / FADE_STEPS) }} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: spacing.xs,
    borderBottomWidth: 0,
    borderStartWidth: 0,
    borderEndWidth: 0,
  },
  pill: {
    position: 'absolute',
    top: spacing.xs,
    start: 0,
    height: PILL_HEIGHT,
    borderRadius: radius.pill,
  },
  item: {
    minHeight: ITEM_HEIGHT,
    paddingTop: spacing.xs,
    alignItems: 'center',
    gap: 2,
  },
  iconSlot: {
    height: PILL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    end: -spacing.sm,
    minWidth: 16,
    height: 16,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fade: { position: 'absolute', top: spacing.xs, bottom: 0 },
  fadeStart: { start: 0 },
  fadeEnd: { end: 0 },
  rowStart: { flexDirection: 'row' },
  rowEnd: { flexDirection: 'row-reverse' },
});
