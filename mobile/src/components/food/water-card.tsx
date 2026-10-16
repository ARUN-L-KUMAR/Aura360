import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Chip, Tag } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Text } from '@/components/ui/text';
import { radius, spacing, useTheme } from '@/theme';

const QUICK_ADD = [
  { ml: 250, sub: 'a glass' },
  { ml: 500, sub: 'a bottle' },
  { ml: 750, sub: 'a flask' },
];

export function WaterCard({ waterMl, targetMl, onAdd }: { waterMl: number; targetMl: number; onAdd: (ml: number) => void }) {
  const { accent } = useTheme();
  const water = accent('skincare');
  const percent = targetMl > 0 ? Math.min(100, Math.round((waterMl / targetMl) * 100)) : 0;
  const currentL = (waterMl / 1000).toFixed(2).replace(/\.?0+$/, '') || '0';
  const targetL = (targetMl / 1000).toFixed(1).replace(/\.0$/, '');

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 1 }}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: water.soft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="water" size={22} color={water.text} />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text variant="title" accessibilityRole="header">
              Hydration
            </Text>
            <Text variant="caption" color="textSecondary">
              Daily target: {targetL} L
            </Text>
          </View>
        </View>
        <Tag label={`${percent}% of goal`} tone="neutral" />
      </View>

      <View
        accessible
        accessibilityLabel={`${waterMl} millilitres of ${targetMl}, ${percent} percent of goal`}
        accessibilityLiveRegion="polite"
        style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.xs }}>
        <Text variant="display" numeric style={{ color: water.text }}>
          {currentL}
        </Text>
        <Text variant="body" numeric color="textSecondary">
          {`of ${targetL} L (${waterMl} ml)`}
        </Text>
      </View>

      <ProgressBar percent={percent} color={water.solid} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
        {QUICK_ADD.map((item) => (
          <Chip
            key={item.ml}
            label={`${item.ml} ml`}
            icon="add"
            selectable={false}
            onPress={() => onAdd(item.ml)}
            accessibilityHint={`Adds ${item.sub} of water`}
          />
        ))}
        <IconButton
          icon="remove"
          variant="tonal"
          accessibilityLabel="Undo 250 millilitres"
          disabled={waterMl <= 0}
          haptic="select"
          onPress={() => onAdd(-250)}
        />
      </View>
    </Card>
  );
}
