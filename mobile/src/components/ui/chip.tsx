import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { readableOn, withAlpha } from '@/components/ui/card';
import { usePop } from '@/components/ui/motion';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
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
  const { colors, accent: accentFor } = useTheme();
  if (selected) {
    if (accent) {
      const a = accentFor(accent);
      return { bg: a.solid, fg: a.onSolid, border: a.solid };
    }
    if (color) return { bg: color, fg: readableOn(color, colors.primaryText), border: color };
    return { bg: colors.primary, fg: colors.primaryText, border: colors.primary };
  }
  return { bg: colors.card, fg: colors.text, border: colors.border };
}

/**
 * Filter / choice pill. Selected chips are filled and show a check mark, so state never relies on colour alone.
 * The visual is 28 / 36pt tall; the hit area is padded to 44pt. Selecting or deselecting plays a small scale pop
 * (transform only, skipped under reduce-motion) and a selection haptic.
 */
export function Chip(props: ChipProps) {
  const pop = usePop(props.selectable !== false && !!props.selected);
  return (
    <Animated.View style={[{ alignSelf: 'flex-start' }, pop]}>
      <ChipView {...props} />
    </Animated.View>
  );
}

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
  const isSelected = selectable && selected;
  const c = useChipColors({ accent, color }, isSelected);
  const iconSize = ICON[size];
  const verticalSlop = Math.max(0, (layout.minTouchTarget - HEIGHT[size]) / 2);
  const lead: IconName | undefined = isSelected && !icon ? 'checkmark' : icon;
  const text = size === 'sm' ? 'caption' : 'label';

  const body: ReactNode = (
    <>
      {lead ? <Ionicons name={lead} size={iconSize} color={c.fg} /> : null}
      <Text variant={text} weight="medium" style={{ color: c.fg, flexShrink: 1 }} numberOfLines={1}>
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
  const hitSlop = { top: verticalSlop, bottom: verticalSlop, left: spacing.xs, right: spacing.xs };
  const a11yState = { selected: isSelected, disabled: !!disabled };
  const a11yLabel = typeof count === 'number' ? `${label}, ${count}` : label;

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          accessibilityState={a11yState}
          disabled={disabled}
          hitSlop={{ top: verticalSlop, bottom: verticalSlop, left: spacing.xs, right: 0 }}
          onPress={() => {
            haptics.select();
            onPress();
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 }}>
          {body}
        </Pressable>
      ) : (
        <View accessible accessibilityLabel={a11yLabel} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 }}>
          {body}
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={removeLabel ?? `Remove ${label}`}
        disabled={disabled}
        hitSlop={{ top: verticalSlop, bottom: verticalSlop, left: spacing.sm, right: spacing.sm }}
        onPress={onRemove}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, borderRadius: radius.pill })}>
        <Ionicons name="close" size={iconSize + 2} color={isSelected ? c.fg : colors.textSecondary} />
      </Pressable>
    </View>
  );
}

export type TagProps = ChipBase & {
  /** Plain, quiet style (grey) instead of an accent wash. */
  tone?: 'accent' | 'neutral';
};

/** Non-interactive label pill (category, status text). Has no press, selected or remove behaviour. */
export function Tag({ label, icon, accent, color, size = 'sm', tone }: TagProps) {
  const { colors, accent: accentFor } = useTheme();
  const resolved = tone ?? (accent || color ? 'accent' : 'neutral');
  const a = accent ? accentFor(accent) : null;
  const fg = resolved === 'neutral' ? colors.textSecondary : a ? a.text : colors.text;
  const bg = resolved === 'neutral' ? colors.cardMuted : a ? a.soft : color ? withAlpha(color, 0.14) : colors.cardMuted;
  const border = resolved === 'neutral' ? colors.borderSubtle : a ? a.border : color ? withAlpha(color, 0.3) : colors.border;
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
