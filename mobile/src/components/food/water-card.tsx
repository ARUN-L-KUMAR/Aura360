import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Chip, Tag } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SuccessCheck } from '@/components/ui/success-check';
import { Text } from '@/components/ui/text';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
import { radius, spacing, useTheme } from '@/theme';

const QUICK_ADD = [
  { ml: 250, size: 'glass' },
  { ml: 500, size: 'bottle' },
  { ml: 750, size: 'flask' },
] as const;

/** Undo step: one glass. */
const UNDO_ML = 250;

export function WaterCard({ waterMl, targetMl, onAdd }: { waterMl: number; targetMl: number; onAdd: (ml: number) => void }) {
  const { accent } = useTheme();
  const { t } = useTranslation('food');
  const water = accent('skincare');
  const percent = targetMl > 0 ? Math.min(100, Math.round((waterMl / targetMl) * 100)) : 0;
  const litres = new Intl.NumberFormat(getDeviceLocale(), { maximumFractionDigits: 2 });
  const currentL = litres.format(waterMl / 1000);
  const targetL = litres.format(targetMl / 1000);

  // Celebrate the moment an add takes the day from below the goal to at or above it (never on load or when revisiting).
  const [celebrate, setCelebrate] = useState(false);
  const showCheck = celebrate && waterMl >= targetMl;
  const add = (ml: number) => {
    if (ml > 0 && targetMl > 0 && waterMl < targetMl && waterMl + ml >= targetMl) {
      haptics.success();
      setCelebrate(true);
    }
    onAdd(ml);
    if (ml > 0) analytics.track('water_added');
  };

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
              {t('water.title')}
            </Text>
            <Text variant="caption" color="textSecondary">
              {t('water.dailyTarget', { value: targetL })}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {showCheck ? <SuccessCheck size={spacing.xl} accent="skincare" accessibilityLabel={t('water.goalReached')} /> : null}
          <Tag label={t('water.percentOfGoal', { value: percent })} tone="neutral" />
        </View>
      </View>

      <View
        accessible
        accessibilityLabel={t('water.spoken', { ml: waterMl, target: targetMl, percent })}
        accessibilityLiveRegion="polite"
        style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.xs }}>
        <Text variant="display" numeric style={{ color: water.text }}>
          {currentL}
        </Text>
        <Text variant="body" numeric color="textSecondary">
          {t('water.progress', { target: targetL, ml: waterMl })}
        </Text>
      </View>

      <ProgressBar percent={percent} color={water.solid} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
        {QUICK_ADD.map((item) => (
          <Chip
            key={item.ml}
            label={t('units.ml', { value: item.ml })}
            icon="add"
            selectable={false}
            onPress={() => add(item.ml)}
            accessibilityHint={t(`water.quick.${item.size}`)}
          />
        ))}
        <IconButton
          icon="remove"
          variant="tonal"
          accessibilityLabel={t('water.undo', { value: UNDO_ML })}
          disabled={waterMl <= 0}
          haptic="select"
          onPress={() => onAdd(-UNDO_ML)}
        />
      </View>
    </Card>
  );
}
