import { View, type DimensionValue } from 'react-native';

import { Card } from '@/components/ui/card';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { layout, radius, spacing, useTheme } from '@/theme';

const RING = spacing.xxxl * 3 + spacing.lg;
const PILL = spacing.xxxl + spacing.sm;

/** Placeholder for the money hero: a dark hero card with a chip, the big number, two buttons and the stat strip. */
export function HeroSkeleton() {
  const { colors } = useTheme();
  const block = (width: DimensionValue, height: number, round: number) => <View style={{ width, height, borderRadius: round, backgroundColor: colors.heroChip }} />;
  return (
    <SkeletonGroup>
      <View style={{ borderRadius: radius.xl, backgroundColor: colors.heroSurface, padding: spacing.xl, gap: spacing.lg }}>
        {block('38%', spacing.xl, radius.pill)}
        {block('62%', spacing.xxxl, radius.md)}
        {block('72%', spacing.lg, radius.sm)}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {block('52%', layout.minTouchTarget + spacing.md, radius.lg)}
          {block('36%', layout.minTouchTarget + spacing.md, radius.lg)}
        </View>
        {block('100%', PILL, radius.lg)}
      </View>
    </SkeletonGroup>
  );
}

/** Placeholder for the stat-card grid. */
export function StatGridSkeleton() {
  return (
    <SkeletonGroup>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} style={{ flexGrow: 1, flexBasis: spacing.xxxl * 3, gap: spacing.md }}>
            <Skeleton shape="box" width={layout.minTouchTarget} height={layout.minTouchTarget} rounded="lg" />
            <Skeleton shape="line" width="45%" height={spacing.sm + spacing.xs} />
            <Skeleton shape="box" width="70%" height={spacing.xl} />
          </Card>
        ))}
      </View>
    </SkeletonGroup>
  );
}

/** Placeholder for a ring-and-legend card (spending breakdown). */
export function BreakdownSkeleton() {
  return (
    <SkeletonGroup>
      <Card style={{ gap: spacing.lg, alignItems: 'center' }}>
        <Skeleton shape="circle" size={RING} />
        <View style={{ alignSelf: 'stretch', gap: spacing.md }}>
          <Skeleton shape="line" />
          <Skeleton shape="line" width="85%" />
          <Skeleton shape="line" width="70%" />
        </View>
      </Card>
    </SkeletonGroup>
  );
}

/** Placeholder for a card with a ring on the start side and three lines of text (a budget or a goal). */
export function RingCardSkeleton({ summary = false }: { summary?: boolean }) {
  const ring = summary ? spacing.xxxl * 2 : spacing.xxxl + spacing.xl;
  return (
    <SkeletonGroup>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg, minHeight: layout.minTouchTarget }}>
        <Skeleton shape="circle" size={ring} />
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Skeleton shape="line" width="55%" />
          <Skeleton shape="line" width="80%" />
          <Skeleton shape="line" width="40%" height={spacing.sm + spacing.xs} />
        </View>
      </Card>
    </SkeletonGroup>
  );
}
