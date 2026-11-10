import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/i18n';
import { directional } from '@/i18n/rtl';
import { monthKey, monthLabel, shiftMonth } from '@/lib/format';
import { spacing, useTheme, type ModuleKey } from '@/theme';

/** Previous / next month stepper. The next button is disabled on the current month. */
export function MonthSwitcher({ month, onChange, accent = 'finance' }: { month: string; onChange: (month: string) => void; accent?: ModuleKey }) {
  const { accent: accentFor } = useTheme();
  const { t } = useTranslation('finance');
  const isCurrent = month === monthKey();

  return (
    <Card padding="none" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs }}>
      <IconButton icon={directional('chevron-back', 'chevron-forward')} accessibilityLabel={t('month.previous')} onPress={() => onChange(shiftMonth(month, -1))} />
      <View
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={monthLabel(month)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 }}>
        <Ionicons name="calendar-outline" size={18} color={accentFor(accent).text} />
        <Text variant="title" numberOfLines={1}>
          {monthLabel(month)}
        </Text>
      </View>
      <IconButton icon={directional('chevron-forward', 'chevron-back')} accessibilityLabel={t('month.next')} disabled={isCurrent} onPress={() => onChange(shiftMonth(month, 1))} />
    </Card>
  );
}
