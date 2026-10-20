import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountField } from '@/components/finance/amount-field';
import { CategoryPicker } from '@/components/finance/category-picker';
import { CUSTOM_CATEGORY_ICON, PAYMENT_ICONS, categoryIcon } from '@/components/finance/category-icons';
import { failureMessage } from '@/components/finance/failure-message';
import { FormCard, FormSection, TypeSwitch, parseAmount } from '@/components/finance/form-parts';
import { categoryLabel, paymentMethodLabel, transactionTypeLabel } from '@/components/finance/labels';
import type { TransactionDraft } from '@/components/finance/receipt';
import { ShareDraftNotice } from '@/components/finance/share-draft-notice';
import { NO_DESCRIPTION } from '@/components/finance/transaction-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DateField, toIsoDay } from '@/components/ui/date-field';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useDeleteTransaction, useSaveTransaction } from '@/features/finance/hooks';
import {
  CATEGORY_OPTIONS,
  PAYMENT_METHODS,
  type EditableTransactionType,
  type PaymentMethod,
  type Transaction,
} from '@/features/finance/types';
import { confirmReasons } from '@/features/share-import/draft';
import { markSaved } from '@/features/share-import/inbox';
import { useTranslation } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { analytics } from '@/lib/telemetry';
import { useNotify } from '@/providers/notify';
import { layout, spacing, useTheme, type ThemeColors } from '@/theme';

const TYPE_VALUES: EditableTransactionType[] = ['expense', 'income', 'investment'];

const TYPE_TONE: Record<EditableTransactionType, keyof ThemeColors> = {
  expense: 'errorText',
  income: 'successText',
  investment: 'warningText',
};

/** Columns of the category grid and of the payment-method row on the sheet. */
const CATEGORY_COLUMNS = 4;
const PAYMENT_COLUMNS = 5;

const PRESET_AMOUNTS = [100, 500, 1000, 2000, 5000];

const CUSTOM = '__custom__';

function parseTransaction(raw?: string): Transaction | null {
  try {
    return raw ? (JSON.parse(raw) as Transaction) : null;
  } catch {
    return null;
  }
}

function parseDraft(raw?: string): TransactionDraft | null {
  try {
    return raw ? (JSON.parse(raw) as TransactionDraft) : null;
  } catch {
    return null;
  }
}

export default function TransactionScreen() {
  const router = useRouter();
  const notify = useNotify();
  const { colors, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('finance');
  const params = useLocalSearchParams<{ tx?: string; draft?: string }>();
  const existing = useMemo(() => parseTransaction(params.tx), [params.tx]);
  // A scanned receipt, or a payment screenshot shared from another app, opens the form filled in (a new transaction,
  // not an edit). Whatever the scan could not find is empty here, and a category it did not find leaves none selected.
  const draft = useMemo(() => (existing ? null : parseDraft(params.draft)), [existing, params.draft]);
  const draftCategory = draft?.category ?? '';
  const draftKnownCategory = draft ? CATEGORY_OPTIONS[draft.type].includes(draftCategory) : false;
  const isTransfer = existing?.type === 'transfer';

  const initialType: EditableTransactionType = existing && existing.type !== 'transfer' ? existing.type : (draft?.type ?? 'expense');
  const knownCategory = existing ? CATEGORY_OPTIONS[initialType].includes(existing.category) : false;

  const [type, setType] = useState<EditableTransactionType>(initialType);
  const [amount, setAmount] = useState(existing ? String(Number(existing.amount)) : draft && draft.amount > 0 ? String(draft.amount) : '');
  const [category, setCategory] = useState(existing ? (knownCategory ? existing.category : CUSTOM) : draft && draftCategory ? (draftKnownCategory ? draftCategory : CUSTOM) : '');
  const [customCategory, setCustomCategory] = useState(existing && !knownCategory ? existing.category : draft && draftCategory && !draftKnownCategory ? draftCategory : '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(existing?.paymentMethod ?? draft?.paymentMethod ?? 'upi');
  const [description, setDescription] = useState(existing && existing.description !== NO_DESCRIPTION ? existing.description : (draft?.description ?? ''));
  const [date, setDate] = useState(existing?.date.slice(0, 10) ?? draft?.date ?? toIsoDay(new Date()));
  const [notes, setNotes] = useState(existing?.notes ?? draft?.notes ?? '');
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

    // A payment read from a screenshot is a claim, not proof: a failed or pending status, or an entry that is probably
    // this same payment, needs an explicit yes before it reaches the ledger.
    if (draft?.share) {
      const unchanged = amountValue === draft.amount && date === (draft.date ?? date);
      const reasons = confirmReasons(draft.share, unchanged);
      if (reasons.length > 0) {
        const ok = await notify.confirm({
          title: t('shareImport.form.confirm.title'),
          message: reasons.map((reason) => t(`shareImport.form.confirm.${reason}`)).join('\n\n'),
          confirmLabel: t('shareImport.form.confirm.action'),
          cancelLabel: t('common.cancel'),
        });
        if (!ok) return;
      }
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
      // Settles the shared screenshot this entry came from, so the import screen moves on to the next one.
      if (draft?.share) markSaved(draft.share.itemId, { amount: amountValue, description: description.trim() });
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

  const typeOptions = TYPE_VALUES.map((value) => ({
    value,
    label: transactionTypeLabel(value),
    tint: value === 'expense' ? colors.error : value === 'income' ? colors.success : colors.warning,
    onTint: value === 'expense' ? colors.onError : value === 'income' ? colors.onSuccess : colors.onWarning,
  }));
  const finance = accent('finance');
  const amountKnown = Number.isFinite(amountValue) && amountValue > 0;
  const saveLabel = existing ? t('transaction.saveChanges') : t(amountKnown ? `transaction.save.${type}With` : `transaction.save.${type}`, { amount: formatMoney(amountValue) });

  return (
    <Screen
      topInset={false}
      contentContainerStyle={{ gap: spacing.xl }}
      footer={
        <View
          style={{
            paddingHorizontal: layout.screenPadding,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}>
          <Button title={saveLabel} size="lg" onPress={submit} loading={save.isPending} />
        </View>
      }>
      <Stack.Screen options={{ title: existing ? t('transaction.titleEdit') : t('transaction.titleNew') }} />

      {draft?.share ? (
        <ShareDraftNotice info={draft.share} />
      ) : draft ? (
        <Text variant="caption" color="textSecondary" accessibilityLiveRegion="polite">
          {t('scan.prefilled')}
        </Text>
      ) : null}

      <TypeSwitch options={typeOptions} value={type} onChange={changeType} accessibilityLabel={t('transaction.typeLabel')} />

      <AmountField
        variant="plain"
        label={t('transaction.amountLabel', { type: transactionTypeLabel(type) })}
        value={amount}
        onChangeText={setAmount}
        tone={TYPE_TONE[type]}
        error={submitted ? amountError : null}
        // A screenshot that was read already has an amount; the keyboard would only cover what there is to check.
        autoFocus={!existing && !(draft?.share && draft.amount > 0)}
        presets={PRESET_AMOUNTS}
        presetsAdd
        onPreset={addPreset}
      />

      <FormSection title={t('transaction.category')} error={submitted ? categoryError : null}>
        <CategoryPicker
          accessibilityLabel={t('transaction.category')}
          value={category}
          onChange={setCategory}
          columns={CATEGORY_COLUMNS}
          tint={{ solid: finance.solid, text: finance.text }}
          options={[
            ...CATEGORY_OPTIONS[type].map((name) => ({ value: name, label: categoryLabel(name), icon: categoryIcon(name) })),
            { value: CUSTOM, label: t('categories.custom'), icon: CUSTOM_CATEGORY_ICON, dashed: true },
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
      </FormSection>

      <FormSection title={t('transaction.paidWith')}>
        <CategoryPicker
          accessibilityLabel={t('transaction.paidWith')}
          value={paymentMethod}
          onChange={setPaymentMethod}
          columns={PAYMENT_COLUMNS}
          tint={{ solid: colors.info, text: colors.infoText }}
          options={PAYMENT_METHODS.map((method) => ({ value: method.value, label: paymentMethodLabel(method.value), icon: PAYMENT_ICONS[method.value] }))}
        />
      </FormSection>

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

      {existing ? <Button title={t('transaction.delete')} variant="destructive" leftIcon="trash-outline" onPress={confirmDelete} loading={remove.isPending} /> : null}
    </Screen>
  );
}
