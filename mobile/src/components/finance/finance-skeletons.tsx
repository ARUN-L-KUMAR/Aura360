import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { layout, spacing } from '@/theme';

const ART_HEIGHT = spacing.xxxl * 3;
const RING = spacing.xxxl * 3 + spacing.lg;
const PILL = spacing.xxxl + spacing.sm;

/** Placeholder for the money hero: artwork block, title, big number and three stat pills. */
export function HeroSkeleton() {
  return (
    <SkeletonGroup>
      <Card padding="none" rounded="xl" style={{ overflow: 'hidden' }}>
        <Skeleton height={ART_HEIGHT} rounded={0} />
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Skeleton shape="line" width="45%" height={spacing.xl} />
          <Skeleton height={spacing.xxxl} width="60%" />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Skeleton height={PILL} style={{ flex: 1 }} />
            <Skeleton height={PILL} style={{ flex: 1 }} />
            <Skeleton height={PILL} style={{ flex: 1 }} />
          </View>
        </View>
      </Card>
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
