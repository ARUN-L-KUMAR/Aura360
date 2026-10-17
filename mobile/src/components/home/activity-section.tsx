import { ActivityChart } from '@/components/home/activity-chart';
import { Section } from '@/components/home/section';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import type { Dashboard } from '@/features/dashboard/use-dashboard';
import { useTranslation } from '@/i18n';

export function ActivitySection({ chart, index }: { chart: Dashboard['chart']; index: number }) {
  const { t } = useTranslation('home');
  return (
    <Section index={index}>
      <SectionHeader title={t('activity.title')} subtitle={t('activity.subtitle')} />
      <Card>
        <ActivityChart data={chart} />
      </Card>
    </Section>
  );
}
