import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { AmountField } from '@/components/finance/amount-field';
import { failureMessage } from '@/components/finance/failure-message';
import { parseAmount } from '@/components/finance/form-parts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { SuccessCheck } from '@/components/ui/success-check';
import { Text } from '@/components/ui/text';
import { useContributeToGoal } from '@/features/finance/hooks';
import type { Goal } from '@/features/finance/types';
import { useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
import { useNotify } from '@/providers/notify';
import { spacing } from '@/theme';

const PRESETS = [500, 1000, 2000, 5000, 10000];

export default function ContributeScreen() {
  const router = useRouter();
  const notify = useNotify();
  const { t } = useTranslation('finance');
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
  const [reached, setReached] = useState(false);
  const contribute = useContributeToGoal();

  // When a deposit completes the goal, hold the screen for a beat so the tick can land before closing.
  useEffect(() => {
    if (!reached) return;
    const timer = setTimeout(() => router.back(), 900);
    return () => clearTimeout(timer);
  }, [reached, router]);

  if (!goal) {
    return (
      <Screen topInset={false}>
        <Stack.Screen options={{ title: t('contribute.title') }} />
        <ErrorState kind="notFound" title={t('contribute.notFound')} message={t('contribute.notFoundBody')} onRetry={() => router.back()} retryLabel={t('actions.goBack')} />
      </Screen>
    );
  }

  const parsed = parseAmount(amount);
  const value = Number.isFinite(parsed) ? parsed : 0;
  const amountError = value <= 0 ? t('contribute.amountInvalid') : null;
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
      const completes = goal.targetAmount > 0 && goal.currentAmount < goal.targetAmount && goal.currentAmount + value >= goal.targetAmount;
      analytics.track('goal_contribution', { reached: completes });
      notify.success(t('contribute.added', { amount: formatMoney(value), goal: goal.title }));
      if (completes) setReached(true);
      else router.back();
    } catch (e) {
      notify.error(failureMessage(e, t('errors.save')));
    }
  }

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: t('contribute.title') }} />

      <Card tintColor={goal.color} style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text variant="caption" weight="semiBold" color="textSecondary" accessibilityLiveRegion="polite">
              {reached ? t('contribute.reachedLabel') : t('contribute.contributing')}
            </Text>
            <Text variant="title" accessibilityRole="header">
              {goal.title}
            </Text>
          </View>
          {reached ? <SuccessCheck size={40} accessibilityLabel={t('contribute.reachedLabel')} /> : null}
        </View>
        <ProgressBar percent={newPercent} color={goal.color} label={t('contribute.progressLabel', { percent: newPercent, target: formatMoney(goal.targetAmount) })} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <Text variant="caption" numeric color="textSecondary" style={{ flex: 1 }}>
            {t('contribute.savedSoFar', { amount: formatMoney(goal.currentAmount) })}
          </Text>
          <Text variant="caption" weight="semiBold" numeric>
            {value > 0 && newPercent > oldPercent
              ? t('contribute.newTotalGain', { amount: formatMoney(newTotal), percent: newPercent - oldPercent })
              : t('contribute.newTotal', { amount: formatMoney(newTotal) })}
          </Text>
        </View>
      </Card>

      <AmountField
        label={t('contribute.deposit')}
        value={amount}
        onChangeText={setAmount}
        tone="primaryAccent"
        error={submitted ? amountError : null}
        autoFocus
        presets={PRESETS}
        presetsAdd
        onPreset={addPreset}
      />

      <Button title={value > 0 ? t('contribute.addAmount', { amount: formatMoney(value) }) : t('contribute.addMoney')} leftIcon="add" onPress={submit} loading={contribute.isPending} disabled={reached} />
    </Screen>
  );
}
