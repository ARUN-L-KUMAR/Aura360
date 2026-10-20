import { View, type DimensionValue } from 'react-native';

import { Card } from '@/components/ui/card';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { layout, radius, spacing, useTheme } from '@/theme';

const RING = spacing.xxxl * 3;

/** Placeholder for the balance hero (dark card: label, big number, curve, footer) and the three figure cards under it. */
export function HeroSkeleton() {
  const { colors } = useTheme();
  const block = (width: DimensionValue, height: number, round: number) => <View style={{ width, height, borderRadius: round, backgroundColor: colors.heroChip }} />;
  return (
    <SkeletonGroup>
      <View style={{ gap: spacing.md }}>
        <View style={{ borderRadius: radius.xl, backgroundColor: colors.heroSurface, padding: spacing.xl, gap: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            {block('38%', spacing.md, radius.sm)}
            {block('62%', spacing.xxxl - spacing.sm, radius.md)}
          </View>
          {block('100%', spacing.xxxl * 2 + spacing.xl, radius.lg)}
          {block('55%', spacing.xl, radius.pill)}
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {[0, 1, 2].map((i) => (
            <Card key={i} rounded="lg" padding="none" style={{ flex: 1, padding: spacing.md, gap: spacing.sm }}>
              <Skeleton shape="box" width={spacing.xl + spacing.xs} height={spacing.xl + spacing.xs} rounded="md" />
              <Skeleton shape="line" width="60%" height={spacing.sm + spacing.xs} />
              <Skeleton shape="box" width="80%" height={spacing.lg} />
            </Card>
          ))}
        </View>
      </View>
    </SkeletonGroup>
  );
}

/** Placeholder for the donut card ("Where it went"): title row, the ring and a legend beside it. */
export function BreakdownSkeleton() {
  return (
    <SkeletonGroup>
      <Card rounded="xl" padding="none" style={{ padding: spacing.lg, gap: spacing.lg }}>
        <Skeleton shape="line" width="45%" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          <Skeleton shape="circle" size={RING} />
          <View style={{ flex: 1, gap: spacing.md }}>
            <Skeleton shape="line" />
            <Skeleton shape="line" width="85%" />
            <Skeleton shape="line" width="70%" />
          </View>
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
