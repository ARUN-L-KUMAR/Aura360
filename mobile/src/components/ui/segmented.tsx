import { useEffect, useRef, useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { instant } from '@/components/ui/motion';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { directionSign } from '@/i18n/rtl';
import { haptics } from '@/lib/haptics';
import { layout, radius, spacing, spring, useTheme } from '@/theme';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

type Props<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Disables every segment. */
  disabled?: boolean;
  /** Spoken name of the group, e.g. "Transaction type". */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const PAD = spacing.xs;
/** Segment height. With the track padding the control is 48pt tall and every segment is a >= 44pt target. */
const SEGMENT_HEIGHT = layout.minTouchTarget - PAD;

/**
 * Single-choice control with a sliding thumb. Equal-width segments; labels wrap to two lines instead of truncating.
 * Announced as a radio group: each segment is a radio with a checked state.
 */
export function Segmented<T extends string>({ options, value, onChange, disabled, accessibilityLabel, style }: Props<T>) {
  const { colors, scheme, reduceMotion, elevation } = useTheme();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const x = useSharedValue(0);
  const placed = useRef(false);

  const count = Math.max(options.length, 1);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const segmentWidth = size ? (size.width - PAD * 2) / count : 0;

  useEffect(() => {
    if (!size) return;
    const to = index * segmentWidth;
    if (!placed.current || reduceMotion) {
      placed.current = true;
      x.value = withTiming(to, instant);
    } else {
      x.value = withSpring(to, spring.gentle);
    }
  }, [index, segmentWidth, size, reduceMotion, x]);

  // `x` counts from the start edge; the thumb is anchored with `start`, so only the translation needs mirroring.
  const sign = directionSign();
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * sign }] }));

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  };

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      onLayout={onLayout}
      style={[{ flexDirection: 'row', backgroundColor: colors.cardMuted, borderRadius: radius.lg, padding: PAD }, style]}>
      {size ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: PAD,
              start: PAD,
              width: segmentWidth,
              height: size.height - PAD * 2,
              borderRadius: radius.md,
              // The web's active trigger: a raised surface with a ring (a lighter slate in dark mode, white in light).
              backgroundColor: scheme === 'dark' ? colors.accent : colors.card,
              borderWidth: 1,
              borderColor: scheme === 'dark' ? colors.border : colors.borderSubtle,
              ...(scheme === 'dark' ? null : elevation(1)),
            },
            thumbStyle,
          ]}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        const off = disabled || option.disabled;
        return (
          <View key={option.value} style={{ flex: 1 }}>
            <PressableScale
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected, disabled: !!off }}
              disabled={off}
              scaleTo={1}
              ringRadius={radius.md}
              hitSlop={{ top: PAD, bottom: PAD }}
              onPress={() => {
                if (selected) return;
                haptics.select();
                onChange(option.value);
              }}
              style={{
                minHeight: SEGMENT_HEIGHT,
                paddingHorizontal: spacing.sm,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text
                variant="label"
                weight={selected ? 'bold' : 'medium'}
                color={selected ? 'text' : 'textMuted'}
                numberOfLines={2}
                style={{ textAlign: 'center' }}>
                {option.label}
              </Text>
            </PressableScale>
          </View>
        );
      })}
    </View>
  );
}
