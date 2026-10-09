import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { weekdayShort } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';

const BAR_AREA_HEIGHT = 96;

export function ActivityChart({ data }: { data: { date: string; activities: number }[] }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...data.map((d) => d.activities));

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm }}
      accessibilityLabel={`Activity over the last 7 days: ${data.map((d) => `${weekdayShort(d.date)} ${d.activities}`).join(', ')}`}>
      {data.map((point, index) => {
        const isToday = index === data.length - 1;
        const height = point.activities === 0 ? 4 : Math.max(8, (point.activities / max) * BAR_AREA_HEIGHT);
        return (
          <View key={point.date} style={{ flex: 1, alignItems: 'center', gap: spacing.xs }}>
            <Text variant="caption" muted>
              {point.activities || ''}
            </Text>
            <View style={{ height: BAR_AREA_HEIGHT, justifyContent: 'flex-end', alignSelf: 'stretch' }}>
              <View
                style={{
                  height,
                  borderRadius: radius.sm,
                  backgroundColor: isToday ? colors.primary : colors.border,
                }}
              />
            </View>
            <Text variant="caption" muted>
              {weekdayShort(point.date)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
