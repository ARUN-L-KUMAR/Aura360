import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import type { TextInput } from 'react-native';

import { AmountField } from '@/components/finance/amount-field';
import { CategoryPicker } from '@/components/finance/category-picker';
import { CUSTOM_CATEGORY_ICON, PAYMENT_ICONS, categoryIcon } from '@/components/finance/category-icons';
import { failureMessage } from '@/components/finance/failure-message';
import { FormCard, parseAmount } from '@/components/finance/form-parts';
import { categoryLabel, paymentMethodLabel, transactionTypeLabel } from '@/components/finance/labels';
import { NO_DESCRIPTION } from '@/components/finance/transaction-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DateField, toIsoDay } from '@/components/ui/date-field';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { useDeleteTransaction, useSaveTransaction } from '@/features/finance/hooks';
import {
  CATEGORY_OPTIONS,
  PAYMENT_METHODS,
  type EditableTransactionType,
  type PaymentMethod,
  type Transaction,
} from '@/features/finance/types';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
import { useNotify } from '@/providers/notify';
import { spacing, type ThemeColors } from '@/theme';

const TYPE_VALUES: EditableTransactionType[] = ['expense', 'income', 'investment'];

const TYPE_TONE: Record<EditableTransactionType, keyof ThemeColors> = {
  expense: 'errorText',
  income: 'successText',
  investment: 'warningText',
};

const PRESET_AMOUNTS = [100, 500, 1000, 2000, 5000];

const CUSTOM = '__custom__';

function parseTransaction(raw?: string): Transaction | null {
  try {
    return raw ? (JSON.parse(raw) as Transaction) : null;
  } catch {
    return null;
  }
}

export default function TransactionScreen() {
  const router = useRouter();
  const notify = useNotify();
  const { t } = useTranslation('finance');
  const params = useLocalSearchParams<{ tx?: string }>();
  const existing = useMemo(() => parseTransaction(params.tx), [params.tx]);
  const isTransfer = existing?.type === 'transfer';

  const initialType: EditableTransactionType = existing && existing.type !== 'transfer' ? existing.type : 'expense';
  const knownCategory = existing ? CATEGORY_OPTIONS[initialType].includes(existing.category) : false;

  const [type, setType] = useState<EditableTransactionType>(initialType);
  const [amount, setAmount] = useState(existing ? String(Number(existing.amount)) : '');
  const [category, setCategory] = useState(existing ? (knownCategory ? existing.category : CUSTOM) : '');
  const [customCategory, setCustomCategory] = useState(existing && !knownCategory ? existing.category : '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(existing?.paymentMethod ?? 'upi');
  const [description, setDescription] = useState(existing && existing.description !== NO_DESCRIPTION ? existing.description : '');
  const [date, setDate] = useState(existing?.date.slice(0, 10) ?? toIsoDay(new Date()));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [submitted, setSubmitted] = useState(false);

  const descriptionRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);
  const save = useSaveTransaction();
  const remove = useDeleteTransaction();

  const finalCategory = category === CUSTOM ? customCategory.trim() : category;
  const amountValue = parseAmount(amount);
  const amountError = !Number.isFinite(amountValue) || amountValue <= 0 ? t('transaction.amountInvalid') : null;
  const categoryError = finalCategory ? null : category === CUSTOM ? t('transaction.categoryNameNeeded') : t('transaction.categoryNeeded');

  function changeType(next: EditableTransactionType) {
    setType(next);
    if (category !== CUSTOM && !CATEGORY_OPTIONS[next].includes(category)) setCategory('');
  }

  function addPreset(val: number) {
    const cur = Number.isFinite(amountValue) ? amountValue : 0;
    setAmount(String(Math.round((cur + val) * 100) / 100));
  }

  async function submit() {
    setSubmitted(true);
    if (amountError || categoryError) {
      haptics.warning();
      return;
    }

    try {
      await save.mutateAsync({
        id: existing?.id,
        input: {
          type,
          amount: amountValue,
          category: finalCategory,
          paymentMethod,
          description: description.trim(),
          notes: notes.trim() || null,
          date,
        },
      });
      // The event only knows income and expense; investments are not reported until it does.
      if (!existing) analytics.track('transaction_created', { type });
      notify.success(existing ? t('transaction.updated') : t('transaction.added'));
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, t('errors.save')));
    }
  }

  async function confirmDelete() {
    if (!existing) return;
    const description = existing.description === NO_DESCRIPTION ? t('row.noDescription') : existing.description;
    const ok = await notify.confirm({
      title: existing.type === 'transfer' ? t('transaction.deleteTransferTitle') : t('transaction.deleteTitle'),
      message: t('transaction.deleteMessage', { description }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(existing.id);
      notify.success(existing.type === 'transfer' ? t('transaction.transferDeleted') : t('transaction.deleted'));
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, t('errors.delete')));
    }
  }

  if (isTransfer && existing) {
    return (
      <Screen topInset={false}>
        <Stack.Screen options={{ title: t('transaction.titleTransfer') }} />
        <Card style={{ gap: spacing.sm }}>
          <Text variant="title">{existing.description === NO_DESCRIPTION ? t('row.noDescription') : existing.description}</Text>
          <Text color="textSecondary">{t('transaction.transferNote')}</Text>
        </Card>
        <Button title={t('transaction.deleteTransfer')} variant="destructive" leftIcon="trash-outline" onPress={confirmDelete} loading={remove.isPending} />
      </Screen>
    );
  }

  const typeOptions = TYPE_VALUES.map((value) => ({ value, label: transactionTypeLabel(value) }));

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: existing ? t('transaction.titleEdit') : t('transaction.titleNew') }} />

      <Segmented options={typeOptions} value={type} onChange={changeType} accessibilityLabel={t('transaction.typeLabel')} />

      <AmountField
        label={t('transaction.amountLabel', { type: transactionTypeLabel(type) })}
        value={amount}
        onChangeText={setAmount}
        tone={TYPE_TONE[type]}
        error={submitted ? amountError : null}
        autoFocus={!existing}
        presets={PRESET_AMOUNTS}
        presetsAdd
        onPreset={addPreset}
      />

      <FormCard title={t('transaction.category')} icon="pricetag-outline" error={submitted ? categoryError : null}>
        <CategoryPicker
          accessibilityLabel={t('transaction.category')}
          value={category}
          onChange={setCategory}
          options={[
            ...CATEGORY_OPTIONS[type].map((name) => ({ value: name, label: categoryLabel(name), icon: categoryIcon(name) })),
            { value: CUSTOM, label: t('categories.custom'), icon: CUSTOM_CATEGORY_ICON },
          ]}
        />
        {category === CUSTOM ? (
          <Input
            label={t('transaction.customName')}
            value={customCategory}
            onChangeText={setCustomCategory}
            placeholder={t('transaction.customPlaceholder')}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => descriptionRef.current?.focus()}
          />
        ) : null}
      </FormCard>

      <FormCard title={t('transaction.paidWith')} icon="card-outline">
        <CategoryPicker
          accessibilityLabel={t('transaction.paidWith')}
          value={paymentMethod}
          onChange={setPaymentMethod}
          options={PAYMENT_METHODS.map((method) => ({ value: method.value, label: paymentMethodLabel(method.value), icon: PAYMENT_ICONS[method.value] }))}
        />
      </FormCard>

      <FormCard>
        <Input
          ref={descriptionRef}
          label={t('transaction.description')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('transaction.descriptionPlaceholder')}
          autoCapitalize="sentences"
          returnKeyType="next"
          onSubmitEditing={() => notesRef.current?.focus()}
        />
        <DateField label={t('transaction.date')} value={date} onChange={(next) => next && setDate(next)} />
        <Input
          ref={notesRef}
          label={t('transaction.notes')}
          value={notes}
          onChangeText={setNotes}
          multiline
          autoCapitalize="sentences"
          placeholder={t('transaction.notesPlaceholder')}
          style={{ minHeight: 64, textAlignVertical: 'top', paddingTop: spacing.md }}
        />
      </FormCard>

      <Button title={existing ? t('transaction.saveChanges') : t('transaction.add')} onPress={submit} loading={save.isPending} />
      {existing ? <Button title={t('transaction.delete')} variant="destructive" leftIcon="trash-outline" onPress={confirmDelete} loading={remove.isPending} /> : null}
    </Screen>
  );
}
