import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { RingCard } from '@/components/fitness/section-kit';
import { Text } from '@/components/ui/text';
import { ProgressRing } from '@/components/viz/progress-ring';
import { sessionActions } from '@/features/fitness/session-store';
import { formatDuration } from '@/features/fitness/stats';
import { useTranslation } from '@/i18n';
import { spacing } from '@/theme';

const SIZE = spacing.xxxl * 3; // 144
const THICKNESS = spacing.sm;
/** The only point, besides starting and ending, where the live region changes its message. */
const HEADS_UP_SECONDS = 10;

/**
 * Countdown ring shown during a live workout; driven by the session store (see session-store.ts). The ring only draws
 * the time that `remaining` / `total` already describe: it never decides when the rest is over.
 */
export function LiveRestTimer({ remaining, total }: { remaining: number; total: number }) {
  const { t } = useTranslation('fitness');
  const almostDone = remaining <= HEADS_UP_SECONDS;

  return (
    <RingCard style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
      {/* One element that reads the time left when focused. It is not a live region: a ring that spoke every second would be noise. */}
      <View accessible accessibilityLabel={t('rest.secondsLeft', { count: remaining })}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <ProgressRing value={remaining} max={Math.max(1, total)} size={SIZE} thickness={THICKNESS} accent="fitness">
            <Text variant="hero" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {formatDuration(remaining)}
            </Text>
            <Text variant="overline" color="textMuted">
              {t('rest.label')}
            </Text>
          </ProgressRing>
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
    </RingCard>
  );
}
