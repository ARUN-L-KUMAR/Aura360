import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActivityChart } from '@/components/home/activity-chart';
import { GlassCard } from '@/components/ui/glass-card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useDashboard, type DashboardTransaction } from '@/features/dashboard/use-dashboard';
import { modules, type ModuleKey } from '@/features/modules';
import { useUnreadCount } from '@/features/notifications/hooks';
import { formatDay, formatMoney, greeting } from '@/lib/format';
import { useAuth } from '@/providers/auth';
import { radius, spacing, useTheme } from '@/theme';

const GRID: ModuleKey[] = ['notes', 'finance', 'fitness', 'food', 'saved', 'fashion', 'skincare', 'time'];

export default function HomeScreen() {
  const { user } = useAuth();
  const { colors, scheme, toggleTheme } = useTheme();
  const router = useRouter();
  const { data, isPending, isError, error, refetch, isRefetching } = useDashboard();
  const { data: unread = 0 } = useUnreadCount();
  const [chartFilter, setChartFilter] = useState<'weekly' | 'monthly'>('weekly');

  const firstName = (data?.profile.name ?? user?.name ?? '').split(' ')[0];

  const statCards = data
    ? [
        {
          label: 'TOTAL ACTIVITIES',
          val: data.totalActivities,
          icon: 'pulse-outline' as const,
          color: '#3b82f6',
          trend: '+12%',
          trendUp: true,
        },
        {
          label: 'FINANCE LOGS',
          val: data.counts.finance,
          icon: 'wallet-outline' as const,
          color: '#10b981',
          trend: '+5%',
          trendUp: true,
          href: '/finance',
        },
        {
          label: 'FITNESS SESSIONS',
          val: data.counts.fitness,
          icon: 'barbell-outline' as const,
          color: '#8b5cf6',
          trend: '-2%',
          trendUp: false,
          href: '/fitness',
        },
        {
          label: 'MEALS TRACKED',
          val: data.counts.food,
          icon: 'restaurant-outline' as const,
          color: '#f97316',
          trend: '+8%',
          trendUp: true,
          href: '/food',
        },
      ]
    : [];

  const activeModulesCount = data
    ? GRID.filter((key) => (data.counts[key as keyof typeof data.counts] ?? 0) > 0).length
    : 0;

  return (
    <Screen onRefresh={() => refetch()} refreshing={isRefetching}>
      {/* Top Brand Header */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <View style={[styles.brandDot, { backgroundColor: '#38bdf8' }]} />
          <Text variant="caption" muted style={styles.brandText}>
            AURA 360
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
            onPress={() => router.push('/notifications' as Href)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: colors.accent,
                opacity: pressed ? 0.75 : 1,
                transform: [{ scale: pressed ? 0.92 : 1 }],
              },
            ]}>
            <Ionicons name={unread > 0 ? 'notifications' : 'notifications-outline'} size={19} color={colors.text} />
            {unread > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: -3,
                  right: -3,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  paddingHorizontal: 4,
                  backgroundColor: colors.danger,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text variant="caption" style={{ color: '#ffffff', fontSize: 10, lineHeight: 12, fontWeight: '700' }}>
                  {unread > 9 ? '9+' : unread}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${scheme === 'dark' ? 'light' : 'dark'} mode`}
            onPress={toggleTheme}
            hitSlop={8}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: colors.accent,
                opacity: pressed ? 0.75 : 1,
                transform: [{ scale: pressed ? 0.92 : 1 }],
              },
            ]}>
            <Ionicons name={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'} size={19} color={colors.text} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={() => router.push('/settings')}
            hitSlop={8}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: colors.accent,
                opacity: pressed ? 0.75 : 1,
                transform: [{ scale: pressed ? 0.92 : 1 }],
              },
            ]}>
            <Ionicons name="settings-outline" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Error state */}
      {isError && !data ? (
        <GlassCard style={{ gap: spacing.sm }}>
          <Text variant="heading">{"Couldn't load your dashboard"}</Text>
          <Text muted>{error instanceof Error ? error.message : 'Something went wrong.'}</Text>
          <Pressable onPress={() => refetch()} hitSlop={8}>
            <Text style={{ fontWeight: '600' }}>Try again</Text>
          </Pressable>
        </GlassCard>
      ) : null}

      {/* Loading placeholder */}
      {isPending ? (
        <GlassCard>
          <Text muted>Loading dashboard…</Text>
        </GlassCard>
      ) : null}

      {data ? (
        <>
          {/* Hero Welcome Card (Matches Web Slate-900 Card) */}
          <View style={styles.heroCard}>
            {/* Ambient Background Glow Circles */}
            <View style={styles.heroGlowTop} />
            <View style={styles.heroGlowBottom} />

            <View style={{ gap: spacing.md, zIndex: 1 }}>
              {/* Greeting Badge */}
              <View style={styles.greetingBadge}>
                <Ionicons name="flash" size={12} color="#facc15" />
                <Text style={styles.greetingText}>
                  {greeting().toUpperCase()}
                </Text>
              </View>

              {/* Title & Subtitle */}
              <View style={{ gap: 4 }}>
                <Text style={styles.heroTitlePrefix}>Welcome back,</Text>
                <Text style={styles.heroTitleName}>
                  {firstName || 'there'}
                </Text>
                <Text style={styles.heroSubtitle}>
                  You've completed {data.totalActivities} activities this month. Keep up the great momentum!
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.heroActionsRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Create new note"
                  onPress={() => router.push('/notes/edit')}
                  style={({ pressed }) => [
                    styles.primaryHeroBtn,
                    { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                  ]}>
                  <Ionicons name="add" size={18} color="#ffffff" />
                  <Text style={styles.primaryHeroBtnText}>New Note</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add transaction"
                  onPress={() => router.push('/finance/transaction')}
                  style={({ pressed }) => [
                    styles.secondaryHeroBtn,
                    { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                  ]}>
                  <Ionicons name="wallet-outline" size={17} color="#ffffff" />
                  <Text style={styles.secondaryHeroBtnText}>Transaction</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* 4 Stats Cards (Matches Web 4-card metric row) */}
          <View style={styles.statsGrid}>
            {statCards.map((stat, i) => (
              <Pressable
                key={i}
                disabled={!stat.href}
                onPress={() => stat.href && router.push(stat.href as Href)}
                style={({ pressed }) => [
                  styles.statCardWrapper,
                  {
                    opacity: pressed && stat.href ? 0.85 : 1,
                    transform: [{ scale: pressed && stat.href ? 0.97 : 1 }],
                  },
                ]}>
                <GlassCard glowColor={stat.color} style={styles.statCard}>
                  <View style={styles.statCardHeader}>
                    <View style={[styles.statIconBox, { backgroundColor: `${stat.color}1c` }]}>
                      <Ionicons name={stat.icon} size={18} color={stat.color} />
                    </View>
                    <View
                      style={[
                        styles.trendPill,
                        {
                          backgroundColor: stat.trendUp ? '#10b98118' : '#ef444418',
                        },
                      ]}>
                      <Ionicons
                        name={stat.trendUp ? 'trending-up' : 'trending-down'}
                        size={11}
                        color={stat.trendUp ? '#10b981' : '#ef4444'}
                      />
                      <Text
                        variant="caption"
                        style={[
                          styles.trendText,
                          { color: stat.trendUp ? '#10b981' : '#ef4444' },
                        ]}>
                        {stat.trend}
                      </Text>
                    </View>
                  </View>

                  <View style={{ gap: 2, marginTop: 4 }}>
                    <Text variant="caption" muted style={styles.statLabel}>
                      {stat.label}
                    </Text>
                    <Text variant="title" style={styles.statVal}>
                      {stat.val}
                    </Text>
                  </View>
                </GlassCard>
              </Pressable>
            ))}
          </View>

          {/* Activity Overview (Matches Web Chart Section) */}
          <GlassCard style={{ gap: spacing.md }}>
            <View style={styles.chartHeader}>
              <View style={{ gap: 2, flex: 1 }}>
                <Text variant="heading" style={{ fontSize: 18, fontWeight: '700' }}>
                  Activity Overview
                </Text>
                <Text variant="caption" muted>
                  Daily activity count for the last 7 days
                </Text>
              </View>

              {/* Weekly / Monthly Filter Toggle */}
              <View style={[styles.filterToggle, { backgroundColor: colors.accent }]}>
                <Pressable
                  onPress={() => setChartFilter('weekly')}
                  style={[
                    styles.toggleBtn,
                    chartFilter === 'weekly' && [
                      styles.toggleBtnActive,
                      { backgroundColor: colors.card },
                    ],
                  ]}>
                  <Text
                    variant="caption"
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: chartFilter === 'weekly' ? colors.text : colors.textMuted,
                    }}>
                    WEEKLY
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setChartFilter('monthly')}
                  style={[
                    styles.toggleBtn,
                    chartFilter === 'monthly' && [
                      styles.toggleBtnActive,
                      { backgroundColor: colors.card },
                    ],
                  ]}>
                  <Text
                    variant="caption"
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: chartFilter === 'monthly' ? colors.text : colors.textMuted,
                    }}>
                    MONTHLY
                  </Text>
                </Pressable>
              </View>
            </View>

            <ActivityChart data={data.chart} />
          </GlassCard>

          {/* Your Modules (Matches Web Rich Module Grid) */}
          <View style={{ gap: spacing.sm }}>
            <View style={styles.sectionTitleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="grid-outline" size={18} color={colors.primary} />
                <Text variant="heading" style={{ fontSize: 18, fontWeight: '700' }}>
                  Your Modules
                </Text>
              </View>
              <View style={[styles.activeModulesBadge, { backgroundColor: `${colors.primary}18` }]}>
                <Text variant="caption" style={{ color: colors.primary, fontWeight: '800', fontSize: 10, letterSpacing: 0.8 }}>
                  {activeModulesCount} ACTIVE
                </Text>
              </View>
            </View>

            <View style={styles.moduleGrid}>
              {GRID.map((key) => {
                const info = modules[key];
                const count = data.counts[key as keyof typeof data.counts] ?? 0;
                const isActive = count > 0;

                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={`${info.label}, ${count} entries`}
                    onPress={() => router.push(info.href as Href)}
                    style={({ pressed }) => [
                      styles.moduleGridItem,
                      {
                        opacity: pressed ? 0.85 : 1,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      },
                    ]}>
                    <GlassCard glowColor={info.color} style={styles.richModuleCard}>
                      {/* Top row: Icon + Count badge */}
                      <View style={styles.moduleCardTop}>
                        <View style={[styles.moduleIconBox, { backgroundColor: `${info.color}1c` }]}>
                          <Ionicons name={info.icon} size={20} color={info.color} />
                        </View>
                        {isActive ? (
                          <View style={[styles.moduleCountBadge, { backgroundColor: info.color }]}>
                            <Text style={styles.moduleCountText}>{count}</Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Middle: Title & Description */}
                      <View style={{ gap: 3 }}>
                        <Text variant="label" style={{ fontWeight: '700', fontSize: 15 }} numberOfLines={1}>
                          {info.label}
                        </Text>
                        <Text variant="caption" muted numberOfLines={2} style={styles.moduleDesc}>
                          {info.description}
                        </Text>
                      </View>

                      {/* Bottom: "GO TO MODULE" + Chevron */}
                      <View style={styles.moduleCardBottom}>
                        <Text variant="caption" muted style={styles.goToModuleText}>
                          GO TO MODULE
                        </Text>
                        <View style={[styles.chevronCircle, { backgroundColor: colors.accent }]}>
                          <Ionicons name="chevron-forward" size={12} color={colors.text} />
                        </View>
                      </View>
                    </GlassCard>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Recent Activity (Matches Web Recent Activity Card) */}
          <GlassCard style={{ gap: spacing.md }}>
            <View style={styles.sectionTitleRow}>
              <View style={{ gap: 1 }}>
                <Text variant="caption" muted style={styles.sectionCapsLabel}>
                  RECENT ACTIVITY
                </Text>
                <Text variant="heading" style={{ fontSize: 17, fontWeight: '700' }}>
                  Transactions
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/finance')}
                hitSlop={8}
                style={styles.viewAllRow}>
                <Text variant="caption" style={{ color: modules.finance.color, fontWeight: '700' }}>
                  View All
                </Text>
                <Ionicons name="chevron-forward" size={14} color={modules.finance.color} />
              </Pressable>
            </View>

            {data.recentTransactions.length === 0 ? (
              <View style={styles.emptyActivityBox}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.accent }]}>
                  <Ionicons name="pulse-outline" size={24} color={colors.textMuted} />
                </View>
                <Text style={{ fontWeight: '600', fontSize: 13, color: colors.textMuted }}>
                  No recent activity
                </Text>
                <Text variant="caption" muted style={{ textAlign: 'center' }}>
                  Your latest logs will appear here
                </Text>
                <Pressable
                  onPress={() => router.push('/finance/transaction')}
                  style={[styles.emptyAddBtn, { borderColor: colors.border }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>
                    ADD ENTRY
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: spacing.sm }}>
                {data.recentTransactions.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </View>
            )}
          </GlassCard>

          {/* Shortcuts (Matches Web Shortcuts section) */}
          <GlassCard style={{ gap: spacing.sm }}>
            <Text variant="caption" muted style={styles.sectionCapsLabel}>
              SHORTCUTS
            </Text>
            <View style={{ gap: spacing.xs }}>
              {[
                {
                  label: 'Daily Targets',
                  href: '/fitness',
                  icon: 'flag-outline' as const,
                  color: '#8b5cf6',
                  bgColor: '#8b5cf618',
                },
                {
                  label: 'Health Insights',
                  href: '/food',
                  icon: 'trending-up-outline' as const,
                  color: '#3b82f6',
                  bgColor: '#3b82f618',
                },
                {
                  label: 'Smart Search',
                  href: '/ai',
                  icon: 'sparkles-outline' as const,
                  color: '#10b981',
                  bgColor: '#10b98118',
                },
              ].map((shortcut) => (
                <Pressable
                  key={shortcut.label}
                  accessibilityRole="button"
                  onPress={() => router.push(shortcut.href as Href)}
                  style={({ pressed }) => [
                    styles.shortcutRow,
                    {
                      backgroundColor: pressed ? colors.accent : 'transparent',
                    },
                  ]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <View style={[styles.shortcutIconBox, { backgroundColor: shortcut.bgColor }]}>
                      <Ionicons name={shortcut.icon} size={17} color={shortcut.color} />
                    </View>
                    <Text style={{ fontWeight: '600', fontSize: 14 }}>
                      {shortcut.label}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward-outline" size={15} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          </GlassCard>
        </>
      ) : null}
    </Screen>
  );
}

function TransactionRow({ tx }: { tx: DashboardTransaction }) {
  const { colors } = useTheme();
  const isIncome = tx.type === 'income';

  return (
    <View style={styles.txRow}>
      <View
        style={[
          styles.txIconBox,
          {
            backgroundColor: isIncome ? '#10b98118' : '#ef444418',
          },
        ]}>
        <Ionicons
          name={isIncome ? 'arrow-down-outline' : 'arrow-up-outline'}
          size={16}
          color={isIncome ? '#10b981' : '#ef4444'}
        />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text numberOfLines={1} style={{ fontWeight: '600', fontSize: 14 }}>
          {tx.description || tx.category}
        </Text>
        <Text variant="caption" muted>
          {tx.category} · {formatDay(tx.date)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text
          style={{ fontWeight: '700', fontSize: 14 }}
          color={isIncome ? 'success' : 'danger'}>
          {isIncome ? '+' : '-'}{formatMoney(tx.amount)}
        </Text>
        <Text variant="caption" muted style={styles.txTypeBadge}>
          {tx.type.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  brandText: {
    fontWeight: '800',
    letterSpacing: 1.4,
    fontSize: 11,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Hero Section */
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroGlowTop: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
  },
  heroGlowBottom: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  greetingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  greetingText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#ffffff',
  },
  heroTitlePrefix: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 28,
  },
  heroTitleName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#38bdf8',
    lineHeight: 34,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
    lineHeight: 19,
    marginTop: 4,
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  primaryHeroBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: radius.md,
    shadowColor: '#2563eb',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryHeroBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  secondaryHeroBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  secondaryHeroBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },

  /* 4 Stat Cards Grid */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCardWrapper: {
    width: '47.8%',
  },
  statCard: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  statVal: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },

  /* Activity Chart */
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  filterToggle: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.sm,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm - 2,
  },
  toggleBtnActive: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  /* Modules Section */
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeModulesBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  moduleGridItem: {
    width: '47.8%',
  },
  richModuleCard: {
    padding: spacing.md,
    gap: spacing.sm,
    minHeight: 146,
    justifyContent: 'space-between',
  },
  moduleCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moduleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleCountBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleCountText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  moduleDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  moduleCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  goToModuleText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  chevronCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Recent Activity */
  sectionCapsLabel: {
    fontWeight: '800',
    letterSpacing: 1,
    fontSize: 10,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  emptyActivityBox: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyAddBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 4,
  },
  txIconBox: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTypeBadge: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    opacity: 0.6,
  },

  /* Shortcuts */
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  shortcutIconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
