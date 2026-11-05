import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import { ProgressRing } from '@/components/viz/progress-ring';
import { spacing, type ModuleKey } from '@/theme';

export type SummaryFigure = { key: string; label: string; value: number };

type Props = {
  accent: ModuleKey;
  figures: SummaryFigure[];
  /** Optional progress ring on the leading side (for example tasks done out of all tasks). */
  ring?: { value: number; max: number; center: string; label: string; spoken: string };
};

const RING = spacing.xxxl + spacing.lg; // 64
const RING_THICKNESS = spacing.sm - 1;

/**
 * A quiet summary above a list: an optional progress ring and two or three counted figures, in the module accent. It
 * reads as one sentence to a screen reader ("Notes 9, Pinned 2, Tasks left 4"). Use it where a list has no hero.
 */
export function SummaryStrip({ accent, figures, ring }: Props) {
  const spoken = [ring?.spoken, ...figures.map((figure) => `${figure.label} ${figure.value}`)].filter(Boolean).join(', ');
  return (
    <Card rounded="xl" padding="sm" accessible accessibilityLabel={spoken} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
      {ring ? (
        <ProgressRing value={ring.value} max={ring.max} size={RING} thickness={RING_THICKNESS} accent={accent} label={ring.label} valueText={ring.spoken}>
          <Text variant="label" weight="bold" numeric>
            {ring.center}
          </Text>
        </ProgressRing>
      ) : null}
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
        {figures.map((figure) => (
          <View key={figure.key} style={{ flexGrow: 1, flexBasis: 0, minWidth: spacing.xxxl + spacing.lg, gap: 2 }}>
            <AnimatedNumber value={figure.value} variant="title" weight="bold" accessibilityLabel={String(figure.value)} />
            <Text variant="overline" color="textMuted" numberOfLines={2}>
              {figure.label}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
