import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { haptics } from '@/lib/haptics';
import { layout, radius, spacing, spring, useTheme, type ModuleKey } from '@/theme';

export type TabItem<T extends string = string> = {
  value: T;
  label: string;
  /** Count shown next to the label (unread, items...). Part of the accessibility label. */
  count?: number;
  disabled?: boolean;
};

type Props<T extends string> = {
  tabs: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Tabs size to their label and scroll sideways. Default: tabs share the width equally (use for 2-4 tabs). */
  scrollable?: boolean;
  /** Module accent for the selected tab and indicator. Default: brand primary. */
  accent?: ModuleKey;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

type Box = { x: number; w: number };
const INDICATOR_HEIGHT = 3;

/**
 * In-screen tabs, underline style. The indicator slides with translateX / scaleX on the UI thread. Selected state is
 * the indicator + semi-bold label, not colour alone.
 */
export function Tabs<T extends string>({ tabs, value, onChange, scrollable = false, accent, accessibilityLabel, style }: Props<T>) {
  const { colors, accent: accentFor, reduceMotion } = useTheme();
  const palette = accent ? accentFor(accent) : null;
  const selectedText = palette?.text ?? colors.primaryAccent;
  const indicatorColor = palette?.solid ?? colors.primary;

  const [width, setWidth] = useState(0);
  const [boxes, setBoxes] = useState<Record<number, Box>>({});
  const scrollRef = useRef<ScrollView>(null);
  const placed = useRef(false);
  const x = useSharedValue(0);
  const w = useSharedValue(1);
  const visible = useSharedValue(0);

  const index = Math.max(
    0,
    tabs.findIndex((t) => t.value === value),
  );
  const fixedWidth = tabs.length ? width / tabs.length : 0;
  const box: Box | undefined = scrollable ? boxes[index] : width ? { x: index * fixedWidth, w: fixedWidth } : undefined;
  const boxX = box?.x;
  const boxW = box?.w;

  useEffect(() => {
    if (boxX === undefined || boxW === undefined) return;
    // The indicator is 1pt wide and stretched: centre it on the tab, then scale it to the tab's width.
    const toX = boxX + boxW / 2 - 0.5;
    if (!placed.current || reduceMotion) {
      placed.current = true;
      x.value = withTiming(toX, { duration: 1 });
      w.value = withTiming(boxW, { duration: 1 });
      visible.value = 1;
    } else {
      x.value = withSpring(toX, spring.gentle);
      w.value = withSpring(boxW, spring.gentle);
    }
  }, [boxX, boxW, reduceMotion, x, w, visible]);

  // Keep the selected tab on screen in scrollable mode.
  useEffect(() => {
    if (!scrollable || boxX === undefined || boxW === undefined || !width) return;
    scrollRef.current?.scrollTo({ x: Math.max(0, boxX + boxW / 2 - width / 2), animated: !reduceMotion });
  }, [scrollable, boxX, boxW, width, reduceMotion]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [{ translateX: x.value }, { scaleX: w.value }],
  }));

  const items = tabs.map((tab, i) => {
    const selected = i === index;
    const count = tab.count;
    const hasCount = typeof count === 'number';
    return (
      <View
        key={tab.value}
        style={scrollable ? undefined : styles.fill}
        onLayout={
          scrollable
            ? (e: LayoutChangeEvent) => {
                const { x: bx, width: bw } = e.nativeEvent.layout;
                setBoxes((prev) => (prev[i]?.x === bx && prev[i]?.w === bw ? prev : { ...prev, [i]: { x: bx, w: bw } }));
              }
            : undefined
        }>
        <PressableScale
          accessibilityRole="tab"
          accessibilityLabel={hasCount ? `${tab.label}, ${count}` : tab.label}
          accessibilityState={{ selected, disabled: !!tab.disabled }}
          disabled={tab.disabled}
          scaleTo={1}
          ringRadius={radius.sm}
          onPress={() => {
            if (selected) return;
            haptics.select();
            onChange(tab.value);
          }}
          style={styles.item}>
          <Text variant="label" weight={selected ? 'semiBold' : 'medium'} color={selected ? selectedText : 'textSecondary'} numberOfLines={1}>
            {tab.label}
          </Text>
          {hasCount ? (
            <View style={[styles.count, { backgroundColor: selected ? (palette?.soft ?? colors.primaryContainer) : colors.cardMuted }]}>
              <Text
                variant="caption"
                weight="semiBold"
                numeric
                maxFontSizeMultiplier={1.2}
                color={selected ? (palette?.text ?? colors.onPrimaryContainer) : 'textSecondary'}>
                {count > 99 ? '99+' : count}
              </Text>
            </View>
          ) : null}
        </PressableScale>
      </View>
    );
  });

  const indicator = (
    <Animated.View
      pointerEvents="none"
      style={[styles.indicator, { backgroundColor: indicatorColor }, indicatorStyle]}
    />
  );

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.root, { borderBottomColor: colors.border }, style]}>
      {scrollable ? (
        <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.row}>
            {items}
            {indicator}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.row}>
          {items}
          {indicator}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row' },
  fill: { flex: 1 },
  item: {
    minHeight: layout.minTouchTarget + spacing.xs,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  count: {
    minWidth: 20,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  indicator: { position: 'absolute', left: 0, bottom: 0, width: 1, height: INDICATOR_HEIGHT },
});
