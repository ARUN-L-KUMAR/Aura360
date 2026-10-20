import type { Balance, Budget, BudgetSummary, Goal, PaymentMethod, Subscription, SubscriptionsResponse, Transaction, TransactionType } from '@/features/finance/types';
import { OVERALL_BUDGET } from '@/features/finance/types';
import { primary, success, tertiary, warning } from '@/theme/colors';

import { daysAgo, isoOf, makeRandom, monthOf, stamp } from './seed-util';

const EXPENSE_DESCRIPTIONS: Record<string, readonly string[]> = {
  Food: ['Lunch at Dosa Corner', 'Swiggy dinner order', 'Coffee at Third Wave', 'Dinner with friends', 'Office canteen', 'Biryani Blues', 'Chai and snacks'],
  Transport: ['Uber to office', 'Metro card recharge', 'Auto fare', 'Petrol', 'Rapido ride'],
  Groceries: ['BigBasket order', 'Vegetables and fruits', 'DMart monthly stock', 'Milk and eggs'],
  Shopping: ['Running shoes', 'Amazon order', 'Myntra T-shirts', 'Headphones case'],
  Entertainment: ['Movie tickets', 'Bowling night', 'Concert pass', 'Book store'],
  Health: ['Pharmacy', 'Doctor consultation', 'Dental check-up'],
  Education: ['Udemy course'],
};

type Draft = Omit<Transaction, 'id'>;

/** About three months of an active person's transactions, newest first (the order the API returns). */
export function buildTransactions(): Transaction[] {
  const r = makeRandom(7);
  const drafts: Draft[] = [];
  const payment = (): PaymentMethod => {
    const roll = r.next();
    return roll < 0.55 ? 'upi' : roll < 0.75 ? 'card' : roll < 0.9 ? 'cash' : 'bank_transfer';
  };
  const add = (
    offset: number,
    type: TransactionType,
    category: string,
    amount: number,
    description: string,
    method: PaymentMethod | null,
    notes: string | null = null,
  ) => {
    const iso = isoOf(daysAgo(offset));
    drafts.push({
      date: iso,
      type,
      category,
      amount: amount.toFixed(2),
      description,
      paymentMethod: method,
      notes,
      createdAt: stamp(iso, r.between(8, 21), r.between(0, 59)),
    });
  };

  for (let offset = 0; offset < 90; offset++) {
    const day = daysAgo(offset);
    const dom = day.getDate();
    const weekend = day.getDay() === 0 || day.getDay() === 6;

    if (dom === 1) add(offset, 'income', 'Salary', 85000, 'Salary - Northwind Labs', 'bank_transfer');
    if (dom === 3) add(offset, 'expense', 'Rent', 18000, 'Flat rent', 'upi');
    if (dom === 5) add(offset, 'investment', 'SIP', 10000, 'Nifty 50 index fund SIP', 'bank_transfer');
    if (dom === 8) add(offset, 'expense', 'Bills', 1840, 'Electricity bill', 'upi');
    if (dom === 12) add(offset, 'expense', 'Bills', 999, 'Broadband', 'upi');
    if (dom === 15) add(offset, 'expense', 'Bills', 399, 'Mobile recharge', 'card');
    if (dom === 17) add(offset, 'investment', 'Stocks', 5000, 'HDFC Bank shares', 'bank_transfer');
    if (dom === 20) add(offset, 'income', 'Freelance', 14500, 'Logo design project', 'bank_transfer');
    if (dom === 25) add(offset, 'income', 'Interest', 840, 'Savings account interest', 'bank_transfer');

    if (r.chance(0.85)) add(offset, 'expense', 'Food', r.between(80, 520, 10), r.pick(EXPENSE_DESCRIPTIONS.Food), payment());
    if (r.chance(0.6)) add(offset, 'expense', 'Transport', r.between(30, 350, 10), r.pick(EXPENSE_DESCRIPTIONS.Transport), payment());
    if (r.chance(0.22)) add(offset, 'expense', 'Groceries', r.between(350, 1900, 10), r.pick(EXPENSE_DESCRIPTIONS.Groceries), payment());
    if (r.chance(0.1)) add(offset, 'expense', 'Shopping', r.between(600, 3800, 50), r.pick(EXPENSE_DESCRIPTIONS.Shopping), 'card');
    if (r.chance(weekend ? 0.35 : 0.08)) add(offset, 'expense', 'Entertainment', r.between(150, 900, 10), r.pick(EXPENSE_DESCRIPTIONS.Entertainment), payment());
    if (r.chance(0.05)) add(offset, 'expense', 'Health', r.between(200, 1500, 50), r.pick(EXPENSE_DESCRIPTIONS.Health), 'upi');
    if (r.chance(0.02)) add(offset, 'expense', 'Education', 799, r.pick(EXPENSE_DESCRIPTIONS.Education), 'card');
  }

  drafts.sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)));
  return drafts.map((draft, index) => ({ id: `tx-${String(index + 1).padStart(4, '0')}`, ...draft })).reverse();
}

export function buildBalances(): { data: Balance[]; totalBalance: string } {
  const data: Balance[] = [
    { id: 'bal-cash', paymentMethod: 'cash', currentBalance: '8450.00' },
    { id: 'bal-bank', paymentMethod: 'bank_transfer', currentBalance: '186320.00' },
    { id: 'bal-upi', paymentMethod: 'upi', currentBalance: '12400.00' },
  ];
  const total = data.reduce((sum, b) => sum + Number(b.currentBalance), 0);
  return { data, totalBalance: total.toFixed(2) };
}

/** Share of each budget used this month (one near its alert, one over, the rest comfortable). */
const BUDGET_TARGETS: { category: string; percent: number; threshold: number }[] = [
  { category: 'Food', percent: 84, threshold: 80 },
  { category: 'Groceries', percent: 112, threshold: 80 },
  { category: 'Transport', percent: 58, threshold: 80 },
  { category: 'Shopping', percent: 91, threshold: 85 },
  { category: 'Entertainment', percent: 37, threshold: 80 },
  { category: 'Bills', percent: 78, threshold: 90 },
];

function spentBy(transactions: Transaction[], month: string) {
  const byCategory = new Map<string, number>();
  let total = 0;
  for (const tx of transactions) {
    if (tx.type !== 'expense' || monthOf(tx.date) !== month) continue;
    const amount = Number(tx.amount);
    const key = tx.category.toLowerCase();
    total += amount;
    byCategory.set(key, (byCategory.get(key) ?? 0) + amount);
  }
  return { byCategory, total };
}

/** Budget amounts are fixed from the CURRENT month's spending, then applied to whichever month is asked for. */
export function buildBudgets(
  transactions: Transaction[],
  currentMonth: string,
  month: string,
): { data: Budget[]; summary: BudgetSummary } {
  const current = spentBy(transactions, currentMonth);
  const asked = spentBy(transactions, month);

  const enrich = (id: string, category: string, amount: number, threshold: number, spent: number): Budget => {
    const percentage = amount > 0 ? Math.round((spent / amount) * 100) : 0;
    return {
      id,
      category,
      amount,
      month,
      alertThreshold: threshold,
      spent,
      remaining: Math.max(0, amount - spent),
      percentage,
      isOverBudget: spent > amount,
      isNearLimit: percentage >= threshold && spent <= amount,
    };
  };

  const data: Budget[] = BUDGET_TARGETS.map((target, index) => {
    const reference = current.byCategory.get(target.category.toLowerCase()) ?? 0;
    const amount = Math.max(1000, Math.ceil(reference / (target.percent / 100) / 100) * 100);
    return enrich(`budget-${index + 1}`, target.category, amount, target.threshold, asked.byCategory.get(target.category.toLowerCase()) ?? 0);
  });

  const totalBudgeted = data.reduce((sum, b) => sum + b.amount, 0);
  const overallCap = Math.max(30000, Math.ceil(current.total / 0.78 / 1000) * 1000);
  data.unshift(enrich('budget-overall', OVERALL_BUDGET, overallCap, 85, asked.total));

  const summary: BudgetSummary = {
    month,
    totalBudgeted,
    overallCap,
    totalSpent: asked.total,
    remaining: Math.max(0, overallCap - asked.total),
    percentage: Math.round((asked.total / overallCap) * 100),
    isOverBudget: asked.total > overallCap,
    hasOverallBudget: true,
    categoriesCount: BUDGET_TARGETS.length,
  };
  return { data, summary };
}

export function buildGoals() {
  const now = new Date();
  const monthsAhead = (n: number) => isoOf(new Date(now.getFullYear(), now.getMonth() + n, 15));
  const make = (
    id: string,
    title: string,
    category: string,
    color: string,
    target: number,
    saved: number,
    targetDate: string | null,
    notes: string | null,
    completed = false,
  ): Goal => ({
    id,
    title,
    category,
    color,
    targetAmount: target,
    currentAmount: saved,
    targetDate,
    notes,
    status: completed ? 'completed' : 'in_progress',
    percentage: Math.min(100, Math.round((saved / target) * 100)),
    remaining: Math.max(0, target - saved),
    daysRemaining: targetDate ? Math.ceil((new Date(targetDate).getTime() - now.getTime()) / 86_400_000) : null,
    isCompleted: completed || saved >= target,
  });
  const data = [
    make('goal-1', 'Emergency fund', 'Emergency Fund', success[500], 300000, 214000, monthsAhead(9), 'Six months of expenses'),
    make('goal-2', 'New laptop', 'Gadgets & Tech', primary[500], 120000, 96500, monthsAhead(3), null),
    make('goal-3', 'Goa trip', 'Travel & Vacation', warning[500], 45000, 45000, monthsAhead(-1), 'Booked for November', true),
    make('goal-4', 'Clear credit card', 'Debt Payoff', tertiary[500], 60000, 18000, monthsAhead(6), null),
  ];
  const totalTarget = data.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = data.reduce((sum, g) => sum + g.currentAmount, 0);
  return {
    data,
    summary: {
      totalGoals: data.length,
      inProgressCount: data.filter((g) => !g.isCompleted).length,
      completedCount: data.filter((g) => g.isCompleted).length,
      totalTarget,
      totalSaved,
      totalRemaining: Math.max(0, totalTarget - totalSaved),
      overallProgress: Math.round((totalSaved / totalTarget) * 100),
    },
  };
}

/** A handful of recurring payments, some due within a week, for the Subscriptions section. */
export function buildSubscriptions(): SubscriptionsResponse {
  const monthly = (amount: number, cycle: Subscription['billingCycle']) =>
    cycle === 'weekly' ? (amount * 52) / 12 : cycle === 'quarterly' ? amount / 3 : cycle === 'semi_annually' ? amount / 6 : cycle === 'yearly' ? amount / 12 : amount;
  const sub = (id: string, name: string, amount: number, billingCycle: Subscription['billingCycle'], category: string, dueIn: number, paymentMethod: PaymentMethod, status: Subscription['status'] = 'active'): Subscription => ({
    id,
    name,
    amount,
    currency: 'INR',
    billingCycle,
    category,
    status,
    nextBillingDate: isoOf(daysAgo(-dueIn)),
    paymentMethod,
    autoRenew: true,
    reminderDays: 7,
    daysUntilRenewal: dueIn,
    isDueSoon: status === 'active' && dueIn >= 0 && dueIn <= 7,
    isOverdue: status === 'active' && dueIn < 0,
    monthlyEquivalent: Math.round(monthly(amount, billingCycle) * 100) / 100,
  });
  const data: Subscription[] = [
    sub('sub-1', 'Netflix', 649, 'monthly', 'Entertainment', 3, 'card'),
    sub('sub-2', 'Spotify', 119, 'monthly', 'Entertainment', 11, 'upi'),
    sub('sub-3', 'iCloud 200 GB', 75, 'monthly', 'Utilities', 5, 'upi'),
    sub('sub-4', 'Cult.fit membership', 3600, 'quarterly', 'Health', 27, 'bank_transfer'),
    sub('sub-5', 'Notion Plus', 4800, 'yearly', 'Productivity', 84, 'card'),
    sub('sub-6', 'Old gym pass', 999, 'monthly', 'Health', -12, 'upi', 'cancelled'),
  ];
  const active = data.filter((s) => s.status === 'active');
  const burn = active.reduce((sum, s) => sum + (s.monthlyEquivalent ?? 0), 0);
  return {
    success: true,
    data,
    summary: {
      totalSubscriptions: data.length,
      activeCount: active.length,
      pausedCount: 0,
      cancelledCount: data.length - active.length,
      monthlyBurnRate: Math.round(burn),
      yearlyBurnRate: Math.round(burn * 12),
      dueIn7DaysCount: active.filter((s) => s.isDueSoon).length,
      overdueCount: active.filter((s) => s.isOverdue).length,
    },
  };
}
