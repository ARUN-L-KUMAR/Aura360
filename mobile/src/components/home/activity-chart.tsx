import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { weekdayShort } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';

const BAR_AREA_HEIGHT = 110;

export function ActivityChart({ data }: { data: { date: string; activities: number }[] }) {
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const max = Math.max(1, ...data.map((d) => d.activities));

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.xs, paddingTop: spacing.xs }}
      accessibilityLabel={`Activity over the last 7 days: ${data.map((d) => `${weekdayShort(d.date)} ${d.activities}`).join(', ')}`}>
      {data.map((point, index) => {
        const isToday = index === data.length - 1;
        const height = point.activities === 0 ? 6 : Math.max(12, (point.activities / max) * BAR_AREA_HEIGHT);
        const barColor = isToday
          ? colors.primary
          : isDark
            ? `${colors.primary}45`
            : `${colors.primary}30`;

        return (
          <View key={point.date} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <Text
              variant="caption"
              style={{
                fontSize: 10,
                fontWeight: isToday ? '700' : '500',
                color: isToday ? colors.text : colors.textMuted,
                opacity: point.activities > 0 ? 1 : 0.3,
              }}>
              {point.activities > 0 ? point.activities : '·'}
            </Text>
            <View style={{ height: BAR_AREA_HEIGHT, justifyContent: 'flex-end', alignSelf: 'stretch', alignItems: 'center' }}>
              {/* Subtle track background */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  width: '100%',
                  maxWidth: 24,
                  height: BAR_AREA_HEIGHT,
                  borderRadius: radius.sm,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                }}
              />
              <View
                style={{
                  height,
                  width: '100%',
                  maxWidth: 24,
                  borderTopLeftRadius: radius.sm,
                  borderTopRightRadius: radius.sm,
                  borderBottomLeftRadius: 2,
                  borderBottomRightRadius: 2,
                  backgroundColor: barColor,
                  shadowColor: isToday ? colors.primary : undefined,
                  shadowOpacity: isToday ? 0.35 : 0,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                }}
              />
            </View>
            <Text
              variant="caption"
              style={{
                fontSize: 11,
                fontWeight: isToday ? '700' : '500',
                color: isToday ? colors.text : colors.textMuted,
              }}>
              {weekdayShort(point.date)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
