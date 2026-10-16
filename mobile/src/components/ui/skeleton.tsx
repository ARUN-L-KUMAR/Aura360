import { useEffect, useId, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Card } from '@/components/ui/card';
import { duration, easing, layout, radius, spacing, useTheme } from '@/theme';

const SHIMMER_MS = duration.slow * 3;

export type SkeletonShape = 'box' | 'circle' | 'line';

export type SkeletonProps = {
  /** box: rounded rectangle. circle: avatar placeholder (uses `size`). line: one line of text. Default `box`. */
  shape?: SkeletonShape;
  width?: DimensionValue;
  height?: number;
  /** Diameter for `circle`. */
  size?: number;
  /** Corner radius token or number (box only). */
  rounded?: keyof typeof radius | number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Loading placeholder with a soft moving highlight (translateX on the UI thread). Static when the user prefers
 * reduced motion. Hidden from screen readers: wrap groups in `SkeletonGroup` (or use a preset) to announce "Loading".
 */
export function Skeleton({ shape = 'box', width, height, size = 40, rounded = 'md', style }: SkeletonProps) {
  const { colors, reduceMotion } = useTheme();
  const gradientId = useId().replace(/\W/g, '');
  const bandWidth = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(withTiming(1, { duration: SHIMMER_MS, easing: Easing.bezier(...easing.standard) }), -1, false);
    return () => cancelAnimation(progress);
  }, [reduceMotion, progress]);

  const band = useAnimatedStyle(() => ({
    opacity: bandWidth.value > 0 ? 1 : 0,
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-bandWidth.value, bandWidth.value]) }],
  }));

  const dimensions: ViewStyle =
    shape === 'circle'
      ? { width: size, height: size, borderRadius: radius.full }
      : shape === 'line'
        ? { width: width ?? '100%', height: height ?? spacing.md, borderRadius: radius.pill }
        : { width: width ?? '100%', height: height ?? spacing.xxl, borderRadius: typeof rounded === 'number' ? rounded : radius[rounded] };

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e: LayoutChangeEvent) => {
        bandWidth.set(e.nativeEvent.layout.width);
      }}
      style={[{ overflow: 'hidden', backgroundColor: colors.skeletonBase }, dimensions, style]}>
      {reduceMotion ? null : (
        <Animated.View style={[StyleSheet.absoluteFill, band]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={colors.skeletonHighlight} stopOpacity={0} />
                <Stop offset="0.5" stopColor={colors.skeletonHighlight} stopOpacity={1} />
                <Stop offset="1" stopColor={colors.skeletonHighlight} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

/** Groups skeletons into one polite "Loading" announcement; the pieces inside are not read individually. */
export function SkeletonGroup({ children, label = 'Loading', style }: { children: ReactNode; label?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View accessible accessibilityLabel={label} accessibilityState={{ busy: true }} accessibilityLiveRegion="polite" style={style}>
      {children}
    </View>
  );
}

/** Paragraph placeholder: `lines` text lines, the last one shorter. */
export function SkeletonText({ lines = 3, lastLineWidth = '60%', style }: { lines?: number; lastLineWidth?: DimensionValue; style?: StyleProp<ViewStyle> }) {
  return (
    <SkeletonGroup style={[{ gap: spacing.sm }, style]}>
      <TextLines lines={lines} lastLineWidth={lastLineWidth} />
    </SkeletonGroup>
  );
}

function TextLines({ lines, lastLineWidth }: { lines: number; lastLineWidth: DimensionValue }) {
  return (
    <>
      {Array.from({ length: Math.max(1, lines) }, (_, i) => (
        <Skeleton key={i} shape="line" width={i === lines - 1 && lines > 1 ? lastLineWidth : '100%'} />
      ))}
    </>
  );
}

function ListItemBody({ avatar = true, trailing = false }: { avatar?: boolean; trailing?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: layout.minTouchTarget + spacing.md, paddingVertical: spacing.md }}>
      {avatar ? <Skeleton shape="circle" size={layout.minTouchTarget - spacing.xs} /> : null}
      <View style={{ flex: 1, gap: spacing.sm }}>
        <Skeleton shape="line" width="55%" />
        <Skeleton shape="line" width="80%" height={spacing.sm + spacing.xs} />
      </View>
      {trailing ? <Skeleton shape="line" width={spacing.xxl + spacing.md} /> : null}
    </View>
  );
}

export type SkeletonListItemProps = { avatar?: boolean; trailing?: boolean; style?: StyleProp<ViewStyle> };

/** Placeholder shaped like a `ListItem`. */
export function SkeletonListItem({ avatar = true, trailing = false, style }: SkeletonListItemProps) {
  return (
    <SkeletonGroup style={style}>
      <ListItemBody avatar={avatar} trailing={trailing} />
    </SkeletonGroup>
  );
}

/** `count` list-item placeholders announced as a single "Loading". */
export function SkeletonList({ count = 5, avatar = true, trailing = false, style }: { count?: number; avatar?: boolean; trailing?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <SkeletonGroup style={style}>
      {Array.from({ length: Math.max(1, count) }, (_, i) => (
        <ListItemBody key={i} avatar={avatar} trailing={trailing} />
      ))}
    </SkeletonGroup>
  );
}

/** Placeholder shaped like a content card: header row, text lines and an optional media block. */
export function SkeletonCard({ lines = 2, media = false, style }: { lines?: number; media?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <SkeletonGroup style={style}>
      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Skeleton shape="circle" size={layout.minTouchTarget - spacing.xs} />
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Skeleton shape="line" width="50%" />
            <Skeleton shape="line" width="30%" height={spacing.sm + spacing.xs} />
          </View>
        </View>
        {media ? <Skeleton height={layout.minTouchTarget * 3} rounded="md" /> : null}
        <View style={{ gap: spacing.sm }}>
          <TextLines lines={lines} lastLineWidth="65%" />
        </View>
      </Card>
    </SkeletonGroup>
  );
}
