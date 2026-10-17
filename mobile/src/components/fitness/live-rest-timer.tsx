import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { sessionActions } from '@/features/fitness/session-store';
import { formatDuration } from '@/features/fitness/stats';
import { useTranslation } from '@/i18n';
import { spacing, useTheme } from '@/theme';

const SIZE = 120;
const STROKE = 10;
/** The only point, besides starting and ending, where the live region changes its message. */
const HEADS_UP_SECONDS = 10;

/** Countdown ring shown during a live workout; driven by the session store (see session-store.ts). */
export function LiveRestTimer({ remaining, total }: { remaining: number; total: number }) {
  const { accent } = useTheme();
  const { t } = useTranslation('fitness');
  const fitness = accent('fitness');
  const radiusPx = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * radiusPx;
  const progress = total > 0 ? Math.min(1, remaining / total) : 0;
  const almostDone = remaining <= HEADS_UP_SECONDS;

  return (
    <Card variant="tinted" accent="fitness" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.lg }}>
      <View style={{ alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={t('rest.secondsLeft', { count: remaining })}>
        <View style={{ transform: [{ rotate: '-90deg' }] }}>
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={radiusPx} stroke={fitness.border} strokeWidth={STROKE} fill="none" />
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={radiusPx}
              stroke={fitness.solid}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={circumference * (1 - progress)}
            />
          </Svg>
        </View>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text variant="title" numeric>
            {formatDuration(remaining)}
          </Text>
          <Text variant="caption" color="textSecondary">
            {t('rest.label')}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, flexBasis: 160, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button title={t('rest.minus15')} variant="tertiary" accessibilityLabel={t('rest.minus15Label')} style={{ flex: 1 }} onPress={() => sessionActions.adjustRest(-15)} />
          <Button title={t('rest.plus15')} variant="tertiary" accessibilityLabel={t('rest.plus15Label')} style={{ flex: 1 }} onPress={() => sessionActions.adjustRest(15)} />
        </View>
        <Button title={t('rest.skip')} onPress={() => sessionActions.skipRest()} />
        {/* Polite live region: spoken when the rest starts and once more when it is nearly over, never every second. */}
        <Text variant="caption" color="textSecondary" accessibilityLiveRegion="polite">
          {almostDone ? t('rest.almostDone') : t('rest.nextSet')}
        </Text>
      </View>
    </Card>
  );
}
