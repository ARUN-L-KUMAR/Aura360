import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useDeleteBudget, useSaveBudget } from '@/features/finance/hooks';
import { BUDGET_CATEGORIES, OVERALL_BUDGET, type Budget } from '@/features/finance/types';
import { ApiError } from '@/lib/api';
import { CURRENCY_SYMBOL } from '@/lib/config';
import { monthKey, monthLabel } from '@/lib/format';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

const CUSTOM = '__custom__';
const THRESHOLDS = [50, 70, 80, 90];
const PRESET_LIMITS = [5000, 10000, 20000, 50000];

function parseBudget(raw?: string): Budget | null {
  try {
    return raw ? (JSON.parse(raw) as Budget) : null;
  } catch {
    return null;
  }
}

export default function BudgetScreen() {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const params = useLocalSearchParams<{ budget?: string; month?: string }>();
  const existing = useMemo(() => parseBudget(params.budget), [params.budget]);
  const month = params.month || monthKey();

  const isOverallExisting = existing?.category === OVERALL_BUDGET;
  const [category, setCategory] = useState(existing ? existing.category : '');
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [threshold, setThreshold] = useState(existing?.alertThreshold ?? 80);
  const [error, setError] = useState<string | null>(null);

  const save = useSaveBudget();
  const remove = useDeleteBudget();

  const finalCategory = category === CUSTOM ? customCategory.trim() : category;

  async function submit() {
    const value = Number.parseFloat(amount.replace(/,/g, ''));
    if (!finalCategory) return setError('Choose a category.');
    if (!Number.isFinite(value) || value <= 0) return setError('Enter a budget greater than 0.');

    setError(null);
    try {
      await save.mutateAsync({ category: finalCategory, amount: value, month, alertThreshold: threshold });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save. Try again.');
    }
  }

  function confirmDelete() {
    if (!existing) return;
    Alert.alert('Delete budget?', `The ${isOverallExisting ? 'overall' : existing.category} budget will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove.mutateAsync(existing.id);
            router.back();
          } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Could not delete. Try again.');
          }
        },
      },
    ]);
  }

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: existing ? 'Edit budget' : 'New budget' }} />

      {/* Month Pill Badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: isDark ? 'rgba(34, 48, 65, 0.6)' : colors.cardMuted }}>
        <Ionicons name="calendar-outline" size={14} color={moduleColors.finance} />
        <Text variant="caption" style={{ fontWeight: '600', color: colors.text }}>
          {monthLabel(month)}
        </Text>
      </View>

      {/* Category Selection */}
      {existing ? (
        <GlassCard style={{ gap: spacing.xs, padding: spacing.md }}>
          <Text variant="caption" muted style={{ fontWeight: '700', letterSpacing: 0.8 }}>
            TARGET CATEGORY
          </Text>
          <Text variant="heading">{isOverallExisting ? 'Overall Monthly Budget' : existing.category}</Text>
        </GlassCard>
      ) : (
        <GlassCard style={{ gap: spacing.sm, padding: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons name="pie-chart-outline" size={16} color={colors.textMuted} />
            <Text variant="label" muted>
              Category
            </Text>
          </View>
          <ChipGroup>
            <Chip
              label="Overall"
              selected={category === OVERALL_BUDGET}
              color={moduleColors.finance}
              onPress={() => setCategory(OVERALL_BUDGET)}
            />
            {BUDGET_CATEGORIES.map((name) => (
              <Chip
                key={name}
                label={name}
                selected={category === name}
                color={moduleColors.finance}
                onPress={() => setCategory(name)}
              />
            ))}
            <Chip
              label="Custom…"
              selected={category === CUSTOM}
              color={moduleColors.finance}
              onPress={() => setCategory(CUSTOM)}
            />
          </ChipGroup>
          {category === CUSTOM ? (
            <Input value={customCategory} onChangeText={setCustomCategory} placeholder="Category name" />
          ) : null}
        </GlassCard>
      )}

      {/* Hero Monthly Limit Card */}
      <GlassCard
        glowColor={moduleColors.finance}
        style={{
          padding: spacing.lg,
          alignItems: 'center',
          gap: spacing.md,
          backgroundColor: isDark ? 'rgba(18, 26, 36, 0.95)' : '#ffffff',
        }}>
        <Text variant="caption" muted style={{ fontWeight: '700', letterSpacing: 0.8 }}>
          MONTHLY SPENDING LIMIT
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 32, fontWeight: '700', color: moduleColors.finance, marginRight: 4 }}>
            {CURRENCY_SYMBOL}
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            autoFocus={!existing}
            style={{
              fontSize: 40,
              fontWeight: '800',
              color: colors.text,
              minWidth: 120,
              textAlign: 'center',
              fontVariant: ['tabular-nums'],
              paddingVertical: 0,
            }}
          />
        </View>

        {/* Quick Presets */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'center' }}>
          {PRESET_LIMITS.map((val) => (
            <Pressable
              key={val}
              onPress={() => setAmount(String(val))}
              style={({ pressed }) => ({
                paddingHorizontal: spacing.sm + 4,
                paddingVertical: spacing.xs + 2,
                borderRadius: radius.pill,
                backgroundColor: isDark ? 'rgba(34, 48, 65, 0.7)' : colors.cardMuted,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
                opacity: pressed ? 0.7 : 1,
              })}>
              <Text variant="caption" style={{ fontWeight: '600', color: colors.text }}>
                {CURRENCY_SYMBOL}{val >= 1000 ? `${val / 1000}k` : val}
              </Text>
            </Pressable>
          ))}
        </View>
      </GlassCard>

      {/* Threshold Warning Section */}
      <GlassCard style={{ gap: spacing.sm, padding: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons name="notifications-outline" size={16} color={colors.warning} />
          <Text variant="label" muted>
            Alert threshold
          </Text>
        </View>
        <Text variant="caption" muted>
          Aura will notify you when spending hits this percentage of your limit.
        </Text>
        <ChipGroup>
          {THRESHOLDS.map((value) => (
            <Chip
              key={value}
              label={`${value}%`}
              selected={threshold === value}
              color={colors.warning}
              onPress={() => setThreshold(value)}
            />
          ))}
        </ChipGroup>
      </GlassCard>

      {error ? (
        <View
          style={{
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: `${colors.danger}18`,
            borderWidth: 1,
            borderColor: `${colors.danger}40`,
          }}>
          <Text color="danger" style={{ fontWeight: '600' }}>
            {error}
          </Text>
        </View>
      ) : null}

      <Button title={existing ? 'Save budget changes' : 'Save budget'} onPress={submit} loading={save.isPending} />
      {existing ? <Button title="Delete budget" variant="ghost" onPress={confirmDelete} loading={remove.isPending} /> : null}
    </Screen>
  );
}
