import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { IconName } from '@/components/ui/button';
import { AccentGradient } from '@/components/ui/gradient';
import { radius, useTheme, type ModuleKey } from '@/theme';

/** Share of the disc the glyph fills. */
const GLYPH_RATIO = 0.46;

type Props = {
  icon: IconName;
  /** Diameter in points. */
  size: number;
  /** Module accent for the wash, the hairline and the glyph. */
  accent: ModuleKey;
  style?: StyleProp<ViewStyle>;
};

/**
 * A round accent-washed disc holding one icon: the building block of the onboarding and permission illustrations.
 * Decorative (hidden from screen readers); the text next to it carries the meaning.
 */
export const IconDisc = memo(function IconDisc({ icon, size, accent, style }: Props) {
  const { accent: accentFor } = useTheme();
  const tone = accentFor(accent);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.disc, { width: size, height: size, borderColor: tone.border }, style]}>
      <AccentGradient accent={accent} />
      <Ionicons name={icon} size={Math.round(size * GLYPH_RATIO)} color={tone.text} />
    </View>
  );
});

const styles = StyleSheet.create({
  disc: {
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
