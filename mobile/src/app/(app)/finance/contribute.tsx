import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AmountField } from '@/components/finance/amount-field';
import { failureMessage, parseAmount } from '@/components/finance/form-parts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useContributeToGoal } from '@/features/finance/hooks';
import type { Goal } from '@/features/finance/types';
import { formatMoney } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { spacing } from '@/theme';

const PRESETS = [500, 1000, 2000, 5000, 10000];

export default function ContributeScreen() {
  const router = useRouter();
  const notify = useNotify();
  const params = useLocalSearchParams<{ goal?: string }>();
  const goal = useMemo<Goal | null>(() => {
    try {
      return params.goal ? (JSON.parse(params.goal) as Goal) : null;
    } catch {
      return null;
    }
  }, [params.goal]);

  const [amount, setAmount] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const contribute = useContributeToGoal();

  if (!goal) {
    return (
      <Screen topInset={false}>
        <Stack.Screen options={{ title: 'Add money' }} />
        <ErrorState kind="notFound" title="Goal not found" message="This goal may have been removed." onRetry={() => router.back()} retryLabel="Go back" />
      </Screen>
    );
  }

  const parsed = parseAmount(amount);
  const value = Number.isFinite(parsed) ? parsed : 0;
  const amountError = value <= 0 ? 'Enter an amount greater than 0.' : null;
  const newTotal = goal.currentAmount + value;
  const newPercent = goal.targetAmount > 0 ? Math.min(100, Math.round((newTotal / goal.targetAmount) * 100)) : 0;
  const oldPercent = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;

  function addPreset(val: number) {
    setAmount(String(Math.round((value + val) * 100) / 100));
  }

  async function submit() {
    if (!goal) return;
    setSubmitted(true);
    if (amountError) {
      haptics.warning();
      return;
    }
    try {
      await contribute.mutateAsync({ id: goal.id, amount: value });
      notify.success(`Added ${formatMoney(value)} to ${goal.title}`);
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, 'Could not save. Try again.'));
    }
  }

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: 'Add money' }} />

      <Card tintColor={goal.color} style={{ gap: spacing.sm }}>
        <Text variant="caption" weight="semiBold" color="textSecondary">
          Contributing to
        </Text>
        <Text variant="title">{goal.title}</Text>
        <ProgressBar percent={newPercent} color={goal.color} label={`${newPercent}% of ${formatMoney(goal.targetAmount)}`} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <Text variant="caption" numeric color="textSecondary">
            Saved so far: {formatMoney(goal.currentAmount)}
          </Text>
          <Text variant="caption" weight="semiBold" numeric>
            New total: {formatMoney(newTotal)}
            {value > 0 && newPercent > oldPercent ? ` (+${newPercent - oldPercent}%)` : ''}
          </Text>
        </View>
      </Card>

      <AmountField
        label="Deposit amount"
        value={amount}
        onChangeText={setAmount}
        tone="primaryAccent"
        error={submitted ? amountError : null}
        autoFocus
        presets={PRESETS}
        presetsAdd
        onPreset={addPreset}
      />

      <Button title={`Add ${value > 0 ? formatMoney(value) : 'money'} to goal`} leftIcon="add" onPress={submit} loading={contribute.isPending} />
    </Screen>
  );
}
