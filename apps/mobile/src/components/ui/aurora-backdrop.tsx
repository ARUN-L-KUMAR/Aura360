import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Glow } from '@/components/ui/glow';
import { useTheme } from '@/theme';

/**
 * The one background every tab shares: two soft lights (the brand indigo at the top, the brand sky lower down) behind the
 * content. Drawn once in the tab layout, so every module reads as the same app; the colour of a module lives in its own
 * hero and icons, never in the page. Dimmer in the light theme so text keeps its contrast.
 */
export const AuroraBackdrop = memo(function AuroraBackdrop() {
  const { scheme, shades } = useTheme();
  const strength = scheme === 'dark' ? 1 : 0.38;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Glow color={shades.primary[500]} opacity={0.5 * strength} size={520} style={{ top: -220, end: -170 }} />
      <Glow color={shades.secondary[400]} opacity={0.22 * strength} size={420} style={{ top: 260, start: -240 }} />
    </View>
  );
});
