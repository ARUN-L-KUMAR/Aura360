import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import type { TextInput } from 'react-native';

import { FormCard, cleanAmount, failureMessage, parseAmount } from '@/components/finance/form-parts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useBalances, useSaveBalances } from '@/features/finance/hooks';
import { CURRENCY_SYMBOL } from '@/lib/config';
import { formatMoney } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { spacing, tabularNums } from '@/theme';

export default function BalancesScreen() {
  const router = useRouter();
  const notify = useNotify();
  const { data, isPending, isError, error, refetch, isRefetching } = useBalances();
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
  const cashError = Number.isFinite(cashValue) ? null : 'Enter a valid amount.';
  const accountError = Number.isFinite(accountValue) ? null : 'Enter a valid amount.';
  const totalLiquid = (Number.isFinite(cashValue) ? cashValue : 0) + (Number.isFinite(accountValue) ? accountValue : 0);

  async function submit() {
    setSubmitted(true);
    if (cashError || accountError) {
      haptics.warning();
      return;
    }

    try {
      await save.mutateAsync({ cash_balance: cashValue, account_balance: accountValue });
      notify.success('Balances updated');
      router.back();
    } catch (e) {
      notify.error(failureMessage(e, 'Could not save. Try again.'));
    }
  }

  const symbol = (
    <Text variant="body" color="textSecondary">
      {CURRENCY_SYMBOL}
    </Text>
  );

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: 'Money on hand' }} />

      {isPending ? (
        <>
          <SkeletonCard lines={1} />
          <SkeletonCard lines={2} />
        </>
      ) : isError && !data ? (
        <ErrorState error={error} title="Couldn't load your balances" onRetry={() => refetch()} retrying={isRefetching} />
      ) : (
        <>
          <Card variant="tinted" accent="finance" style={{ alignItems: 'center', gap: spacing.xs }}>
            <Text variant="caption" weight="semiBold" color="textSecondary">
              Total money on hand
            </Text>
            <Text variant="display" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {formatMoney(totalLiquid)}
            </Text>
            <Text variant="caption" color="textSecondary">
              Cash plus bank and UPI balances
            </Text>
          </Card>

          <FormCard>
            <Input
              label="Cash in hand"
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
              label="Bank and UPI balance"
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

          <Button title="Update balances" onPress={submit} loading={save.isPending} />
        </>
      )}
    </Screen>
  );
}
