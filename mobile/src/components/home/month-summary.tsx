import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Section } from '@/components/home/section';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import type { Dashboard } from '@/features/dashboard/use-dashboard';
import type { IconName } from '@/features/modules';
import { useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { spacing, useTheme, type ThemeColors } from '@/theme';

type Figure = { key: string; label: string; value: number; icon: IconName; tone: keyof ThemeColors };

function Column({ figure }: { figure: Figure }) {
  const { t } = useTranslation('home');
  const { colors } = useTheme();
  const money = formatMoney(figure.value, { compact: true });
  return (
    <View accessible accessibilityLabel={t('month.figureLabel', { label: figure.label, amount: money })} style={{ flex: 1, gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Ionicons name={figure.icon} size={14} color={colors[figure.tone]} />
        <Text variant="caption" color="textSecondary" numberOfLines={1} style={{ flexShrink: 1 }}>
          {figure.label}
        </Text>
      </View>
      <Text variant="title" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} color={figure.tone}>
        {money}
      </Text>
    </View>
  );
}

/** Income, spending and investments for the month, from the dashboard payload. */
export function MonthSummary({ month, index }: { month: Dashboard['month']; index: number }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const figures: Figure[] = [
    { key: 'income', label: t('month.income'), value: month.income, icon: 'arrow-down', tone: 'successText' },
    { key: 'expense', label: t('month.expense'), value: month.expense, icon: 'arrow-up', tone: 'errorText' },
    { key: 'investment', label: t('month.investment'), value: month.investment, icon: 'trending-up', tone: 'primaryAccent' },
  ];
  return (
    <Section index={index}>
      <SectionHeader
        title={t('month.title')}
        actionLabel={t('month.seeAll')}
        actionAccessibilityLabel={t('month.seeAllLabel')}
        onActionPress={() => router.push('/finance')}
      />
      <Card gradient="finance" style={{ flexDirection: 'row', gap: spacing.md }}>
        {figures.map((figure) => (
          <Column key={figure.key} figure={figure} />
        ))}
      </Card>
    </Section>
  );
}
