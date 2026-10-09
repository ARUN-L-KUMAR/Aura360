import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Text } from '@/components/ui/text';
import { radius, spacing, useTheme } from '@/theme';

const WATER_COLOR = '#0ea5e9';

export function WaterCard({ waterMl, targetMl, onAdd }: { waterMl: number; targetMl: number; onAdd: (ml: number) => void }) {
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const percent = targetMl > 0 ? Math.min(100, Math.round((waterMl / targetMl) * 100)) : 0;
  const currentL = (waterMl / 1000).toFixed(2).replace(/\.?0+$/, '');
  const targetL = (targetMl / 1000).toFixed(1).replace(/\.0$/, '');

  return (
    <GlassCard glowColor={WATER_COLOR} style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.md,
              backgroundColor: `${WATER_COLOR}22`,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="water" size={20} color={WATER_COLOR} />
          </View>
          <View>
            <Text variant="heading" style={{ fontSize: 16 }}>
              Hydration Tracker
            </Text>
            <Text variant="caption" muted>
              Daily target: {targetL} L
            </Text>
          </View>
        </View>

        <View
          style={{
            paddingHorizontal: spacing.sm,
            paddingVertical: 4,
            borderRadius: radius.pill,
            backgroundColor: `${WATER_COLOR}20`,
          }}>
          <Text variant="caption" style={{ color: WATER_COLOR, fontWeight: '700' }}>
            {percent}% Goal
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
        <Text variant="display" style={{ fontSize: 32, lineHeight: 36, color: WATER_COLOR }}>
          {currentL}
        </Text>
        <Text variant="body" muted style={{ fontSize: 16 }}>
          / {targetL} Litres ({waterMl} ml)
        </Text>
      </View>

      <ProgressBar percent={percent} color={WATER_COLOR} />

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {[
          { ml: 250, label: '+250 ml', sub: 'Glass' },
          { ml: 500, label: '+500 ml', sub: 'Bottle' },
          { ml: 750, label: '+750 ml', sub: 'Flask' },
        ].map((item) => (
          <Pressable
            key={item.ml}
            accessibilityRole="button"
            accessibilityLabel={`Add ${item.ml} millilitres of water`}
            onPress={() => onAdd(item.ml)}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              paddingVertical: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: isDark ? 'rgba(14,165,233,0.12)' : 'rgba(14,165,233,0.08)',
              borderWidth: 1,
              borderColor: 'rgba(14,165,233,0.25)',
              opacity: pressed ? 0.7 : 1,
            })}>
            <Text variant="label" style={{ color: WATER_COLOR, fontWeight: '700', fontSize: 13 }}>
              {item.label}
            </Text>
            <Text variant="caption" muted style={{ fontSize: 10 }}>
              {item.sub}
            </Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Undo 250 millilitres"
          onPress={() => onAdd(-250)}
          disabled={waterMl <= 0}
          style={({ pressed }) => ({
            width: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.md,
            backgroundColor: colors.cardMuted,
            opacity: waterMl <= 0 ? 0.3 : pressed ? 0.7 : 1,
          })}>
          <Ionicons name="remove" size={20} color={colors.text} />
        </Pressable>
      </View>
    </GlassCard>
  );
}

