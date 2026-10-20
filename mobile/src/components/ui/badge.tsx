import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, type ComponentProps, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { capCount } from '@/components/ui/logic';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/i18n';
import { radius, spacing, useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type BadgeSeverity = 'info' | 'success' | 'warning' | 'error' | 'neutral';
export type BadgeVariant = 'dot' | 'count' | 'label';

const SEVERITY_ICON: Record<BadgeSeverity, IconName | undefined> = {
  info: 'information-circle',
  success: 'checkmark-circle',
  warning: 'warning',
  error: 'alert-circle',
  neutral: undefined,
};

export type BadgeProps = {
  /** dot: small indicator. count: number with a 99+ cap. label: status text with an icon. Default `label`. */
  variant?: BadgeVariant;
  severity?: BadgeSeverity;
  /** Text for the `label` variant. */
  label?: string;
  /** Number for the `count` variant. Hidden at 0 unless `showZero`. */
  count?: number;
  /** Counts above this show as "{max}+". Default 99. */
  max?: number;
  showZero?: boolean;
  /** Overrides the severity icon on `label` badges. `false` hides it (the text still carries the meaning). */
  icon?: IconName | false;
  size?: 'sm' | 'md';
  /** Spoken text. Required for good a11y on `dot`; defaults are derived for the other variants. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

function useSeverityColors(severity: BadgeSeverity) {
  const { colors } = useTheme();
  switch (severity) {
    case 'info':
      return { solid: colors.info, onSolid: colors.onInfo, soft: colors.infoContainer, onSoft: colors.onInfoContainer, border: colors.infoBorder };
    case 'success':
      return { solid: colors.success, onSolid: colors.onSuccess, soft: colors.successContainer, onSoft: colors.onSuccessContainer, border: colors.successBorder };
    case 'warning':
      return { solid: colors.warning, onSolid: colors.onWarning, soft: colors.warningContainer, onSoft: colors.onWarningContainer, border: colors.warningBorder };
    case 'error':
      return { solid: colors.error, onSolid: colors.onError, soft: colors.errorContainer, onSoft: colors.onErrorContainer, border: colors.errorBorder };
    default:
      return { solid: colors.textSecondary, onSolid: colors.textInverse, soft: colors.cardMuted, onSoft: colors.textSecondary, border: colors.border };
  }
}

/**
 * Status indicator. `label` badges always carry text (and an icon by default); `count` badges carry the number;
 * `dot` is a bare indicator, so give it an `accessibilityLabel` ("Unread"). Memoised.
 */
function BadgeImpl({
  variant = 'label',
  severity,
  label,
  count = 0,
  max = 99,
  showZero = false,
  icon,
  size = 'md',
  accessibilityLabel,
  style,
}: BadgeProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const tone = severity ?? (variant === 'label' ? 'neutral' : 'error');
  const c = useSeverityColors(tone);

  if (variant === 'dot') {
    const dot = size === 'sm' ? spacing.sm : spacing.md - 2;
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel ?? t(`severity.${tone}`)}
        style={[{ width: dot, height: dot, borderRadius: radius.full, backgroundColor: c.solid, borderWidth: 1, borderColor: colors.card }, style]}
      />
    );
  }

  if (variant === 'count') {
    if (count <= 0 && !showZero) return null;
    const text = capCount(count, max);
    const h = size === 'sm' ? spacing.md + spacing.xs : spacing.lg + spacing.xs;
    return (
      <View
        accessible
        accessibilityLabel={accessibilityLabel ?? text}
        style={[
          {
            minWidth: h,
            height: h,
            paddingHorizontal: spacing.xs + 1,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.solid,
            borderWidth: 1,
            borderColor: colors.card,
          },
          style,
        ]}>
        <Text variant="caption" weight="semiBold" numeric style={{ color: c.onSolid }} allowFontScaling={false}>
          {text}
        </Text>
      </View>
    );
  }

  const glyph = icon === false ? undefined : (icon ?? SEVERITY_ICON[tone]);
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          minHeight: size === 'sm' ? spacing.xl : spacing.xxl - spacing.xs,
          paddingHorizontal: size === 'sm' ? spacing.sm : spacing.md - spacing.xs,
          borderRadius: radius.pill,
          backgroundColor: c.soft,
          borderWidth: 1,
          borderColor: c.border,
        },
        style,
      ]}>
      {glyph ? <Ionicons name={glyph} size={size === 'sm' ? 12 : 14} color={c.onSoft} /> : null}
      {label ? (
        <Text variant="caption" weight="semiBold" style={{ color: c.onSoft }} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

/** Pins a badge to the top corner at the end of its children (icon button, avatar, tab icon). */
export function BadgeOverlay({ badge, children, style }: { badge: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ alignSelf: 'flex-start' }, style]}>
      {children}
      <View pointerEvents="none" style={{ position: 'absolute', top: -spacing.xs, end: -spacing.xs }}>
        {badge}
      </View>
    </View>
  );
}

export const Badge = memo(BadgeImpl);
