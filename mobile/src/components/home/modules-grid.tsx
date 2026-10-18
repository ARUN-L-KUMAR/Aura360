import { useRouter, type Href } from 'expo-router';
import { memo } from 'react';
import { View } from 'react-native';

import { Grid, gridCell } from '@/components/home/grid';
import { IconTile } from '@/components/home/icon-tile';
import { Section, SectionHead } from '@/components/home/section';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import type { Dashboard } from '@/features/dashboard/use-dashboard';
import { modules, type ModuleKey } from '@/features/modules';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { layout, spacing } from '@/theme';

export const MODULE_GRID: ModuleKey[] = ['notes', 'finance', 'fitness', 'food', 'saved', 'fashion', 'skincare', 'time'];

const ModuleCard = memo(function ModuleCard({ moduleKey, count, onOpen }: { moduleKey: ModuleKey; count: number; onOpen: (href: string) => void }) {
  const { t } = useTranslation('home');
  const info = modules[moduleKey];
  const entries = t('modules.entries', { count });

  return (
    <Card
      accent={moduleKey}
      rounded="xl"
      accessibilityLabel={t('modules.cardLabel', { label: info.label, entries, description: info.description })}
      accessibilityHint={t('modules.cardHint', { label: info.label })}
      onPress={() => {
        haptics.tap();
        onOpen(info.href);
      }}
      style={[gridCell, { gap: spacing.lg, minHeight: layout.minTouchTarget * 2 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <IconTile icon={info.icon} accent={moduleKey} />
        {/* The live number: the module's entry count, shown at once (no count-up this far down the page). */}
        <AnimatedNumber value={count} from={count} variant="headline" />
      </View>
      <View style={{ gap: spacing.xs / 2 }}>
        <Text variant="label" weight="bold" numberOfLines={1}>
          {info.label}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={2}>
          {info.description}
        </Text>
      </View>
    </Card>
  );
});

/** Every module as a ring card with its tinted icon tile, entry count and one-line description. */
export const ModulesGrid = memo(function ModulesGrid({ counts, index }: { counts: Dashboard['counts']; index: number }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const open = (href: string) => router.push(href as Href);
  const active = MODULE_GRID.filter((key) => (counts[key as keyof Dashboard['counts']] ?? 0) > 0).length;

  return (
    <Section index={index}>
      <SectionHead title={t('modules.title')} description={t('modules.active', { active, total: MODULE_GRID.length })} />
      <Grid>
        {MODULE_GRID.map((key) => (
          <ModuleCard key={key} moduleKey={key} count={counts[key as keyof Dashboard['counts']] ?? 0} onOpen={open} />
        ))}
      </Grid>
    </Section>
  );
});
