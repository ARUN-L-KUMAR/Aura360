import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarHeightContext } from 'expo-router/build/react-navigation/bottom-tabs';
import { useContext, type ComponentProps } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { readableOn } from '@/components/ui/logic';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { layout, palettes, radius, spacing, useTheme, type ModuleKey } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface FloatingActionProps {
  icon?: IconName;
  onPress: () => void;
  /** Fill colour. Prefer `accent`; a raw colour gets whichever of light / dark content reads better on it. */
  color?: string;
  /** Module accent for the fill (`accent(key).solid`) with its matching content colour. */
  accent?: ModuleKey;
  accessibilityLabel: string;
  /** Visible text: turns the button into an extended FAB (icon + label). */
  label?: string;
  /** Position override for the wrapper (e.g. `{ start: 16 }`). */
  style?: StyleProp<ViewStyle>;
}

const FAB_SIZE = 56;

/**
 * Floating action button: 56pt, elevation 3, accent fill, press-scale + haptic. Sits at the bottom end (right in LTR) above the safe area
 * (inside the tab navigator the tab bar already covers it). `label` makes it an extended FAB.
 */
export function FloatingAction({ icon = 'add', onPress, color, accent, accessibilityLabel, label, style }: FloatingActionProps) {
  const { colors, accent: accentFor, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const inTabs = !!useContext(BottomTabBarHeightContext);

  let fill = colors.primary;
  let content = colors.primaryText;
  if (accent) {
    const a = accentFor(accent);
    fill = a.solid;
    content = a.onSolid;
  } else if (color) {
    fill = color;
    // Pick the content colour with the higher contrast ratio.
    content = readableOn(color, colors.primaryText, palettes.dark.background);
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { end: layout.screenPadding, bottom: spacing.lg + (inTabs ? 0 : insets.bottom) }, style]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        haptic="tap"
        scaleTo={0.94}
        ringRadius={radius.pill}
        style={[styles.button, label ? styles.extended : styles.round, { backgroundColor: fill }, elevation(3)]}>
        <Ionicons name={icon} size={24} color={content} />
        {label ? (
          <Text variant="label" weight="semiBold" color={content} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute' },
  button: {
    height: FAB_SIZE,
    minWidth: FAB_SIZE,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  round: { width: FAB_SIZE },
  extended: { paddingHorizontal: spacing.lg },
});
