import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, type ComponentProps, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { accentTint } from '@/components/ui/accent-tint';
import { readableOn } from '@/components/ui/card';
import { withAlpha } from '@/components/ui/logic';
import { usePop } from '@/components/ui/motion';
import { hitSlopOf, PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { layout, radius, spacing, useTheme, type ModuleKey } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type ChipSize = 'sm' | 'md';

type ChipBase = {
  label: string;
  /** Leading icon. */
  icon?: IconName;
  /** Module accent for the selected / tinted colours. Defaults to the brand colour. */
  accent?: ModuleKey;
  /** Legacy: arbitrary selected colour. Prefer `accent`. */
  color?: string;
  size?: ChipSize;
};

export type ChipProps = ChipBase & {
  selected?: boolean;
  /** Set false for an action chip that has no on/off state. Default true. */
  selectable?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** Small count after the label, e.g. number of results. */
  count?: number;
  /** Shows a remove (x) button. */
  onRemove?: () => void;
  /** Screen-reader label for the remove button. Default "Remove {label}". */
  removeLabel?: string;
  accessibilityHint?: string;
};

const HEIGHT: Record<ChipSize, number> = { sm: 28, md: 36 };
const ICON: Record<ChipSize, number> = { sm: 14, md: 16 };

function useChipColors({ accent, color }: Pick<ChipBase, 'accent' | 'color'>, selected: boolean) {
  const { colors, scheme, accent: accentFor } = useTheme();
  if (selected) {
    if (accent) {
      // Quiet, like the web: a tinted wash with accent text and a visible accent ring (the check mark carries state too).
      const a = accentFor(accent);
      return { bg: accentTint(a, scheme, 0.18), fg: a.text, border: scheme === 'dark' ? withAlpha(a.solid, 0.55) : a.solid };
    }
    if (color) return { bg: color, fg: readableOn(color, colors.primaryText), border: color };
    return { bg: colors.primary, fg: colors.primaryText, border: colors.primary };
  }
  return { bg: colors.card, fg: colors.textSecondary, border: colors.border };
}

/**
 * Filter / choice pill. Selected chips are filled and show a check mark, so state never relies on colour alone.
 * The visual is 28 / 36pt tall; the hit area is padded to 44pt. Selecting or deselecting plays a small scale pop
 * (transform only, skipped under reduce-motion) and a selection haptic.
 */
function ChipImpl(props: ChipProps) {
  const pop = usePop(props.selectable !== false && !!props.selected);
  return (
    <Animated.View style={[styles.wrap, pop]}>
      <ChipView {...props} />
    </Animated.View>
  );
}

/** Memoised: filter rows re-render on every keystroke of their screen, and only the toggled chip changes. */
export const Chip = memo(ChipImpl);

function ChipView({
  label,
  selected = false,
  selectable = true,
  onPress,
  disabled,
  icon,
  count,
  onRemove,
  removeLabel,
  accent,
  color,
  size = 'md',
  accessibilityHint,
}: ChipProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const isSelected = selectable && selected;
  const c = useChipColors({ accent, color }, isSelected);
  const iconSize = ICON[size];
  const verticalSlop = Math.max(0, (layout.minTouchTarget - HEIGHT[size]) / 2);
  const lead: IconName | undefined = isSelected && !icon ? 'checkmark' : icon;
  const text = size === 'sm' ? 'caption' : 'label';

  const body: ReactNode = (
    <>
      {lead ? <Ionicons name={lead} size={iconSize} color={c.fg} /> : null}
      <Text variant={text} weight="semiBold" style={{ color: c.fg, flexShrink: 1 }} numberOfLines={1}>
        {label}
      </Text>
      {typeof count === 'number' ? (
        <View style={{ minWidth: iconSize + spacing.xs, paddingHorizontal: spacing.xs, borderRadius: radius.pill, alignItems: 'center', backgroundColor: withAlpha(c.fg, 0.16) }}>
          <Text variant="caption" weight="semiBold" numeric style={{ color: c.fg }}>
            {count}
          </Text>
        </View>
      ) : null}
    </>
  );

  const container = {
    minHeight: HEIGHT[size],
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'flex-start' as const,
    gap: spacing.xs,
    paddingHorizontal: size === 'sm' ? spacing.sm : spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bg,
  };
  const hitSlop = hitSlopOf(verticalSlop, spacing.xs);
  const a11yState = { selected: isSelected, disabled: !!disabled };
  const a11yLabel = typeof count === 'number' ? t('chip.withCount', { label, value: count }) : label;

  if (!onRemove) {
    if (!onPress) {
      return (
        <View accessible accessibilityLabel={a11yLabel} style={container}>
          {body}
        </View>
      );
    }
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={a11yState}
        disabled={disabled}
        haptic="select"
        hitSlop={hitSlop}
        ringRadius={radius.pill}
        onPress={onPress}
        style={container}>
        {body}
      </PressableScale>
    );
  }

  return (
    <View style={[container, { opacity: disabled ? 0.45 : 1 }]}>
      {onPress ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          accessibilityState={a11yState}
          scaleTo={1}
          hitSlop={hitSlopOf(verticalSlop)}
          ringRadius={radius.pill}
          // The whole chip is dimmed when disabled, so the control itself stays enabled-looking and just ignores taps.
          onPress={() => {
            if (disabled) return;
            haptics.select();
            onPress();
          }}
          style={styles.bodyRow}>
          {body}
        </PressableScale>
      ) : (
        <View accessible accessibilityLabel={a11yLabel} style={styles.bodyRow}>
          {body}
        </View>
      )}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={removeLabel ?? t('chip.remove', { label })}
        accessibilityState={{ disabled: !!disabled }}
        scaleTo={1}
        hitSlop={hitSlopOf(verticalSlop, spacing.md)}
        ringRadius={radius.pill}
        onPress={disabled ? undefined : onRemove}
        style={styles.remove}>
        <Ionicons name="close" size={iconSize + 2} color={isSelected ? c.fg : colors.textSecondary} />
      </PressableScale>
    </View>
  );
}

export type TagProps = ChipBase & {
  /** Plain, quiet style (grey) instead of an accent wash. */
  tone?: 'accent' | 'neutral';
};

/** Non-interactive label pill (category, status text). Has no press, selected or remove behaviour. */
function TagImpl({ label, icon, accent, color, size = 'sm', tone }: TagProps) {
  const { colors, scheme, accent: accentFor } = useTheme();
  const resolved = tone ?? (accent || color ? 'accent' : 'neutral');
  const a = accent ? accentFor(accent) : null;
  const fg = resolved === 'neutral' ? colors.textSecondary : a ? a.text : colors.text;
  const bg = resolved === 'neutral' ? colors.cardMuted : a ? accentTint(a, scheme) : color ? withAlpha(color, 0.14) : colors.cardMuted;
  const border = resolved === 'neutral' ? colors.borderSubtle : a ? (scheme === 'dark' ? withAlpha(a.solid, 0.3) : a.border) : color ? withAlpha(color, 0.3) : colors.border;
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        minHeight: size === 'sm' ? spacing.xl : spacing.xxl - spacing.xs,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: size === 'sm' ? spacing.sm : spacing.md,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: border,
        backgroundColor: bg,
      }}>
      {icon ? <Ionicons name={icon} size={ICON[size]} color={fg} /> : null}
      <Text variant="caption" weight="medium" style={{ color: fg, flexShrink: 1 }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Quiet label pill. Memoised. */
export const Tag = memo(TagImpl);

/** Wrapping group of chips (form fields). */
export function ChipGroup({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{children}</View>;
}

/** Single horizontally-scrolling row of chips (filters). */
export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, alignItems: 'center' }}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start' },
  bodyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  remove: { borderRadius: radius.pill, paddingHorizontal: spacing.xs },
});
