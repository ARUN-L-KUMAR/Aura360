import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { scenePalette, type ScenePalette } from '@/illustrations/palette';
import { SCENES, type SceneName } from '@/illustrations/registry';
import type { SceneLayer } from '@/illustrations/types';
import { useTheme, type ModuleKey } from '@/theme';

type LayerViewProps = {
  layer: SceneLayer;
  width: number;
  height: number;
  p: ScenePalette;
  variant?: string;
  animated: boolean;
  scrollY?: SharedValue<number>;
};

/** One stacked SVG layer with its own gentle loop and optional scroll parallax (transform only). */
function LayerView({ layer, width, height, p, variant, animated, scrollY }: LayerViewProps) {
  const { reduceMotion } = useTheme();
  const t = useSharedValue(0);

  // Plain numbers for the worklet (it must not capture the layer object, which holds a component).
  const dx = layer.motion?.dx ?? 0;
  const dy = layer.motion?.dy ?? 0;
  const breathe = layer.motion?.scale ?? 0;
  const periodMs = (layer.motion?.period ?? 6) * 1000;
  const delayMs = (layer.motion?.delay ?? 0) * 1000;
  const parallax = layer.parallax ?? 0;
  const moves = !!layer.motion && (dx !== 0 || dy !== 0 || breathe !== 0);
  const run = animated && moves && !reduceMotion;

  useEffect(() => {
    if (!run) {
      t.set(0);
      return;
    }
    t.set(withDelay(delayMs, withRepeat(withTiming(1, { duration: periodMs / 2, easing: Easing.inOut(Easing.sin) }), -1, true)));
    return () => cancelAnimation(t);
  }, [run, periodMs, delayMs, t]);

  const style = useAnimatedStyle(() => {
    const s = t.get();
    const shift = parallax && scrollY && !reduceMotion ? -Math.max(0, scrollY.get()) * parallax : 0;
    return { transform: [{ translateX: dx * s }, { translateY: dy * s + shift }, { scale: 1 + breathe * s }] };
  });

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <layer.Component width={width} height={height} p={p} variant={variant} />
    </Animated.View>
  );
}

type Props = {
  scene: SceneName;
  /** Scene variant, e.g. a time of day for the Home hero. */
  variant?: string;
  /** Module accent used for the artwork's main colour. Default: the brand accent. */
  accent?: ModuleKey;
  /** Fixed width in points. Omit to fill the parent's width. Height follows the scene's aspect ratio. */
  width?: number;
  /** Fixed height in points (width follows). Wins over `width`. */
  height?: number;
  /** Idle motion on/off. Always off when the user prefers reduced motion. Default true. */
  animated?: boolean;
  /** Pass the scroll offset of the screen to get layer parallax. */
  scrollY?: SharedValue<number>;
  /** Read aloud by screen readers. Leave empty for purely decorative artwork (hidden from them). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Draws a registered illustration with the app's theme: palette from the current scheme and accent, idle motion per
 * layer, optional scroll parallax, and screen-reader handling. The scenes themselves are pure SVG (src/illustrations).
 */
export function Illustration({ scene, variant, accent = 'ai', width, height, animated = true, scrollY, accessibilityLabel, style }: Props) {
  const { scheme } = useTheme();
  const def = SCENES[scene];
  const p = useMemo(() => scenePalette(scheme, accent), [scheme, accent]);
  const [measured, setMeasured] = useState(0);

  const w = height !== undefined ? height * def.aspect : (width ?? measured);
  const h = w / def.aspect;

  const onLayout = (e: LayoutChangeEvent) => {
    if (width === undefined && height === undefined) setMeasured(e.nativeEvent.layout.width);
  };

  const label = accessibilityLabel?.trim();
  return (
    <View
      onLayout={onLayout}
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label || undefined}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      style={[{ width: width === undefined && height === undefined ? '100%' : w, height: h }, style]}>
      {w > 0
        ? def.layers.map((layer) => (
            <LayerView key={layer.id} layer={layer} width={w} height={h} p={p} variant={variant} animated={animated} scrollY={scrollY} />
          ))
        : null}
    </View>
  );
}
