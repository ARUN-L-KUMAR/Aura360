import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AmountField } from '@/components/finance/amount-field';
import { CategoryPicker } from '@/components/finance/category-picker';
import { PAYMENT_ICONS } from '@/components/finance/category-icons';
import { failureMessage } from '@/components/finance/failure-message';
import { FormCard, parseAmount } from '@/components/finance/form-parts';
import { paymentMethodLabel } from '@/components/finance/labels';
import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { DateField, toIsoDay } from '@/components/ui/date-field';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Toggle } from '@/components/ui/toggle';
import { useDeleteSubscription, useRenewSubscription, useSaveSubscription } from '@/features/finance/hooks';
import {
  BILLING_CYCLES,
  EDITABLE_SUBSCRIPTION_STATUSES,
  PAYMENT_METHODS,
  type BillingCycle,
  type PaymentMethod,
  type Subscription,
  type SubscriptionStatus,
} from '@/features/finance/types';
import { useTranslation } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { spacing } from '@/theme';

const PRESET_AMOUNTS = [99, 199, 499, 999];

function parseSubscription(raw?: string): Subscription | null {
  try {
    return raw ? (JSON.parse(raw) as Subscription) : null;
  } catch {
    return null;
  }
}

/** Add or edit a recurring payment. Editing also offers "mark renewed" (the next billing date moves one cycle) and delete. */
export default function SubscriptionScreen() {
  const router = useRouter();
  const notify = useNotify();
  const { t } = useTranslation('finance');
  const params = useLocalSearchParams<{ sub?: string }>();
  const existing = useMemo(() => parseSubscription(params.sub), [params.sub]);

  const [name, setName] = useState(existing?.name ?? '');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [cycle, setCycle] = useState<BillingCycle>(existing?.billingCycle ?? 'monthly');
  const [nextBilling, setNextBilling] = useState(existing?.nextBillingDate?.slice(0, 10) ?? toIsoDay(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(existing?.paymentMethod ?? 'upi');
  const [category, setCategory] = useState(existing?.category ?? '');
  const [status, setStatus] = useState<SubscriptionStatus>(existing?.status === 'expired' ? 'cancelled' : (existing?.status ?? 'active'));
  const [autoRenew, setAutoRenew] = useState(existing?.autoRenew ?? true);
  const [submitted, setSubmitted] = useState(false);

  const save = useSaveSubscription();
  const renew = useRenewSubscription();
  const remove = useDeleteSubscription();

  const amountValue = parseAmount(amount);
  const nameError = name.trim() ? null : t('subscription.nameInvalid');
  const amountError = !Number.isFinite(amountValue) || amountValue <= 0 ? t('subscription.amountInvalid') : null;

  const statusLabel: Record<SubscriptionStatus, string> = {
    active: t('subscription.statusActive'),
    pending: t('subscription.statusPending'),
    cancelled: t('subscription.statusCancelled'),
    expired: t('subList.ended'),
  };

  async function submit() {
    setSubmitted(true);
    if (nameError || amountError) {
      haptics.warning();
      return;
    }
    try {
      await save.mutateAsync({
        id: existing?.id,
        input: {
          name: name.trim(),
          amount: amountValue,
          billingCycle: cycle,
          nextBillingDate: nextBilling,
          status,
          paymentMethod,
          category: category.trim() || undefined,
          autoRenew,
        },
      });
      notify.success(existing ? t('subscription.updated') : t('subscription.saved'));
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, t('errors.save')));
    }
  }

  async function markRenewed() {
    if (!existing) return;
    try {
      await renew.mutateAsync(existing.id);
      notify.success(t('subList.renewed'));
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, t('errors.update')));
    }
  }

  async function confirmDelete() {
    if (!existing) return;
    const ok = await notify.confirm({
      title: t('subscription.deleteTitle'),
      message: t('subscription.deleteMessage', { name: existing.name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(existing.id);
      notify.success(t('subscription.deleted'));
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, t('errors.delete')));
    }
  }

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: existing ? t('subscription.titleEdit') : t('subscription.titleNew') }} />

      <FormCard>
        <Input
          label={t('subscription.name')}
          value={name}
          onChangeText={setName}
          placeholder={t('subscription.namePlaceholder')}
          autoCapitalize="words"
          autoFocus={!existing}
          returnKeyType="next"
          error={submitted ? nameError : undefined}
        />
      </FormCard>

      <AmountField
        label={t('subscription.amount')}
        value={amount}
        onChangeText={setAmount}
        tone="primaryAccent"
        error={submitted ? amountError : null}
        presets={PRESET_AMOUNTS}
        onPreset={(preset) => setAmount(String(preset))}
      />

      <FormCard title={t('subscription.cycle')} icon="repeat-outline">
        <ChipGroup>
          {BILLING_CYCLES.map((value) => (
            <Chip key={value} label={t(`subList.cycle.${value}`)} accent="finance" selected={cycle === value} onPress={() => setCycle(value)} />
          ))}
        </ChipGroup>
        <DateField label={t('subscription.nextBilling')} value={nextBilling} onChange={(next) => next && setNextBilling(next)} />
      </FormCard>

      <FormCard title={t('subscription.payment')} icon="card-outline">
        <CategoryPicker
          accessibilityLabel={t('subscription.payment')}
          value={paymentMethod}
          onChange={setPaymentMethod}
          options={PAYMENT_METHODS.map((method) => ({ value: method.value, label: paymentMethodLabel(method.value), icon: PAYMENT_ICONS[method.value] }))}
        />
      </FormCard>

      <FormCard>
        <Input label={t('subscription.category')} value={category} onChangeText={setCategory} placeholder={t('subscription.categoryPlaceholder')} autoCapitalize="words" returnKeyType="done" />
        {existing ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" weight="medium">
              {t('subscription.status')}
            </Text>
            <ChipGroup>
              {EDITABLE_SUBSCRIPTION_STATUSES.map((value) => (
                <Chip key={value} label={statusLabel[value]} accent="finance" selected={status === value} onPress={() => setStatus(value)} />
              ))}
            </ChipGroup>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="label" weight="medium">
              {t('subscription.autoRenew')}
            </Text>
            <Text variant="caption" color="textSecondary">
              {t('subscription.autoRenewHelp')}
            </Text>
          </View>
          <Toggle value={autoRenew} onValueChange={setAutoRenew} accent="finance" accessibilityLabel={t('subscription.autoRenew')} />
        </View>
      </FormCard>

      <Button title={existing ? t('subscription.saveChanges') : t('subscription.save')} onPress={submit} loading={save.isPending} />
      {existing && existing.status === 'active' ? (
        <Button title={t('subList.renew')} variant="secondary" leftIcon="checkmark-done-outline" onPress={markRenewed} loading={renew.isPending} accessibilityHint={t('subList.renewHint')} />
      ) : null}
      {existing ? <Button title={t('subscription.delete')} variant="destructive" leftIcon="trash-outline" onPress={confirmDelete} loading={remove.isPending} /> : null}
    </Screen>
  );
}
