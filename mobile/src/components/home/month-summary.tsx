import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Section } from '@/components/home/section';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import type { Dashboard } from '@/features/dashboard/use-dashboard';
import type { IconName } from '@/features/modules';
import { formatMoney } from '@/lib/format';
import { spacing, useTheme, type ThemeColors } from '@/theme';

type Figure = { key: string; label: string; value: number; icon: IconName; tone: keyof ThemeColors };

function Column({ figure }: { figure: Figure }) {
  const { colors } = useTheme();
  const money = formatMoney(figure.value, { compact: true });
  return (
    <View accessible accessibilityLabel={`${figure.label} this month, ${money}`} style={{ flex: 1, gap: spacing.xs }}>
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
  const router = useRouter();
  const figures: Figure[] = [
    { key: 'income', label: 'Income', value: month.income, icon: 'arrow-down', tone: 'successText' },
    { key: 'expense', label: 'Spent', value: month.expense, icon: 'arrow-up', tone: 'errorText' },
    { key: 'investment', label: 'Invested', value: month.investment, icon: 'trending-up', tone: 'primaryAccent' },
  ];
  return (
    <Section index={index}>
      <SectionHeader
        title="This month"
        actionLabel="See all"
        actionAccessibilityLabel="See all finance"
        onActionPress={() => router.push('/finance')}
      />
      <Card style={{ flexDirection: 'row', gap: spacing.md }}>
        {figures.map((figure) => (
          <Column key={figure.key} figure={figure} />
        ))}
      </Card>
    </Section>
  );
}
