import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useEffect, useRef, type ComponentProps } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { Text } from '@/components/ui/text';
import { modules } from '@/features/modules';
import { radius, spacing, useTheme } from '@/theme';

export type { BottomTabBarProps };

type IconName = ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  label: string;
  activeIcon: IconName;
  inactiveIcon: IconName;
  color?: string;
}

const TAB_CONFIG: Record<string, TabConfig> = {
  index: {
    label: 'Home',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },
  finance: {
    label: 'Finance',
    activeIcon: 'wallet',
    inactiveIcon: 'wallet-outline',
    color: modules.finance.color,
  },
  fashion: {
    label: 'Fashion',
    activeIcon: 'shirt',
    inactiveIcon: 'shirt-outline',
    color: modules.fashion.color,
  },
  saved: {
    label: 'Saved',
    activeIcon: 'bookmark',
    inactiveIcon: 'bookmark-outline',
    color: modules.saved.color,
  },
  fitness: {
    label: 'Fitness',
    activeIcon: 'barbell',
    inactiveIcon: 'barbell-outline',
    color: modules.fitness.color,
  },
  food: {
    label: 'Food',
    activeIcon: 'restaurant',
    inactiveIcon: 'restaurant-outline',
    color: modules.food.color,
  },
  skincare: {
    label: 'Skincare',
    activeIcon: 'sparkles',
    inactiveIcon: 'sparkles-outline',
    color: modules.skincare.color,
  },
  notes: {
    label: 'Notes',
    activeIcon: 'document-text',
    inactiveIcon: 'document-text-outline',
    color: modules.notes.color,
  },
  time: {
    label: 'Time',
    activeIcon: 'time',
    inactiveIcon: 'time-outline',
    color: modules.time.color,
  },
  ai: {
    label: 'Ask Aura',
    activeIcon: 'chatbubble-ellipses',
    inactiveIcon: 'chatbubble-ellipses-outline',
    color: modules.ai.color,
  },
};

export function AppTabs({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const bottomInset = Math.max(insets?.bottom ?? 0, 10);

  const scrollRef = useRef<ScrollView>(null);
  const tabLayouts = useRef<Record<number, { x: number; width: number }>>({});

  // Auto-scroll to center the active tab whenever the active route changes
  useEffect(() => {
    const layout = tabLayouts.current[state.index];
    if (layout && scrollRef.current) {
      const scrollX = Math.max(0, layout.x - 120);
      scrollRef.current.scrollTo({ x: scrollX, animated: true });
    }
  }, [state.index]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.96)',
          borderTopColor: colors.border,
          paddingBottom: bottomInset,
        },
      ]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name] ?? {
            label: options.title ?? route.name,
            activeIcon: 'ellipse' as IconName,
            inactiveIcon: 'ellipse-outline' as IconName,
          };

          const activeColor = config.color ?? colors.text;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? config.label}
              onPress={onPress}
              onLongPress={onLongPress}
              onLayout={(e: LayoutChangeEvent) => {
                tabLayouts.current[index] = {
                  x: e.nativeEvent.layout.x,
                  width: e.nativeEvent.layout.width,
                };
              }}
              style={({ pressed }) => [
                styles.tabItem,
                {
                  opacity: pressed ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.93 : 1 }],
                },
              ]}>
              <View
                style={[
                  styles.iconWrapper,
                  isFocused && {
                    backgroundColor: isDark ? `${activeColor}24` : `${activeColor}15`,
                  },
                ]}>
                <Ionicons
                  name={isFocused ? config.activeIcon : config.inactiveIcon}
                  size={21}
                  color={isFocused ? activeColor : colors.textMuted}
                />
              </View>

              <Text
                style={[
                  styles.label,
                  {
                    color: isFocused ? activeColor : colors.textMuted,
                    fontWeight: isFocused ? '700' : '500',
                  },
                ]}>
                {config.label}
              </Text>

              {/* Tiny active dot indicator */}
              <View
                style={[
                  styles.activeDot,
                  {
                    backgroundColor: isFocused ? activeColor : 'transparent',
                    opacity: isFocused ? 1 : 0,
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    gap: 4,
  },
  tabItem: {
    minWidth: 68,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    gap: 2,
  },
  iconWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    letterSpacing: -0.2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
});
