import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { api } from '@/lib/api';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

type SkincareProduct = {
  id: string;
  productName: string;
  brand?: string | null;
  category: string;
  bodyPart?: 'face' | 'hair' | 'body' | 'oral' | 'general';
  routineTime?: 'morning' | 'evening' | 'both' | 'weekly' | 'optional' | null;
  routineOrder?: number | null;
  status?: 'owned' | 'need_to_buy' | 'finished';
  rating?: number | null;
  notes?: string | null;
};

export default function SkincareScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<'morning' | 'evening' | 'all'>('morning');
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  const query = useQuery({
    queryKey: ['skincare-products'],
    queryFn: () => api.get<SkincareProduct[]>('/api/skincare'),
  });

  const allProducts = useMemo<SkincareProduct[]>(() => query.data ?? [], [query.data]);

  const morningRoutine = useMemo(() => {
    return allProducts
      .filter((p: SkincareProduct) => p.routineTime === 'morning' || p.routineTime === 'both')
      .sort((a: SkincareProduct, b: SkincareProduct) => (a.routineOrder ?? 99) - (b.routineOrder ?? 99));
  }, [allProducts]);

  const eveningRoutine = useMemo(() => {
    return allProducts
      .filter((p: SkincareProduct) => p.routineTime === 'evening' || p.routineTime === 'both')
      .sort((a: SkincareProduct, b: SkincareProduct) => (a.routineOrder ?? 99) - (b.routineOrder ?? 99));
  }, [allProducts]);

  const activeRoutine: SkincareProduct[] = tab === 'morning' ? morningRoutine : tab === 'evening' ? eveningRoutine : allProducts;

  const totalSteps = activeRoutine.length;
  const completedCount = activeRoutine.filter((p: SkincareProduct) => completedSteps[p.id]).length;
  const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  function toggleStep(id: string) {
    setCompletedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen onRefresh={() => query.refetch()} refreshing={query.isRefetching}>
        <Text variant="title">Skincare</Text>

        {/* Hero Routine Status Card */}
        <GlassCard glowColor={moduleColors.skincare} style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons
                name={tab === 'evening' ? 'moon' : 'sunny'}
                size={18}
                color={tab === 'evening' ? '#818cf8' : '#f59e0b'}
              />
              <Text variant="heading" style={{ fontSize: 16 }}>
                {tab === 'morning' ? 'Morning Glow Routine' : tab === 'evening' ? 'Night Repair Routine' : 'Product Shelf'}
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
                borderRadius: radius.pill,
                backgroundColor: `${moduleColors.skincare}25`,
              }}>
              <Text variant="caption" style={{ color: moduleColors.skincare, fontWeight: '700' }}>
                {completedCount}/{totalSteps} completed
              </Text>
            </View>
          </View>

          <ProgressBar percent={progressPct} color={moduleColors.skincare} />

          <Text variant="caption" muted>
            {progressPct === 100
              ? '✨ Routine complete! Your skin is thanking you.'
              : `${totalSteps - completedCount} steps remaining for today`}
          </Text>
        </GlassCard>

        {/* Tab Selector */}
        <Segmented
          options={[
            { value: 'morning', label: `☀️ AM (${morningRoutine.length})` },
            { value: 'evening', label: `🌙 PM (${eveningRoutine.length})` },
            { value: 'all', label: `Shelf (${allProducts.length})` },
          ]}
          value={tab}
          onChange={setTab}
        />

        {query.isPending ? <Text muted>Loading routine…</Text> : null}
        {query.isError ? <Text muted>Could not load skincare products.</Text> : null}

        {!query.isPending && !query.isError && activeRoutine.length === 0 ? (
          <EmptyState
            icon="sparkles-outline"
            title="No Products in Routine"
            description="Add cleansers, serums, moisturizers, or SPF to establish your personal skincare ritual."
          />
        ) : null}

        {/* Steps / Products List */}
        <View style={{ gap: spacing.sm }}>
          {activeRoutine.map((product, index) => {
            const isDone = !!completedSteps[product.id];
            return (
              <Pressable
                key={product.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isDone }}
                onPress={() => toggleStep(product.id)}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
                <GlassCard
                  glowColor={isDone ? moduleColors.skincare : undefined}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    paddingVertical: spacing.md,
                  }}>
                  {/* Step Number or Checkbox */}
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: radius.pill,
                      backgroundColor: isDone ? `${moduleColors.skincare}25` : colors.cardMuted,
                      borderWidth: 1.5,
                      borderColor: isDone ? moduleColors.skincare : colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    {isDone ? (
                      <Ionicons name="checkmark" size={20} color={moduleColors.skincare} />
                    ) : (
                      <Text variant="caption" style={{ fontWeight: '700' }}>
                        {index + 1}
                      </Text>
                    )}
                  </View>

                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      variant="label"
                      style={{
                        fontWeight: '700',
                        textDecorationLine: isDone ? 'line-through' : 'none',
                      }}
                      muted={isDone}>
                      {product.productName}
                    </Text>
                    <Text variant="caption" muted numberOfLines={1}>
                      {[product.category, product.brand].filter(Boolean).join(' · ')}
                    </Text>
                  </View>

                  {product.rating ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Ionicons name="star" size={12} color="#eab308" />
                      <Text variant="caption" style={{ fontWeight: '700' }}>
                        {product.rating}
                      </Text>
                    </View>
                  ) : null}
                </GlassCard>
              </Pressable>
            );
          })}
        </View>
      </Screen>
    </View>
  );
}
