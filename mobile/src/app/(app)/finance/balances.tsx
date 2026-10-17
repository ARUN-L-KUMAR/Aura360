import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import type { TextInput } from 'react-native';

import { failureMessage } from '@/components/finance/failure-message';
import { FormCard, cleanAmount, parseAmount } from '@/components/finance/form-parts';
import { LoadError, OfflineState, RefreshError } from '@/components/finance/load-error';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBalances, useSaveBalances } from '@/features/finance/hooks';
import { useTranslation } from '@/i18n';
import { CURRENCY_SYMBOL } from '@/lib/config';
import { formatMoney } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { spacing, tabularNums } from '@/theme';

export default function BalancesScreen() {
  const router = useRouter();
  const notify = useNotify();
  const { t } = useTranslation('finance');
  const { data, isPending, fetchStatus, isError, error, refetch, isRefetching } = useBalances();
  const save = useSaveBalances();

  const [cash, setCash] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const accountRef = useRef<TextInput>(null);

  const initialCash = data ? String(Number(data.data.find((b) => b.paymentMethod === 'cash')?.currentBalance ?? 0)) : '';
  const initialAccount = data ? String(Number(data.data.find((b) => b.paymentMethod === 'upi')?.currentBalance ?? 0)) : '';

  const activeCash = cash ?? initialCash;
  const activeAccount = account ?? initialAccount;

  // An empty field means zero; anything else must be a number.
  const cashValue = activeCash.trim() ? parseAmount(activeCash) : 0;
  const accountValue = activeAccount.trim() ? parseAmount(activeAccount) : 0;
  const cashError = Number.isFinite(cashValue) ? null : t('balances.invalid');
  const accountError = Number.isFinite(accountValue) ? null : t('balances.invalid');
  const totalLiquid = (Number.isFinite(cashValue) ? cashValue : 0) + (Number.isFinite(accountValue) ? accountValue : 0);
  const offline = isPending && fetchStatus === 'paused';

  async function submit() {
    setSubmitted(true);
    if (cashError || accountError) {
      haptics.warning();
      return;
    }

    try {
      await save.mutateAsync({ cash_balance: cashValue, account_balance: accountValue });
      notify.success(t('balances.updated'));
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, t('errors.save')));
    }
  }

  const symbol = (
    <Text variant="body" color="textSecondary" accessibilityElementsHidden importantForAccessibility="no">
      {CURRENCY_SYMBOL}
    </Text>
  );

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: t('balances.title') }} />

      {isPending && !offline ? (
        <>
          <SkeletonCard lines={1} />
          <SkeletonCard lines={2} />
        </>
      ) : offline ? (
        <OfflineState description={t('offline.finance')} onRetry={() => void refetch()} />
      ) : isError && !data ? (
        <LoadError error={error} title={t('balances.error')} onRetry={() => void refetch()} retrying={isRefetching} />
      ) : (
        <>
          {isError ? <RefreshError error={error} onRetry={() => void refetch()} retrying={isRefetching} /> : null}

          <Card variant="tinted" accent="finance" style={{ alignItems: 'center', gap: spacing.xs }}>
            <Text variant="caption" weight="semiBold" color="textSecondary">
              {t('balances.total')}
            </Text>
            <Text variant="display" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {formatMoney(totalLiquid)}
            </Text>
            <Text variant="caption" color="textSecondary">
              {t('balances.totalHint')}
            </Text>
          </Card>

          <FormCard>
            <Input
              label={t('balances.cash')}
              value={activeCash}
              onChangeText={(text) => setCash(cleanAmount(text))}
              leftIcon="wallet-outline"
              leftAdornment={symbol}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="0"
              returnKeyType="next"
              style={{ fontVariant: tabularNums }}
              error={submitted ? cashError : null}
              onSubmitEditing={() => accountRef.current?.focus()}
            />
            <Input
              ref={accountRef}
              label={t('balances.account')}
              value={activeAccount}
              onChangeText={(text) => setAccount(cleanAmount(text))}
              leftIcon="card-outline"
              leftAdornment={symbol}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="0"
              returnKeyType="done"
              style={{ fontVariant: tabularNums }}
              error={submitted ? accountError : null}
              onSubmitEditing={submit}
            />
          </FormCard>

          <Button title={t('balances.update')} onPress={submit} loading={save.isPending} />
        </>
      )}
    </Screen>
  );
}
