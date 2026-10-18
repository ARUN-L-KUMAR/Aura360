import type Ionicons from '@expo/vector-icons/Ionicons';
import { memo, type ComponentProps, type ReactNode } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { IconTile, TILE_SIZE, TrendPill } from '@/components/ui/stat-parts';
import { Text } from '@/components/ui/text';
import { AnimatedNumber } from '@/components/viz/animated-number';
import { MiniBars } from '@/components/viz/mini-bars';
import { Sparkline } from '@/components/viz/sparkline';
import { useTranslation } from '@/i18n';
import { layout, spacing, type ModuleKey } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * A compact stat: icon chip, label, big number, optional delta badge and a small chart at the bottom.
 *
 * ```tsx
 * <StatTile label={t('spent')} icon="wallet-outline" accent="finance" value={spent} format={formatMoney}
 *           delta={{ text: '12%', direction: 'down', good: true }} sparkline={daily} onPress={openDetails} />
 * ```
 *
 * - `value`: a number counts up (`format` localises it); a string or node is shown as is (then give `accessibilityLabel`).
 * - `delta`: arrow icon AND colour; `good` says whether the movement is welcome (default: up is good).
 * - `sparkline` or `bars` adds a chart; it is decoration here, so the tile reads as one sentence.
 * - `onPress` makes the whole tile a button (scale feedback, focus ring, 44pt minimum).
 * - `loading` swaps the content for a skeleton of the same shape.
 */
export type StatTileDelta = {
  /** Already formatted, for example "12%" or "+₹400". */
  text: string;
  direction: 'up' | 'down' | 'flat';
  /** Whether this movement is good news. Defaults to up = good, down = bad, flat = neutral. */
  good?: boolean;
};

export type StatTileProps = {
  label: string;
  value: number | string | ReactNode;
  /** Formatter for a numeric `value`. */
  format?: (value: number) => string;
  icon?: IconName;
  accent?: ModuleKey;
  delta?: StatTileDelta;
  /** Series for a sparkline at the bottom. */
  sparkline?: readonly number[];
  /** Values for mini bars at the bottom (used when there is no sparkline). */
  bars?: readonly number[];
  /** Index of the bar to emphasise (today). */
  highlightIndex?: number;
  /** Extra spoken text about the chart ("up 12 percent over 7 days"). */
  chartLabel?: string;
  onPress?: () => void;
  loading?: boolean;
  /** Replaces the generated "label: value, delta" sentence. */
  accessibilityLabel?: string;
};

const CHIP = TILE_SIZE;
const CHART_HEIGHT = spacing.xxl;

function StatTileImpl({ label, value, format, icon, accent, delta, sparkline, bars, highlightIndex, chartLabel, onPress, loading, accessibilityLabel }: StatTileProps) {
  const { t } = useTranslation('common');

  if (loading) {
    return (
      <Card padding="sm" rounded="lg" style={{ minHeight: layout.minTouchTarget }}>
        <SkeletonGroup style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
            <Skeleton shape="box" width={CHIP} height={CHIP} />
          </View>
          <Skeleton shape="line" width="40%" />
          <Skeleton shape="box" width="60%" height={spacing.xl} />
          <Skeleton shape="box" height={CHART_HEIGHT} />
        </SkeletonGroup>
      </Card>
    );
  }

  const valueText = typeof value === 'number' ? (format ? format(value) : String(value)) : typeof value === 'string' ? value : null;
  const good = delta ? (delta.good ?? (delta.direction === 'up' ? true : delta.direction === 'down' ? false : undefined)) : undefined;
  const deltaWord = delta?.direction === 'up' ? 'up' : delta?.direction === 'down' ? 'down' : 'unchanged';

  const spoken =
    accessibilityLabel ??
    [valueText === null ? label : `${label}: ${valueText}`, delta ? t(`statCard.${deltaWord}`, { value: delta.text }) : null, chartLabel].filter(Boolean).join(', ');

  return (
    <Card accessible accessibilityLabel={spoken} onPress={onPress} accent={accent} padding="sm" rounded="lg" style={{ gap: spacing.md, minHeight: layout.minTouchTarget }}>
      {icon || delta ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
          {icon ? <IconTile icon={icon} accent={accent} /> : <View />}
          {delta ? <TrendPill text={delta.text} direction={delta.direction} good={good} /> : null}
        </View>
      ) : null}

      <View style={{ gap: spacing.xs }}>
        <Text variant="overline" color="textMuted" numberOfLines={2}>
          {label}
        </Text>
        {typeof value === 'number' ? <AnimatedNumber value={value} format={format} accessibilityLabel={valueText ?? undefined} /> : typeof value === 'string' ? <Text variant="headline" numeric numberOfLines={1}>{value}</Text> : value}
      </View>

      {sparkline ? (
        <Sparkline values={sparkline} accent={accent} height={CHART_HEIGHT} negativeIsBad={good === false && delta?.direction === 'down'} />
      ) : bars ? (
        <MiniBars values={bars} highlightIndex={highlightIndex} accent={accent} height={CHART_HEIGHT} />
      ) : null}
    </Card>
  );
}

export const StatTile = memo(StatTileImpl);
