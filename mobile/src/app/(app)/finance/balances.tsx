import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';

import { failureMessage } from '@/components/finance/failure-message';
import { FormCard, cleanAmount, parseAmount } from '@/components/finance/form-parts';
import { LoadError, OfflineState, RefreshError } from '@/components/finance/load-error';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { DonutChart } from '@/components/viz/donut-chart';
import { useDonutColors } from '@/components/viz/tones';
import { useBalances, useSaveBalances } from '@/features/finance/hooks';
import { useTranslation } from '@/i18n';
import { CURRENCY_SYMBOL } from '@/lib/config';
import { formatMoney } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useNotify } from '@/providers/notify';
import { radius, spacing, tabularNums, useTheme } from '@/theme';

const SPLIT_SIZE = spacing.xxxl * 2 + spacing.sm;
const SPLIT_THICKNESS = spacing.md;

export default function BalancesScreen() {
  const router = useRouter();
  const notify = useNotify();
  const { t } = useTranslation('finance');
  const { data, isPending, fetchStatus, isError, error, refetch, isRefetching } = useBalances();
  const save = useSaveBalances();
  const { colors } = useTheme();
  const splitColors = useDonutColors(2, 'finance');

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

          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
            {/* Cash against bank and UPI, redrawn as the fields change. */}
            <DonutChart
              segments={[
                { label: t('balances.cash'), value: Math.max(0, Number.isFinite(cashValue) ? cashValue : 0) },
                { label: t('balances.account'), value: Math.max(0, Number.isFinite(accountValue) ? accountValue : 0) },
              ]}
              size={SPLIT_SIZE}
              thickness={SPLIT_THICKNESS}
              accent="finance"
              label={t('balances.splitChart')}>
              <Ionicons name="wallet-outline" size={26} color={colors.textSecondary} />
            </DonutChart>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text variant="overline" color="textMuted">
                {t('balances.total')}
              </Text>
              <Text variant="display" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {formatMoney(totalLiquid)}
              </Text>
              <Text variant="caption" color="textSecondary">
                {t('balances.totalHint')}
              </Text>
              <View style={{ gap: spacing.xs, paddingTop: spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View style={{ width: spacing.sm + 2, height: spacing.sm + 2, borderRadius: radius.pill, backgroundColor: splitColors[0] }} />
                  <Ionicons name="wallet-outline" size={16} color={colors.textSecondary} />
                  <Text variant="caption" numeric style={{ flex: 1 }} numberOfLines={1}>
                    {t('balances.splitCash', { amount: formatMoney(Number.isFinite(cashValue) ? cashValue : 0) })}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View style={{ width: spacing.sm + 2, height: spacing.sm + 2, borderRadius: radius.pill, backgroundColor: splitColors[1] }} />
                  <Ionicons name="card-outline" size={16} color={colors.textSecondary} />
                  <Text variant="caption" numeric style={{ flex: 1 }} numberOfLines={1}>
                    {t('balances.splitAccount', { amount: formatMoney(Number.isFinite(accountValue) ? accountValue : 0) })}
                  </Text>
                </View>
              </View>
            </View>
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
