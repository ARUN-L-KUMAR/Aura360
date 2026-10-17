import { useRouter, type Href } from 'expo-router';
import { View } from 'react-native';

import { Grid, gridCell } from '@/components/home/grid';
import { Section } from '@/components/home/section';
import { SectionHeader } from '@/components/ui/section-header';
import { StatCard } from '@/components/ui/stat-card';
import type { Dashboard } from '@/features/dashboard/use-dashboard';
import type { IconName, ModuleKey } from '@/features/modules';
import { useTranslation } from '@/i18n';
import type { TFunction } from 'i18next';

type Stat = { key: string; label: string; value: number; icon: IconName; accent?: ModuleKey; subtitle?: string; href?: string };

function statsFor(data: Dashboard, t: TFunction<'home'>): Stat[] {
  return [
    { key: 'total', label: t('overview.total.label'), value: data.totalActivities, icon: 'pulse-outline', subtitle: t('overview.total.subtitle') },
    { key: 'finance', label: t('overview.finance.label'), value: data.counts.finance, icon: 'wallet-outline', accent: 'finance', href: '/finance' },
    { key: 'fitness', label: t('overview.fitness.label'), value: data.counts.fitness, icon: 'barbell-outline', accent: 'fitness', href: '/fitness' },
    { key: 'food', label: t('overview.food.label'), value: data.counts.food, icon: 'restaurant-outline', accent: 'food', href: '/food' },
  ];
}

/** The four headline numbers. Module stats open their module. */
export function OverviewStats({ data, index }: { data: Dashboard; index: number }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  return (
    <Section index={index}>
      <SectionHeader title={t('overview.title')} />
      <Grid>
        {statsFor(data, t).map((stat) => (
          <View key={stat.key} style={gridCell}>
            <StatCard
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              accent={stat.accent}
              subtitle={stat.subtitle}
              onPress={stat.href ? () => router.push(stat.href as Href) : undefined}
            />
          </View>
        ))}
      </Grid>
    </Section>
  );
}
