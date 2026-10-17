import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { memo } from 'react';
import { View } from 'react-native';

import { Grid, gridCell } from '@/components/home/grid';
import { Section } from '@/components/home/section';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import type { Dashboard } from '@/features/dashboard/use-dashboard';
import { modules, type ModuleKey } from '@/features/modules';
import { useTranslation } from '@/i18n';
import { directional } from '@/i18n/rtl';
import { haptics } from '@/lib/haptics';
import { radius, spacing, useTheme } from '@/theme';

export const MODULE_GRID: ModuleKey[] = ['notes', 'finance', 'fitness', 'food', 'saved', 'fashion', 'skincare', 'time'];

const TILE = spacing.xxl + spacing.sm; // 40

const ModuleCard = memo(function ModuleCard({ moduleKey, count, onOpen }: { moduleKey: ModuleKey; count: number; onOpen: (href: string) => void }) {
  const { t } = useTranslation('home');
  const { accent, colors } = useTheme();
  const info = modules[moduleKey];
  const a = accent(moduleKey);
  const entries = t('modules.entries', { count });

  return (
    <Card
      accent={moduleKey}
      accessibilityLabel={t('modules.cardLabel', { label: info.label, entries, description: info.description })}
      accessibilityHint={t('modules.cardHint', { label: info.label })}
      onPress={() => {
        haptics.tap();
        onOpen(info.href);
      }}
      style={[gridCell, { gap: spacing.sm }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <View style={{ width: TILE, height: TILE, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: a.soft }}>
          <Ionicons name={info.icon} size={22} color={a.text} />
        </View>
        {count > 0 ? (
          <View
            style={{
              minWidth: spacing.xl,
              minHeight: spacing.xl,
              paddingHorizontal: spacing.sm,
              borderRadius: radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: a.solid,
            }}>
            <Text variant="caption" weight="semiBold" numeric style={{ color: a.onSolid }}>
              {count > 99 ? '99+' : count}
            </Text>
          </View>
        ) : (
          <Ionicons name={directional('chevron-forward', 'chevron-back')} size={18} color={colors.textMuted} />
        )}
      </View>
      <View style={{ gap: 2 }}>
        <Text variant="label" weight="semiBold" numberOfLines={1}>
          {info.label}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={2}>
          {info.description}
        </Text>
      </View>
    </Card>
  );
});

/** Every module with its entry count; modules with entries get a count pill. */
export function ModulesGrid({ counts, index }: { counts: Dashboard['counts']; index: number }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const open = (href: string) => router.push(href as Href);
  const active = MODULE_GRID.filter((key) => (counts[key as keyof Dashboard['counts']] ?? 0) > 0).length;

  return (
    <Section index={index}>
      <SectionHeader title={t('modules.title')} subtitle={t('modules.active', { active, total: MODULE_GRID.length })} />
      <Grid>
        {MODULE_GRID.map((key) => (
          <ModuleCard key={key} moduleKey={key} count={counts[key as keyof Dashboard['counts']] ?? 0} onOpen={open} />
        ))}
      </Grid>
    </Section>
  );
}
