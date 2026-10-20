import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useEffect, useState, type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { MoreHubSheet } from '@/components/nav/more-hub-sheet';
import { QuickLogSheet } from '@/components/nav/quick-log-sheet';
import { GlassSurface, useGlassSupported } from '@/components/ui/glass-surface';
import { capCount } from '@/components/ui/logic';
import { instant, usePop } from '@/components/ui/motion';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { modules, type ModuleKey } from '@/features/modules';
import type { SlotIndex } from '@/features/nav/slots';
import { useTabSlots } from '@/features/nav/use-tab-slots';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { duration, radius, spacing, useTheme } from '@/theme';

export type { BottomTabBarProps };

type IconName = ComponentProps<typeof Ionicons>['name'];

const ACTIVE_ICON: Record<string, IconName> = {
  index: 'home',
  finance: 'wallet',
  fashion: 'shirt',
  saved: 'bookmark',
  fitness: 'barbell',
  food: 'restaurant',
  skincare: 'sparkles',
  notes: 'document-text',
  time: 'time',
  ai: 'chatbubble-ellipses',
};

const INACTIVE_ICON: Record<string, IconName> = {
  index: 'home-outline',
  finance: 'wallet-outline',
  fashion: 'shirt-outline',
  saved: 'bookmark-outline',
  fitness: 'barbell-outline',
  food: 'restaurant-outline',
  skincare: 'sparkles-outline',
  notes: 'document-text-outline',
  time: 'time-outline',
  ai: 'chatbubble-ellipses-outline',
};

const PILL_HEIGHT = 52;
const ICON_SIZE = 21;
const ICON_SLOT = 24;
const LOG_SIZE = 48;

export type AppTabsProps = BottomTabBarProps & {
  /** Badge counts by route name, e.g. `{ notes: 3 }`. A route's `tabBarBadge` option is used when this has no entry. */
  badges?: Record<string, number | undefined>;
};

/**
 * Bottom navigation: five fixed slots. Home, two modules the user pinned (Finance and Fashion until they change them;
 * long press a pinned tab, or open More, to swap one), the raised "+" that opens the quick-log sheet, and More, which
 * opens every module. All ten tab routes still exist: a module that is not pinned is reached from More, and while it is
 * open the More slot shows its name and icon so the user always knows where they are.
 */
export function AppTabs({ state, descriptors, navigation, insets, badges }: AppTabsProps) {
  const { colors, scheme, elevation } = useTheme();
  const { t } = useTranslation('common');
  const glassActive = useGlassSupported();
  const { slots } = useTabSlots();
  const [logOpen, setLogOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [customizeSlot, setCustomizeSlot] = useState<SlotIndex | null>(null);

  const currentName = state.routes[state.index]?.name ?? 'index';
  const pinned = ['index', slots[0], slots[1]];
  const moreActive = !pinned.includes(currentName);
  const moreModule = moreActive && currentName in modules ? modules[currentName as ModuleKey] : null;

  const titleOf = (name: string) => (name === 'index' ? t('tabs.home') : name in modules ? modules[name as ModuleKey].short : name);

  const renderRoute = (name: string, slot: SlotIndex | null) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return null;
    const focused = currentName === name;
    const options = descriptors[route.key]?.options;
    const badge = badges?.[name] ?? (typeof options?.tabBarBadge === 'number' ? options.tabBarBadge : undefined);
    const title = titleOf(name);
    const label = options?.tabBarAccessibilityLabel ?? title;
    return (
      <Slot
        key={name}
        focused={focused}
        icon={focused ? (ACTIVE_ICON[name] ?? 'ellipse') : (INACTIVE_ICON[name] ?? 'ellipse-outline')}
        title={title}
        badge={badge}
        accessibilityLabel={badge ? t('badge.withCount', { label, count: badge }) : label}
        accessibilityHint={slot === null ? undefined : t('nav.slotHint')}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            haptics.select();
            navigation.navigate(route.name);
          }
        }}
        onLongPress={
          slot === null
            ? undefined
            : () => {
                haptics.impact();
                setCustomizeSlot(slot);
                setMoreOpen(true);
              }
        }
      />
    );
  };

  return (
    <>
      <GlassSurface
        accessibilityRole="tablist"
        // The web's bar: a hairline ring on top, no shadow in dark mode; a soft lift on the opaque fallback in light mode.
        style={[
          styles.bar,
          { paddingBottom: Math.max(insets?.bottom ?? 0, spacing.sm), borderTopWidth: 1, borderTopColor: colors.border },
          glassActive || scheme === 'dark' ? null : elevation(2),
        ]}>
        <View style={styles.row}>
          {renderRoute('index', null)}
          {renderRoute(slots[0], 0)}

          <View style={styles.logSlot}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t('nav.logA11y')}
              haptic="tap"
              scaleTo={0.92}
              ringRadius={radius.pill}
              onPress={() => setLogOpen(true)}
              style={[styles.log, { backgroundColor: colors.primary }, elevation(3)]}>
              <Ionicons name="add" size={28} color={colors.primaryText} />
            </PressableScale>
          </View>

          {renderRoute(slots[1], 1)}
          <Slot
            focused={moreActive}
            icon={moreModule ? (ACTIVE_ICON[currentName] ?? 'ellipsis-horizontal') : 'grid-outline'}
            title={moreModule ? moreModule.short : t('nav.more')}
            accessibilityLabel={moreModule ? t('nav.moreInModule', { module: moreModule.label }) : t('nav.moreOpen')}
            onPress={() => {
              setCustomizeSlot(null);
              setMoreOpen(true);
            }}
          />
        </View>
      </GlassSurface>

      <QuickLogSheet visible={logOpen} onClose={() => setLogOpen(false)} />
      <MoreHubSheet visible={moreOpen} onClose={() => setMoreOpen(false)} customizeSlot={customizeSlot} />
    </>
  );
}

type SlotProps = {
  focused: boolean;
  icon: IconName;
  title: string;
  badge?: number;
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress: () => void;
  onLongPress?: () => void;
};

/** One bar slot: icon over a tiny label, with the solid primary pill fading in behind it when active. */
function Slot({ focused, icon, title, badge, accessibilityLabel, accessibilityHint, onPress, onLongPress }: SlotProps) {
  const { colors, reduceMotion } = useTheme();
  const color = focused ? colors.primaryText : colors.textMuted;
  const pop = usePop(focused);
  const fade = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    fade.set(withTiming(focused ? 1 : 0, reduceMotion ? instant : { duration: duration.fast }));
  }, [focused, reduceMotion, fade]);

  const pillStyle = useAnimatedStyle(() => ({ opacity: fade.get(), transform: [{ scale: 0.92 + 0.08 * fade.get() }] }));

  return (
    <PressableScale
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      onLongPress={onLongPress}
      scaleTo={0.94}
      ringRadius={radius.lg}
      style={styles.item}>
      <Animated.View pointerEvents="none" style={[styles.pill, { backgroundColor: colors.primary }, pillStyle]} />
      <View style={styles.iconSlot}>
        <Animated.View style={pop}>
          <Ionicons name={icon} size={ICON_SIZE} color={color} />
        </Animated.View>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: colors.error }]}>
            <Text variant="caption" weight="semiBold" color="onError" numberOfLines={1} maxFontSizeMultiplier={1}>
              {capCount(badge)}
            </Text>
          </View>
        ) : null}
      </View>
      <Text variant="overline" color={color} numberOfLines={1} maxFontSizeMultiplier={1.2} style={styles.label}>
        {title}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 0,
    borderStartWidth: 0,
    borderEndWidth: 0,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  item: {
    flex: 1,
    height: PILL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginHorizontal: 2,
  },
  pill: {
    ...StyleSheet.absoluteFill as object,
    borderRadius: radius.lg,
  },
  iconSlot: {
    height: ICON_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { letterSpacing: 0.5 },
  logSlot: { flex: 1, alignItems: 'center', justifyContent: 'center', height: PILL_HEIGHT },
  log: {
    width: LOG_SIZE,
    height: LOG_SIZE,
    borderRadius: radius.pill,
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
});
