import { ActivityChart } from '@/components/home/activity-chart';
import { Section } from '@/components/home/section';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import type { Dashboard } from '@/features/dashboard/use-dashboard';

export function ActivitySection({ chart, index }: { chart: Dashboard['chart']; index: number }) {
  return (
    <Section index={index}>
      <SectionHeader title="Activity overview" subtitle="Daily activity count for the last 7 days" />
      <Card>
        <ActivityChart data={chart} />
      </Card>
    </Section>
  );
}
