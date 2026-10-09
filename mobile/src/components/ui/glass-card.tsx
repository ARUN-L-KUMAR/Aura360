import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

export type GlassCardVariant = 'default' | 'glass' | 'elevated' | 'glow';

export interface GlassCardProps extends ViewProps {
  variant?: GlassCardVariant;
  /** Accent glow color (e.g. moduleColor: #10b981 for finance, #f97316 for fitness) */
  glowColor?: string;
  /** Optional border radius override */
  rounded?: keyof typeof radius | number;
}

export function GlassCard({
  variant = 'glass',
  glowColor,
  rounded = 'lg',
  style,
  children,
  ...rest
}: GlassCardProps) {
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';

  const borderRadius = typeof rounded === 'number' ? rounded : radius[rounded];

  const getBackground = () => {
    switch (variant) {
      case 'glass':
        return isDark ? 'rgba(18, 26, 36, 0.82)' : 'rgba(255, 255, 255, 0.88)';
      case 'elevated':
        return colors.card;
      case 'glow':
        return isDark
          ? glowColor
            ? `${glowColor}0f`
            : 'rgba(18, 26, 36, 0.9)'
          : glowColor
            ? `${glowColor}0a`
            : '#ffffff';
      default:
        return colors.card;
    }
  };

  const getBorderColor = () => {
    if (glowColor) {
      return isDark ? `${glowColor}44` : `${glowColor}33`;
    }
    if (variant === 'glass') {
      return isDark ? 'rgba(34, 48, 65, 0.85)' : 'rgba(226, 232, 240, 0.9)';
    }
    return colors.border;
  };

  const shadowStyles = Platform.select({
    ios: {
      shadowColor: glowColor ?? '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? (glowColor ? 0.25 : 0.2) : 0.05,
      shadowRadius: 10,
    },
    android: {
      elevation: variant === 'elevated' || glowColor ? 4 : 2,
    },
  });

  return (
    <View
      {...rest}
      style={[
        styles.base,
        shadowStyles,
        {
          backgroundColor: getBackground(),
          borderColor: getBorderColor(),
          borderRadius,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    padding: spacing.lg,
  },
});
