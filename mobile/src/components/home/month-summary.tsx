import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo, useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { Decor } from '@/components/home/decor';
import { netOf } from '@/components/home/derive';
import { Section, SectionHead } from '@/components/home/section';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import { DonutChart } from '@/components/viz/donut-chart';
import type { Dashboard } from '@/features/dashboard/use-dashboard';
import type { IconName } from '@/features/modules';
import { useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { spacing, useTheme } from '@/theme';

type Figure = { key: 'income' | 'expense' | 'investment'; label: string; value: number; icon: IconName; fill: string };

const DONUT_SIZE = spacing.xxxl * 3; // 144
const DONUT_SIZE_LARGE_TEXT = DONUT_SIZE + spacing.xxl;
const LARGE_TEXT = 1.15;
const LEGEND_MIN_WIDTH = spacing.xxxl * 3;
const compact = (n: number) => formatMoney(n, { compact: true });

function LegendRow({ figure }: { figure: Figure }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      {/* The icon repeats the segment colour and tells the three apart without it. */}
      <Ionicons name={figure.icon} size={spacing.lg + 2} color={figure.fill} />
      <View style={{ flex: 1 }}>
        <Text variant="overline" color="textSecondary" numberOfLines={1}>
          {figure.label}
        </Text>
        <Text variant="label" weight="bold" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {compact(figure.value)}
        </Text>
      </View>
    </View>
  );
}

/**
 * Income, spending and investments for the month as a donut (net in the centre) with a legend beside it. The whole card
 * opens Finance and reads as one element with every figure in its label; the drawing itself is hidden from screen readers.
 */
export const MonthSummary = memo(function MonthSummary({ month, index }: { month: Dashboard['month']; index: number }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();

  const figures = useMemo<Figure[]>(
    () => [
      { key: 'income', label: t('month.income'), value: month.income, icon: 'arrow-down', fill: colors.success },
      { key: 'expense', label: t('month.expense'), value: month.expense, icon: 'arrow-up', fill: colors.error },
      { key: 'investment', label: t('month.investment'), value: month.investment, icon: 'trending-up', fill: colors.primary },
    ],
    [t, month.income, month.expense, month.investment, colors.success, colors.error, colors.primary],
  );
  const segments = useMemo(() => figures.map((f) => ({ label: f.label, value: f.value, color: f.fill })), [figures]);
  const net = netOf(month);
  const spoken = t('month.cardLabel', {
    title: t('month.title'),
    income: t('month.figureLabel', { label: figures[0].label, amount: compact(figures[0].value) }),
    expense: t('month.figureLabel', { label: figures[1].label, amount: compact(figures[1].value) }),
    investment: t('month.figureLabel', { label: figures[2].label, amount: compact(figures[2].value) }),
    net: `${t('month.net')} ${compact(net)}`,
  });

  return (
    <Section index={index}>
      <SectionHead
        title={t('month.title')}
        description={t('month.description')}
        actionLabel={t('month.seeAll')}
        actionAccessibilityLabel={t('month.seeAllLabel')}
        onActionPress={() => router.push('/finance')}
      />
      <Card
        rounded="xl"
        accessibilityLabel={spoken}
        accessibilityHint={t('month.cardHint')}
        onPress={() => {
          haptics.tap();
          router.push('/finance');
        }}
        style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
        <Decor>
          <DonutChart segments={segments} size={fontScale > LARGE_TEXT ? DONUT_SIZE_LARGE_TEXT : DONUT_SIZE} accent="finance" label={t('month.chartLabel')}>
            <Text variant="overline" color="textSecondary" numberOfLines={1}>
              {t('month.net')}
            </Text>
            <AnimatedNumber value={net} format={compact} variant="label" weight="bold" color={net < 0 ? 'errorText' : 'successText'} />
          </DonutChart>
        </Decor>
        <Decor style={{ flexGrow: 1, flexBasis: 0, minWidth: LEGEND_MIN_WIDTH, gap: spacing.md }}>
          {figures.map((figure) => (
            <LegendRow key={figure.key} figure={figure} />
          ))}
        </Decor>
      </Card>
    </Section>
  );
});
