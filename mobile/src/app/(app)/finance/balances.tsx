import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useBalances, useSaveBalances } from '@/features/finance/hooks';
import { ApiError } from '@/lib/api';
import { CURRENCY_SYMBOL } from '@/lib/config';
import { formatMoney } from '@/lib/format';
import { moduleColors, radius, spacing, useTheme } from '@/theme';

export default function BalancesScreen() {
  const router = useRouter();
  const { colors, scheme } = useTheme();
  const isDark = scheme === 'dark';
  const { data } = useBalances();
  const save = useSaveBalances();

  const [cash, setCash] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initialCash = data ? String(Number(data.data.find((b) => b.paymentMethod === 'cash')?.currentBalance ?? 0)) : '';
  const initialAccount = data ? String(Number(data.data.find((b) => b.paymentMethod === 'upi')?.currentBalance ?? 0)) : '';

  const activeCash = cash ?? initialCash;
  const activeAccount = account ?? initialAccount;

  const cashVal = Number.parseFloat(activeCash.replace(/,/g, '')) || 0;
  const accountVal = Number.parseFloat(activeAccount.replace(/,/g, '')) || 0;
  const totalLiquid = cashVal + accountVal;

  async function submit() {
    const cashValue = activeCash.trim() ? Number.parseFloat(activeCash.replace(/,/g, '')) : 0;
    const accountValue = activeAccount.trim() ? Number.parseFloat(activeAccount.replace(/,/g, '')) : 0;
    if (!Number.isFinite(cashValue) || !Number.isFinite(accountValue)) return setError('Enter valid amounts.');

    setError(null);
    try {
      await save.mutateAsync({ cash_balance: cashValue, account_balance: accountValue });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save. Try again.');
    }
  }

  return (
    <Screen topInset={false}>
      <Stack.Screen options={{ title: 'Money on hand' }} />

      {/* Hero Total Liquid Assets Card */}
      <GlassCard
        glowColor={moduleColors.finance}
        style={{
          gap: spacing.xs,
          padding: spacing.lg,
          alignItems: 'center',
          backgroundColor: isDark ? 'rgba(18, 26, 36, 0.95)' : '#ffffff',
        }}>
        <Text variant="caption" muted style={{ fontWeight: '700', letterSpacing: 0.8 }}>
          TOTAL LIQUID ASSETS
        </Text>
        <Text
          style={{
            fontSize: 34,
            fontWeight: '800',
            color: moduleColors.finance,
            fontVariant: ['tabular-nums'],
          }}>
          {formatMoney(totalLiquid)}
        </Text>
        <Text variant="caption" muted>
          Cash + Bank & UPI combined
        </Text>
      </GlassCard>

      {/* Inputs in GlassCards */}
      <GlassCard style={{ gap: spacing.md, padding: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons name="wallet-outline" size={18} color={moduleColors.finance} />
            <Text variant="label" muted>
              Physical Cash on Hand ({CURRENCY_SYMBOL})
            </Text>
          </View>
          <Input
            value={activeCash}
            onChangeText={setCash}
            keyboardType="decimal-pad"
            placeholder="0"
            style={{ fontSize: 20, fontWeight: '700' }}
          />
        </View>

        <View style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons name="card-outline" size={18} color={moduleColors.saved} />
            <Text variant="label" muted>
              Bank & UPI Balances ({CURRENCY_SYMBOL})
            </Text>
          </View>
          <Input
            value={activeAccount}
            onChangeText={setAccount}
            keyboardType="decimal-pad"
            placeholder="0"
            style={{ fontSize: 20, fontWeight: '700' }}
          />
        </View>
      </GlassCard>

      {error ? (
        <View
          style={{
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: `${colors.danger}18`,
            borderWidth: 1,
            borderColor: `${colors.danger}40`,
          }}>
          <Text color="danger" style={{ fontWeight: '600' }}>
            {error}
          </Text>
        </View>
      ) : null}

      <Button title="Update Balances" onPress={submit} loading={save.isPending} />
    </Screen>
  );
}
