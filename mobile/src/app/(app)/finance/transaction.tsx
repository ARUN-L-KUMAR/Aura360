import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import type { TextInput } from 'react-native';

import { AmountField } from '@/components/finance/amount-field';
import { FormCard, failureMessage, parseAmount } from '@/components/finance/form-parts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup } from '@/components/ui/chip';
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
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { spacing, type ThemeColors } from '@/theme';

const TYPE_OPTIONS: { value: EditableTransactionType; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'investment', label: 'Investment' },
];

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
  const [description, setDescription] = useState(existing && existing.description !== 'No description' ? existing.description : '');
  const [date, setDate] = useState(existing?.date.slice(0, 10) ?? toIsoDay(new Date()));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [submitted, setSubmitted] = useState(false);

  const descriptionRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);
  const save = useSaveTransaction();
  const remove = useDeleteTransaction();

  const finalCategory = category === CUSTOM ? customCategory.trim() : category;
  const amountValue = parseAmount(amount);
  const amountError = !Number.isFinite(amountValue) || amountValue <= 0 ? 'Enter an amount greater than 0.' : null;
  const categoryError = finalCategory ? null : category === CUSTOM ? 'Enter a category name.' : 'Choose a category.';

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
      notify.success(existing ? 'Transaction updated' : 'Transaction added');
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, 'Could not save. Try again.'));
    }
  }

  async function confirmDelete() {
    if (!existing) return;
    const ok = await notify.confirm({
      title: existing.type === 'transfer' ? 'Delete transfer?' : 'Delete transaction?',
      message: `${existing.description} will be removed.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(existing.id);
      notify.success(existing.type === 'transfer' ? 'Transfer deleted' : 'Transaction deleted');
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, 'Could not delete. Try again.'));
    }
  }

  if (isTransfer && existing) {
    return (
      <Screen topInset={false}>
        <Stack.Screen options={{ title: 'Transfer' }} />
        <Card style={{ gap: spacing.sm }}>
          <Text variant="title">{existing.description}</Text>
          <Text color="textSecondary">Transfers between accounts can only be deleted here.</Text>
        </Card>
        <Button title="Delete transfer" variant="destructive" leftIcon="trash-outline" onPress={confirmDelete} loading={remove.isPending} />
      </Screen>
    );
  }

  const typeLabel = TYPE_OPTIONS.find((o) => o.value === type)?.label ?? 'Amount';

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: existing ? 'Edit transaction' : 'New transaction' }} />

      <Segmented options={TYPE_OPTIONS} value={type} onChange={changeType} accessibilityLabel="Transaction type" />

      <AmountField
        label={`${typeLabel} amount`}
        value={amount}
        onChangeText={setAmount}
        tone={TYPE_TONE[type]}
        error={submitted ? amountError : null}
        autoFocus={!existing}
        presets={PRESET_AMOUNTS}
        presetsAdd
        onPreset={addPreset}
      />

      <FormCard title="Category" icon="pricetag-outline" error={submitted ? categoryError : null}>
        <ChipGroup>
          {CATEGORY_OPTIONS[type].map((name) => (
            <Chip key={name} label={name} accent="finance" selected={category === name} onPress={() => setCategory(name)} />
          ))}
          <Chip label="Custom" icon="create-outline" accent="finance" selected={category === CUSTOM} onPress={() => setCategory(CUSTOM)} />
        </ChipGroup>
        {category === CUSTOM ? (
          <Input
            label="Category name"
            value={customCategory}
            onChangeText={setCustomCategory}
            placeholder="e.g. Pet care"
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => descriptionRef.current?.focus()}
          />
        ) : null}
      </FormCard>

      <FormCard title="Paid with" icon="card-outline">
        <ChipGroup>
          {PAYMENT_METHODS.map((method) => (
            <Chip key={method.value} label={method.label} accent="finance" selected={paymentMethod === method.value} onPress={() => setPaymentMethod(method.value)} />
          ))}
        </ChipGroup>
      </FormCard>

      <FormCard>
        <Input
          ref={descriptionRef}
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What was this for?"
          autoCapitalize="sentences"
          returnKeyType="next"
          onSubmitEditing={() => notesRef.current?.focus()}
        />
        <DateField label="Date" value={date} onChange={(next) => next && setDate(next)} />
        <Input
          ref={notesRef}
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          autoCapitalize="sentences"
          placeholder="Add any extra details"
          style={{ minHeight: 64, textAlignVertical: 'top', paddingTop: spacing.md }}
        />
      </FormCard>

      <Button title={existing ? 'Save changes' : 'Add transaction'} onPress={submit} loading={save.isPending} />
      {existing ? <Button title="Delete transaction" variant="destructive" leftIcon="trash-outline" onPress={confirmDelete} loading={remove.isPending} /> : null}
    </Screen>
  );
}
