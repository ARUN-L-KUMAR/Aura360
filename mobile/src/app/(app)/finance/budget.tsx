import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { AmountField } from '@/components/finance/amount-field';
import { FormCard, failureMessage, parseAmount } from '@/components/finance/form-parts';
import { Button } from '@/components/ui/button';
import { Chip, ChipGroup, Tag } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useDeleteBudget, useSaveBudget } from '@/features/finance/hooks';
import { BUDGET_CATEGORIES, OVERALL_BUDGET, type Budget } from '@/features/finance/types';
import { monthKey, monthLabel } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';

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
  const notify = useNotify();
  const params = useLocalSearchParams<{ budget?: string; month?: string }>();
  const existing = useMemo(() => parseBudget(params.budget), [params.budget]);
  const month = params.month || monthKey();

  const isOverallExisting = existing?.category === OVERALL_BUDGET;
  const [category, setCategory] = useState(existing ? existing.category : '');
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [threshold, setThreshold] = useState(existing?.alertThreshold ?? 80);
  const [submitted, setSubmitted] = useState(false);

  const save = useSaveBudget();
  const remove = useDeleteBudget();

  const finalCategory = category === CUSTOM ? customCategory.trim() : category;
  const amountValue = parseAmount(amount);
  const categoryError = finalCategory ? null : category === CUSTOM ? 'Enter a category name.' : 'Choose a category.';
  const amountError = !Number.isFinite(amountValue) || amountValue <= 0 ? 'Enter a budget greater than 0.' : null;

  async function submit() {
    setSubmitted(true);
    if (categoryError || amountError) {
      haptics.warning();
      return;
    }

    try {
      await save.mutateAsync({ category: finalCategory, amount: amountValue, month, alertThreshold: threshold });
      notify.success(existing ? 'Budget updated' : 'Budget saved');
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, 'Could not save. Try again.'));
    }
  }

  async function confirmDelete() {
    if (!existing) return;
    const ok = await notify.confirm({
      title: 'Delete budget?',
      message: `The ${isOverallExisting ? 'overall' : existing.category} budget will be removed.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(existing.id);
      notify.success('Budget deleted');
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, 'Could not delete. Try again.'));
    }
  }

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: existing ? 'Edit budget' : 'New budget' }} />

      <Tag label={monthLabel(month)} icon="calendar-outline" accent="finance" size="md" />

      {existing ? (
        <FormCard title="Category" icon="pie-chart-outline">
          <Text variant="title">{isOverallExisting ? 'Overall monthly budget' : existing.category}</Text>
        </FormCard>
      ) : (
        <FormCard title="Category" icon="pie-chart-outline" error={submitted ? categoryError : null}>
          <ChipGroup>
            <Chip label="Overall" accent="finance" selected={category === OVERALL_BUDGET} onPress={() => setCategory(OVERALL_BUDGET)} />
            {BUDGET_CATEGORIES.map((name) => (
              <Chip key={name} label={name} accent="finance" selected={category === name} onPress={() => setCategory(name)} />
            ))}
            <Chip label="Custom" icon="create-outline" accent="finance" selected={category === CUSTOM} onPress={() => setCategory(CUSTOM)} />
          </ChipGroup>
          {category === CUSTOM ? (
            <Input label="Category name" value={customCategory} onChangeText={setCustomCategory} placeholder="e.g. Pet care" autoCapitalize="words" returnKeyType="done" />
          ) : null}
        </FormCard>
      )}

      <AmountField
        label="Monthly spending limit"
        value={amount}
        onChangeText={setAmount}
        tone="primaryAccent"
        error={submitted ? amountError : null}
        autoFocus={!existing}
        presets={PRESET_LIMITS}
        onPreset={(limit) => setAmount(String(limit))}
      />

      <FormCard title="Alert threshold" icon="notifications-outline">
        <Text variant="caption" color="textSecondary">
          Aura will notify you when spending reaches this share of your limit.
        </Text>
        <ChipGroup>
          {THRESHOLDS.map((value) => (
            <Chip key={value} label={`${value}%`} accent="finance" selected={threshold === value} onPress={() => setThreshold(value)} />
          ))}
        </ChipGroup>
      </FormCard>

      <Button title={existing ? 'Save budget changes' : 'Save budget'} onPress={submit} loading={save.isPending} />
      {existing ? <Button title="Delete budget" variant="destructive" leftIcon="trash-outline" onPress={confirmDelete} loading={remove.isPending} /> : null}
    </Screen>
  );
}
