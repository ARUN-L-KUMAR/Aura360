import { useRouter, type Href } from 'expo-router';
import type { TFunction } from 'i18next';
import { memo, useMemo } from 'react';
import { View } from 'react-native';

import { Section, SectionHead } from '@/components/home/section';
import { useGlass } from '@/components/home/glass-card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { IconTile } from '@/components/ui/stat-parts';
import { Text } from '@/components/ui/text';
import type { Dashboard } from '@/features/dashboard/use-dashboard';
import type { HomeModule } from '@/features/home/layout';
import { useModules, type ModuleKey } from '@/features/modules';
import { formatMinutes } from '@/features/time/types';
import { useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { layout, radius, spacing } from '@/theme';

/** Tiles per row. A short last row is padded with empty cells, so every tile keeps the same width. */
const COLUMNS = 3;

type Tile = { key: ModuleKey; value: string; spoken: string };

/**
 * One live figure per module, all read from the dashboard (nothing is made up): money left this month, workouts this
 * week, meals today, pinned notes, time tracked today and skincare products.
 */
function tilesOf(data: Dashboard, t: TFunction<'home'>): Record<HomeModule, Tile> {
  const today = data.today;
  const left = data.month.income - data.month.expense - data.month.investment;
  const workouts = today?.fitness.workoutsWeek ?? 0;
  const meals = today?.food.meals ?? 0;
  const pinned = today?.pinnedNotes.length ?? 0;
  const minutes = Math.round(today?.time.minutesToday ?? 0);
  const products = data.counts.skincare;
  const saved = data.counts.saved;
  const pieces = data.counts.fashion;
  return {
    finance: {
      key: 'finance',
      value: formatMoney(left, { compact: true }),
      spoken: left < 0 ? t('tiles.financeOver', { amount: formatMoney(Math.abs(left)) }) : t('tiles.financeLeft', { amount: formatMoney(left) }),
    },
    fitness: { key: 'fitness', value: t('tiles.sessions', { count: workouts }), spoken: t('tiles.sessionsSpoken', { count: workouts }) },
    food: { key: 'food', value: t('tiles.meals', { count: meals }), spoken: t('tiles.mealsSpoken', { count: meals }) },
    notes: { key: 'notes', value: t('tiles.pinned', { count: pinned }), spoken: t('tiles.pinnedSpoken', { count: pinned }) },
    time: { key: 'time', value: formatMinutes(minutes), spoken: t('tiles.timeSpoken', { time: formatMinutes(minutes) }) },
    skincare: { key: 'skincare', value: t('tiles.products', { count: products }), spoken: t('tiles.productsSpoken', { count: products }) },
    saved: { key: 'saved', value: t('tiles.saved', { count: saved }), spoken: t('tiles.savedSpoken', { count: saved }) },
    fashion: { key: 'fashion', value: t('tiles.pieces', { count: pieces }), spoken: t('tiles.piecesSpoken', { count: pieces }) },
  };
}

function ModuleTile({ tile }: { tile: Tile }) {
  const { t } = useTranslation('home');
  const router = useRouter();
  const glass = useGlass();
  const modules = useModules();
  const info = modules[tile.key];
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${info.label}. ${tile.spoken}`}
      accessibilityHint={t('modules.cardHint', { label: info.label })}
      haptic="tap"
      scaleTo={0.97}
      ringRadius={radius.xl}
      onPress={() => router.push(info.href as Href)}
      style={{
        flexGrow: 1,
        flexBasis: 0,
        minWidth: 0,
        minHeight: layout.minTouchTarget * 2,
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: glass.border,
        backgroundColor: glass.fill,
      }}>
      <IconTile icon={info.icon} accent={tile.key} size={36} />
      <View style={{ gap: 2 }}>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {info.short}
        </Text>
        <Text variant="label" weight="bold" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {tile.value}
        </Text>
      </View>
    </PressableScale>
  );
}

/**
 * "Your modules": live tiles for the modules the person keeps on Home, three to a row. Each is one module with one real
 * figure from the dashboard, and a tap opens that module. The rows are plain flex rows of equal tiles (a short last row is
 * padded with empty cells), so the grid never depends on percentage widths.
 */
export const ModuleTiles = memo(function ModuleTiles({ data, modules: shown, index, onCustomize }: { data: Dashboard; modules: readonly HomeModule[]; index: number; onCustomize?: () => void }) {
  const { t } = useTranslation('home');
  const tiles = useMemo(() => tilesOf(data, t), [data, t]);
  const rows = useMemo(() => {
    const out: (HomeModule | null)[][] = [];
    for (let i = 0; i < shown.length; i += COLUMNS) {
      const row: (HomeModule | null)[] = shown.slice(i, i + COLUMNS) as HomeModule[];
      while (row.length < COLUMNS) row.push(null);
      out.push(row);
    }
    return out;
  }, [shown]);
  if (shown.length === 0) return null;
  return (
    <Section index={index}>
      <SectionHead
        title={t('modules.title')}
        actionLabel={onCustomize ? t('customize.link') : undefined}
        actionAccessibilityLabel={onCustomize ? t('customize.linkLabel') : undefined}
        onActionPress={onCustomize}
      />
      <View style={{ gap: spacing.md }}>
        {rows.map((row) => (
          <View key={row[0]} style={{ flexDirection: 'row', gap: spacing.md }}>
            {row.map((key, i) => (key ? <ModuleTile key={key} tile={tiles[key]} /> : <View key={`pad-${i}`} style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }} />))}
          </View>
        ))}
      </View>
    </Section>
  );
});
