import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { useGlass } from '@/components/home/glass-card';
import { Button } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { PressableScale } from '@/components/ui/pressable-scale';
import { IconTile } from '@/components/ui/stat-parts';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import type { IconName } from '@/features/modules';
import { layout, radius, spacing, useTheme, type ModuleKey } from '@/theme';

/** Side of the icon tiles in a module card (the same as the rows of a list). */
export const TILE = layout.minTouchTarget - spacing.xs; // 40

export type PanelLine = {
  icon: IconName;
  text: string;
  /** Draws the line in the module's colour; the others stay quiet. */
  emphasis?: boolean;
};

/** One line of a figures panel: a small icon and a sentence. */
function StatLine({ icon, text, color }: { icon: IconName; text: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Ionicons name={icon} size={16} color={color} />
      <Text variant="label" numberOfLines={2} style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

type PanelProps = {
  module: ModuleKey;
  /** The headline figure. */
  value: number;
  /** What the figure counts ("saved items"). */
  unit: string;
  lines: PanelLine[];
  /** One spoken sentence for the whole panel. */
  label: string;
  /** Spoken hint; only used when the panel opens something. */
  hint?: string;
  onPress?: () => void;
};

/**
 * The headline of a module card on Home: one big figure with a few supporting lines beside it, on a quieter surface
 * inside the glass card. It reads as one sentence to a screen reader, and opens the module when `onPress` is given.
 */
export function StatPanel({ module, value, unit, lines, label, hint, onPress }: PanelProps) {
  const { colors, accent } = useTheme();
  const glass = useGlass();
  const tone = accent(module).text;

  const style = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: glass.innerBorder,
    backgroundColor: glass.inner,
  } as const;

  const body = (
    <>
      <View style={{ flexShrink: 0, gap: 2 }}>
        <AnimatedNumber value={value} variant="display" accessibilityLabel={String(value)} />
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {unit}
        </Text>
      </View>
      <Divider vertical />
      <View style={{ flex: 1, minWidth: 0, gap: spacing.sm }}>
        {lines.map((line, i) => (
          <StatLine key={i} icon={line.icon} text={line.text} color={line.emphasis ? tone : colors.textSecondary} />
        ))}
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label} style={style}>
        {body}
      </View>
    );
  }
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} haptic="select" scaleTo={0.98} ringRadius={radius.lg} onPress={onPress} style={style}>
      {body}
    </PressableScale>
  );
}

/** Nothing cached and waiting for a connection: a short note with a way to try again, in place of a skeleton that would never end. */
export function OfflineNote({ message, retryLabel, onRetry }: { message: string; retryLabel: string; onRetry: () => void }) {
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <IconTile icon="cloud-offline-outline" size={TILE} />
        <Text variant="body" color="textSecondary" style={{ flex: 1 }}>
          {message}
        </Text>
      </View>
      <Button title={retryLabel} variant="tertiary" size="sm" fullWidth={false} onPress={onRetry} />
    </View>
  );
}
