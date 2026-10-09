import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useContributeToGoal } from '@/features/finance/hooks';
import type { Goal } from '@/features/finance/types';
import { ApiError } from '@/lib/api';
import { CURRENCY_SYMBOL } from '@/lib/config';
import { formatMoney } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';

const PRESETS = [500, 1000, 2000, 5000, 10000];

export default function ContributeScreen() {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const params = useLocalSearchParams<{ goal?: string }>();
  const goal = useMemo<Goal | null>(() => {
    try {
      return params.goal ? (JSON.parse(params.goal) as Goal) : null;
    } catch {
      return null;
    }
  }, [params.goal]);

  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const contribute = useContributeToGoal();

  if (!goal) {
    return (
      <Screen topInset={false}>
        <Text muted>Goal not found.</Text>
      </Screen>
    );
  }

  const value = Number.parseFloat(amount.replace(/,/g, '')) || 0;
  const newTotal = goal.currentAmount + value;
  const newPercent = goal.targetAmount > 0 ? Math.min(100, Math.round((newTotal / goal.targetAmount) * 100)) : 0;
  const oldPercent = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;

  function addPreset(val: number) {
    const cur = Number.parseFloat(amount.replace(/,/g, '')) || 0;
    setAmount(String(cur + val));
  }

  async function submit() {
    if (!goal) return;
    if (!Number.isFinite(value) || value <= 0) return setError('Enter an amount greater than 0.');
    setError(null);
    try {
      await contribute.mutateAsync({ id: goal.id, amount: value });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save. Try again.');
    }
  }

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: 'Add money' }} />

      {/* Target Goal Summary Card */}
      <GlassCard
        glowColor={goal.color}
        style={{
          gap: spacing.sm,
          padding: spacing.lg,
          backgroundColor: isDark ? 'rgba(18, 26, 36, 0.95)' : '#ffffff',
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="caption" muted style={{ fontWeight: '700', letterSpacing: 0.8 }}>
            CONTRIBUTING TO
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text variant="caption" style={{ fontWeight: '700', color: goal.color }}>
              {newPercent}%
            </Text>
            {value > 0 ? (
              <Text variant="caption" style={{ color: colors.success, fontWeight: '700' }}>
                (+{newPercent - oldPercent}%)
              </Text>
            ) : null}
          </View>
        </View>

        <Text variant="heading">{goal.title}</Text>

        <ProgressBar percent={newPercent} color={goal.color} height={6} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="caption" muted>
            Current: {formatMoney(goal.currentAmount)}
          </Text>
          <Text variant="caption" style={{ fontWeight: '600', color: goal.color }}>
            New total: {formatMoney(newTotal)}
          </Text>
        </View>
      </GlassCard>

      {/* Hero Deposit Amount Input */}
      <GlassCard
        glowColor={goal.color}
        style={{
          padding: spacing.lg,
          alignItems: 'center',
          gap: spacing.md,
          backgroundColor: isDark ? 'rgba(18, 26, 36, 0.95)' : '#ffffff',
        }}>
        <Text variant="caption" muted style={{ fontWeight: '700', letterSpacing: 0.8 }}>
          DEPOSIT AMOUNT
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 32, fontWeight: '700', color: goal.color, marginRight: 4 }}>
            {CURRENCY_SYMBOL}
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            autoFocus
            style={{
              fontSize: 42,
              fontWeight: '800',
              color: colors.text,
              minWidth: 120,
              textAlign: 'center',
              fontVariant: ['tabular-nums'],
              paddingVertical: 0,
            }}
          />
        </View>

        {/* Quick Deposit Chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'center' }}>
          {PRESETS.map((val) => (
            <Pressable
              key={val}
              onPress={() => addPreset(val)}
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
                +{CURRENCY_SYMBOL}{val >= 1000 ? `${val / 1000}k` : val}
              </Text>
            </Pressable>
          ))}
        </View>
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

      <Button title={`Add ${value > 0 ? formatMoney(value) : 'money'} to goal`} onPress={submit} loading={contribute.isPending} />
    </Screen>
  );
}
