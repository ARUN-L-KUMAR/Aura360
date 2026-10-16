import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme';

type Props = ViewProps & {
  /** `regular` is the standard frosted look; `clear` is more transparent (use over imagery). */
  glass?: 'regular' | 'clear';
};

/**
 * Surface for OVERLAYS only: tab bar, sheets, headers, the floating widget. Never wrap content cards in it.
 *
 * On iOS 26+ it renders the system glass effect. Everywhere else - Android, older iOS, or when the user turned on
 * "Reduce transparency" - it renders an opaque `glassSolid` surface with the same border, so contrast never depends on
 * what scrolls underneath.
 */
export function GlassSurface({ glass = 'regular', style, children, ...rest }: Props) {
  const { colors, scheme, reduceTransparency } = useTheme();
  const supported = Platform.OS === 'ios' && isGlassEffectAPIAvailable() && !reduceTransparency;
  const border = { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder };

  if (supported) {
    return (
      <GlassView {...rest} glassEffectStyle={glass} colorScheme={scheme} style={[border, style]}>
        {children}
      </GlassView>
    );
  }
  return (
    <View {...rest} style={[border, { backgroundColor: colors.glassSolid }, style]}>
      {children}
    </View>
  );
}
