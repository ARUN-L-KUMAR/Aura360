import { memo, useId } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

type Props = {
  color: string;
  /** Peak opacity at the centre (0-1). It fades to nothing at the edge. */
  opacity: number;
  /** Diameter in points. */
  size: number;
  style?: ViewStyle;
};

/**
 * A soft round glow: a radial gradient that fades to transparent. The app's stand-in for a blurred light (real blur is a
 * native module, and it is slow on lower-end Android phones). Decorative and never touchable.
 */
export const Glow = memo(function Glow({ color, opacity, size, style }: Props) {
  const id = useId();
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset="0.55" stopColor={color} stopOpacity={opacity * 0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
});
