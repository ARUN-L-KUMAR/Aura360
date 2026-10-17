import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { AmountField } from '@/components/finance/amount-field';
import { failureMessage } from '@/components/finance/failure-message';
import { FormCard, parseAmount } from '@/components/finance/form-parts';
import { categoryLabel } from '@/components/finance/labels';
import { Button } from '@/components/ui/button';
import { Chip, ChipGroup, Tag } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useDeleteBudget, useSaveBudget } from '@/features/finance/hooks';
import { BUDGET_CATEGORIES, OVERALL_BUDGET, type Budget } from '@/features/finance/types';
import { useTranslation } from '@/i18n';
import { monthKey, monthLabel } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
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
  const { t } = useTranslation('finance');
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
  const categoryError = finalCategory ? null : category === CUSTOM ? t('budget.categoryNameNeeded') : t('budget.categoryNeeded');
  const amountError = !Number.isFinite(amountValue) || amountValue <= 0 ? t('budget.amountInvalid') : null;

  async function submit() {
    setSubmitted(true);
    if (categoryError || amountError) {
      haptics.warning();
      return;
    }

    try {
      await save.mutateAsync({ category: finalCategory, amount: amountValue, month, alertThreshold: threshold });
      analytics.track('budget_saved');
      notify.success(existing ? t('budget.updated') : t('budget.saved'));
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, t('errors.save')));
    }
  }

  async function confirmDelete() {
    if (!existing) return;
    const ok = await notify.confirm({
      title: t('budget.deleteTitle'),
      message: isOverallExisting ? t('budget.deleteMessageOverall') : t('budget.deleteMessage', { category: categoryLabel(existing.category) }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(existing.id);
      notify.success(t('budget.deleted'));
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, t('errors.delete')));
    }
  }

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: existing ? t('budget.titleEdit') : t('budget.titleNew') }} />

      <Tag label={monthLabel(month)} icon="calendar-outline" accent="finance" size="md" />

      {existing ? (
        <FormCard title={t('budget.category')} icon="pie-chart-outline">
          <Text variant="title">{isOverallExisting ? t('budgets.overallTitle') : categoryLabel(existing.category)}</Text>
        </FormCard>
      ) : (
        <FormCard title={t('budget.category')} icon="pie-chart-outline" error={submitted ? categoryError : null}>
          <ChipGroup>
            <Chip label={t('categories.overall')} accent="finance" selected={category === OVERALL_BUDGET} onPress={() => setCategory(OVERALL_BUDGET)} />
            {BUDGET_CATEGORIES.map((name) => (
              <Chip key={name} label={categoryLabel(name)} accent="finance" selected={category === name} onPress={() => setCategory(name)} />
            ))}
            <Chip label={t('categories.custom')} icon="create-outline" accent="finance" selected={category === CUSTOM} onPress={() => setCategory(CUSTOM)} />
          </ChipGroup>
          {category === CUSTOM ? (
            <Input
              label={t('budget.customName')}
              value={customCategory}
              onChangeText={setCustomCategory}
              placeholder={t('budget.customPlaceholder')}
              autoCapitalize="words"
              returnKeyType="done"
            />
          ) : null}
        </FormCard>
      )}

      <AmountField
        label={t('budget.limitLabel')}
        value={amount}
        onChangeText={setAmount}
        tone="primaryAccent"
        error={submitted ? amountError : null}
        autoFocus={!existing}
        presets={PRESET_LIMITS}
        onPreset={(limit) => setAmount(String(limit))}
      />

      <FormCard title={t('budget.threshold')} icon="notifications-outline">
        <Text variant="caption" color="textSecondary">
          {t('budget.thresholdHelp')}
        </Text>
        <ChipGroup>
          {THRESHOLDS.map((value) => (
            <Chip key={value} label={`${value}%`} accent="finance" selected={threshold === value} onPress={() => setThreshold(value)} />
          ))}
        </ChipGroup>
      </FormCard>

      <Button title={existing ? t('budget.saveChanges') : t('budget.save')} onPress={submit} loading={save.isPending} />
      {existing ? <Button title={t('budget.delete')} variant="destructive" leftIcon="trash-outline" onPress={confirmDelete} loading={remove.isPending} /> : null}
    </Screen>
  );
}
