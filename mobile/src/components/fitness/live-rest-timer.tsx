import { Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { sessionActions } from '@/features/fitness/session-store';
import { formatDuration } from '@/features/fitness/stats';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

const SIZE = 120;
const STROKE = 10;

/** Countdown ring shown during a live workout; driven by the session store (see session-store.ts). */
export function LiveRestTimer({ remaining, total }: { remaining: number; total: number }) {
  const { colors } = useTheme();
  const radiusPx = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * radiusPx;
  const progress = total > 0 ? Math.min(1, remaining / total) : 0;

  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
      <View style={{ alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={`Rest, ${remaining} seconds left`}>
        <View style={{ transform: [{ rotate: '-90deg' }] }}>
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={radiusPx} stroke={moduleColors.fitness} strokeOpacity={0.18} strokeWidth={STROKE} fill="none" />
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={radiusPx}
              stroke={moduleColors.fitness}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={circumference * (1 - progress)}
            />
          </Svg>
        </View>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text variant="heading">{formatDuration(remaining)}</Text>
          <Text variant="caption" muted>
            rest
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <RestButton label="-15s" onPress={() => sessionActions.adjustRest(-15)} />
          <RestButton label="+15s" onPress={() => sessionActions.adjustRest(15)} />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => sessionActions.skipRest()}
          style={({ pressed }) => ({
            alignItems: 'center',
            paddingVertical: spacing.md,
            borderRadius: radius.md,
            backgroundColor: moduleColors.fitness,
            opacity: pressed ? 0.85 : 1,
          })}>
          <Text variant="label" style={{ color: '#ffffff', fontWeight: '600' }}>
            Skip rest
          </Text>
        </Pressable>
        <Text variant="caption" color={colors.textMuted}>
          Next set when you are ready.
        </Text>
      </View>
    </Card>
  );
}

function RestButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        backgroundColor: colors.cardMuted,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Text variant="label">{label}</Text>
    </Pressable>
  );
}
