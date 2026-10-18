import { useRouter, type Href } from 'expo-router';
import { memo } from 'react';
import { View } from 'react-native';

import { Grid, gridCell } from '@/components/home/grid';
import { IconTile } from '@/components/home/icon-tile';
import { Section, SectionHead } from '@/components/home/section';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { IconName, ModuleKey } from '@/features/modules';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { layout, spacing } from '@/theme';

type QuickAction = { key: 'note' | 'transaction' | 'meal' | 'workout'; icon: IconName; accent: ModuleKey; href: string };

const ACTIONS: QuickAction[] = [
  { key: 'note', icon: 'create-outline', accent: 'notes', href: '/notes/edit' },
  { key: 'transaction', icon: 'add-circle-outline', accent: 'finance', href: '/finance/transaction' },
  { key: 'meal', icon: 'restaurant-outline', accent: 'food', href: '/food/meal' },
  { key: 'workout', icon: 'barbell-outline', accent: 'fitness', href: '/fitness/workout' },
];

const QuickActionCard = memo(function QuickActionCard({ action, onPress }: { action: QuickAction; onPress: (href: string) => void }) {
  const { t } = useTranslation('home');
  const label = t(`quickActions.${action.key}.label`);
  return (
    <Card
      accessibilityLabel={t('quickActions.cardLabel', { label, caption: t(`quickActions.${action.key}.caption`) })}
      accessibilityHint={t(`quickActions.${action.key}.hint`)}
      onPress={() => {
        haptics.tap();
        onPress(action.href);
      }}
      padding="md"
      rounded="xl"
      style={[gridCell, { gap: spacing.md, minHeight: layout.minTouchTarget * 2 }]}>
      <IconTile icon={action.icon} accent={action.accent} />
      <View style={{ gap: spacing.xs / 2 }}>
        <Text variant="label" weight="bold" numberOfLines={2}>
          {label}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={2}>
          {t(`quickActions.${action.key}.caption`)}
        </Text>
      </View>
    </Card>
  );
});

/** One-tap entry points to the forms people use most: web-style ring cards with a tinted icon tile and a bold label. */
export const QuickActions = memo(function QuickActions({ index }: { index: number }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const open = (href: string) => router.push(href as Href);
  return (
    <Section index={index}>
      <SectionHead title={t('quickActions.title')} description={t('quickActions.description')} />
      <Grid>
        {ACTIONS.map((action) => (
          <QuickActionCard key={action.key} action={action} onPress={open} />
        ))}
      </Grid>
    </Section>
  );
});
