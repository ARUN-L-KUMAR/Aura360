import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import { ActivityChart } from '@/components/home/activity-chart';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useDashboard, type DashboardTransaction } from '@/features/dashboard/use-dashboard';
import { modules, type ModuleKey } from '@/features/modules';
import { formatDay, formatMoney, greeting } from '@/lib/format';
import { useAuth } from '@/providers/auth';
import { radius, spacing, useTheme } from '@/theme';

const GRID: ModuleKey[] = ['finance', 'fitness', 'food', 'notes', 'saved', 'fashion', 'skincare', 'time'];

export default function HomeScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isPending, isError, error, refetch, isRefetching } = useDashboard();

  const firstName = (data?.profile.name ?? user?.name ?? '').split(' ')[0];
  const net = data ? data.month.income - data.month.expense : 0;

  return (
    <Screen onRefresh={() => refetch()} refreshing={isRefetching}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text muted>{greeting()}</Text>
          <Text variant="title" numberOfLines={1}>
            {firstName || 'Welcome'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          onPress={() => router.push('/settings')}
          hitSlop={8}
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.pill,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      {isError && !data ? (
        <Card style={{ gap: spacing.sm }}>
          <Text variant="heading">Couldn't load your dashboard</Text>
          <Text muted>{error instanceof Error ? error.message : 'Something went wrong.'}</Text>
          <Pressable onPress={() => refetch()} hitSlop={8}>
            <Text style={{ fontWeight: '600' }}>Try again</Text>
          </Pressable>
        </Card>
      ) : null}

      {isPending ? (
        <Card>
          <Text muted>Loading…</Text>
        </Card>
      ) : null}

      {data ? (
        <>
          <Card style={{ gap: spacing.md }}>
            <Text variant="label" muted>
              This month
            </Text>
            <Text variant="title" color={net >= 0 ? 'success' : 'danger'}>
              {formatMoney(net)}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.lg }}>
              <View style={{ flex: 1 }}>
                <Text variant="caption" muted>
                  Income
                </Text>
                <Text variant="heading">{formatMoney(data.month.income, { compact: true })}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="caption" muted>
                  Spent
                </Text>
                <Text variant="heading">{formatMoney(data.month.expense, { compact: true })}</Text>
              </View>
            </View>
          </Card>

          <Card style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text variant="label" muted>
                Last 7 days
              </Text>
              <Text variant="caption" muted>
                {data.totalActivities} entries in total
              </Text>
            </View>
            <ActivityChart data={data.chart} />
          </Card>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {GRID.map((key) => {
              const info = modules[key];
              const count = data.counts[key as keyof typeof data.counts];
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={`${info.label}, ${count} entries`}
                  onPress={() => router.push(info.href as Href)}
                  style={({ pressed }) => ({ width: '47.5%', opacity: pressed ? 0.8 : 1 })}>
                  <Card style={{ gap: spacing.sm }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: radius.md,
                        backgroundColor: `${info.color}22`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Ionicons name={info.icon} size={22} color={info.color} />
                    </View>
                    <Text variant="label">{info.label}</Text>
                    <Text variant="caption" muted>
                      {count} {count === 1 ? 'entry' : 'entries'}
                    </Text>
                  </Card>
                </Pressable>
              );
            })}
          </View>

          <Card style={{ gap: spacing.md }}>
            <Text variant="label" muted>
              Recent transactions
            </Text>
            {data.recentTransactions.length === 0 ? (
              <Text muted>No transactions yet.</Text>
            ) : (
              data.recentTransactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
            )}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function TransactionRow({ tx }: { tx: DashboardTransaction }) {
  const isIncome = tx.type === 'income';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1}>{tx.description}</Text>
        <Text variant="caption" muted>
          {tx.category} · {formatDay(tx.date)}
        </Text>
      </View>
      <Text style={{ fontWeight: '600' }} color={isIncome ? 'success' : 'text'}>
        {isIncome ? '+' : tx.type === 'expense' ? '-' : ''}
        {formatMoney(tx.amount)}
      </Text>
    </View>
  );
}
