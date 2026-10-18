import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';
import { memo, useMemo } from 'react';
import { View } from 'react-native';

import { activitySeries, dayDelta, sharePercent, todayIndexOf, totalEntries, type DayDelta } from '@/components/home/derive';
import { Grid, gridCell } from '@/components/home/grid';
import { IconTile } from '@/components/home/icon-tile';
import { Section } from '@/components/home/section';
import { Card } from '@/components/ui/card';
import { withAlpha } from '@/components/ui/logic';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import type { Dashboard } from '@/features/dashboard/use-dashboard';
import { modules, type IconName, type ModuleKey } from '@/features/modules';
import { getDeviceLocale, useTranslation } from '@/i18n';
import { todayIso } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { radius, spacing, useTheme } from '@/theme';

/** The web's `bg-emerald-950/30`-style pill: a faint wash, the text carries the colour. */
const PILL_WASH = 0.14;

type StatKey = 'finance' | 'fitness' | 'food';

const GLANCE: { key: StatKey; icon: IconName }[] = [
  { key: 'finance', icon: 'wallet-outline' },
  { key: 'fitness', icon: 'barbell-outline' },
  { key: 'food', icon: 'restaurant-outline' },
];

/** What the pill in the card's corner says: a real change (total card) or the card's share of all entries. */
type Pill = { icon?: IconName; text: string; tone: 'up' | 'down' | 'neutral' };

function TrendPill({ pill }: { pill: Pill }) {
  const { colors } = useTheme();
  const tone =
    pill.tone === 'up'
      ? { bg: withAlpha(colors.success, PILL_WASH), fg: colors.successText }
      : pill.tone === 'down'
        ? { bg: withAlpha(colors.error, PILL_WASH), fg: colors.errorText }
        : { bg: colors.cardMuted, fg: colors.textSecondary };
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs / 2,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs / 2,
        borderRadius: radius.pill,
        backgroundColor: tone.bg,
      }}>
      {pill.icon ? <Ionicons name={pill.icon} size={12} color={tone.fg} /> : null}
      <Text variant="overline" numeric style={{ color: tone.fg, letterSpacing: 0.4 }}>
        {pill.text}
      </Text>
    </View>
  );
}

type StatCardProps = {
  accent: ModuleKey;
  icon: IconName;
  label: string;
  value: number;
  pill?: Pill;
  spoken: string;
  hint?: string;
  onPress?: () => void;
};

/** The web stat card: tinted icon tile and a pill on top, a tiny uppercase label, then the big number. */
const StatCard = memo(function StatCard({ accent, icon, label, value, pill, spoken, hint, onPress }: StatCardProps) {
  return (
    <Card accessible accessibilityLabel={spoken} accessibilityHint={hint} onPress={onPress} padding="md" rounded="xl" style={[gridCell, { gap: spacing.lg }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
        <IconTile icon={icon} accent={accent} />
        {pill ? <TrendPill pill={pill} /> : null}
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text variant="overline" color="textSecondary" numberOfLines={2}>
          {label}
        </Text>
        <AnimatedNumber value={value} variant="display" />
      </View>
    </Card>
  );
});

/** Today against yesterday as a pill. A flat day has nothing worth a badge. */
function deltaPill(change: DayDelta | null): Pill | undefined {
  if (!change || change.direction === 'flat') return undefined;
  const text = change.amount.toLocaleString(getDeviceLocale());
  return change.direction === 'up' ? { icon: 'trending-up', text: `+${text}`, tone: 'up' } : { icon: 'trending-down', text: `-${text}`, tone: 'down' };
}

/**
 * Four web-style stat cards from the dashboard payload: the month's activities (with today against yesterday as its
 * trend) and finance, fitness and food entries (with their share of everything you have logged). No figure is invented:
 * a card without a derivable change shows no trend.
 */
export const OverviewStats = memo(function OverviewStats({ data, index }: { data: Dashboard; index: number }) {
  const { t } = useTranslation('home');
  const router = useRouter();

  const total = useMemo(() => {
    const series = activitySeries(data.chart);
    const todayIndex = todayIndexOf(data.chart, todayIso());
    return { change: dayDelta(series, todayIndex), today: todayIndex >= 0 ? series[todayIndex] : 0 };
  }, [data.chart]);

  const entries = totalEntries(data.counts);
  const format = (n: number) => n.toLocaleString(getDeviceLocale());
  const totalLabel = t('overview.total.label');
  const trendWord = total.change && total.change.direction !== 'flat' ? t(`overview.total.${total.change.direction}`, { value: format(total.change.amount) }) : null;

  return (
    <Section index={index}>
      <Grid>
        <StatCard
          accent="ai"
          icon="pulse-outline"
          label={totalLabel}
          value={data.totalActivities}
          pill={deltaPill(total.change)}
          spoken={t(trendWord ? 'overview.total.spoken' : 'overview.total.spokenFlat', {
            label: totalLabel,
            value: format(data.totalActivities),
            trend: trendWord,
            today: t('overview.total.today', { count: total.today }),
          })}
        />
        {GLANCE.map((item) => {
          const info = modules[item.key];
          const label = t(`overview.${item.key}.label`);
          const value = data.counts[item.key];
          const percent = sharePercent(value, entries);
          return (
            <StatCard
              key={item.key}
              accent={item.key}
              icon={item.icon}
              label={label}
              value={value}
              pill={entries > 0 ? { text: `${percent}%`, tone: 'neutral' } : undefined}
              spoken={t('overview.tileLabel', { label, value: format(value), percent })}
              hint={t('overview.tileHint', { module: info.label })}
              onPress={() => {
                haptics.tap();
                router.push(info.href as Href);
              }}
            />
          );
        })}
      </Grid>
    </Section>
  );
});
