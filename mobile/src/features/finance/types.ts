import { categoryRamps, error, primary, success, tertiary, warning } from '@/theme';

export type TransactionType = 'income' | 'expense' | 'investment' | 'transfer';
export type EditableTransactionType = Exclude<TransactionType, 'transfer'>;

/** Values of the `payment_method` enum in the database. */
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'other';

export type Transaction = {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  category: string;
  amount: string; // decimal as string
  description: string;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  createdAt: string;
};

export type TransactionsPage = {
  success: boolean;
  data: Transaction[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  totalAmount: number;
  counts: Record<TransactionType, number>;
};

export type TransactionInput = {
  date: string;
  type: EditableTransactionType;
  category: string;
  amount: number;
  description?: string;
  paymentMethod?: PaymentMethod | null;
  notes?: string | null;
};

export type Balance = {
  id: string;
  paymentMethod: PaymentMethod;
  currentBalance: string;
};

export type BalancesResponse = { success: boolean; data: Balance[]; totalBalance: string };

export type Budget = {
  id: string;
  category: string;
  amount: number;
  month: string | null;
  alertThreshold: number;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
  isNearLimit: boolean;
};

export type BudgetSummary = {
  month: string;
  totalBudgeted: number;
  overallCap: number;
  totalSpent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
  hasOverallBudget: boolean;
  categoriesCount: number;
};

export type BudgetsResponse = { success: boolean; data: Budget[]; summary: BudgetSummary };

export const OVERALL_BUDGET = '__OVERALL__';

export type Goal = {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  category: string;
  color: string;
  notes: string | null;
  status: string;
  percentage: number;
  remaining: number;
  daysRemaining: number | null;
  isCompleted: boolean;
};

export type GoalsResponse = {
  success: boolean;
  data: Goal[];
  summary: {
    totalGoals: number;
    inProgressCount: number;
    completedCount: number;
    totalTarget: number;
    totalSaved: number;
    totalRemaining: number;
    overallProgress: number;
  };
};

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'semi_annually' | 'yearly';
/** Values of the `subscription_status` enum: `pending` is shown as "paused" and `expired` as "ended". */
export type SubscriptionStatus = 'active' | 'pending' | 'cancelled' | 'expired';

export const BILLING_CYCLES: BillingCycle[] = ['weekly', 'monthly', 'quarterly', 'semi_annually', 'yearly'];
export const EDITABLE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ['active', 'pending', 'cancelled'];

/** One row of `GET /api/finance/subscriptions` (the server adds the renewal figures). */
export type Subscription = {
  id: string;
  name: string;
  description?: string | null;
  amount: number;
  currency?: string;
  billingCycle: BillingCycle;
  startDate?: string;
  nextBillingDate: string | null;
  status: SubscriptionStatus;
  paymentMethod?: PaymentMethod | null;
  category?: string;
  reminderDays?: number;
  autoRenew?: boolean;
  /** Whole days until the next billing date; negative when it is overdue, null without a date. */
  daysUntilRenewal?: number | null;
  isDueSoon?: boolean;
  isOverdue?: boolean;
  /** What the subscription costs per month whatever its cycle. */
  monthlyEquivalent?: number;
};

export type SubscriptionSummary = {
  totalSubscriptions: number;
  activeCount: number;
  pausedCount: number;
  cancelledCount: number;
  monthlyBurnRate: number;
  yearlyBurnRate: number;
  dueIn7DaysCount: number;
  overdueCount: number;
};

/** What the create and update calls accept. */
export type SubscriptionInput = {
  name: string;
  amount: number;
  billingCycle: BillingCycle;
  nextBillingDate?: string;
  status?: SubscriptionStatus;
  paymentMethod?: PaymentMethod | null;
  category?: string;
  autoRenew?: boolean;
};

/** What `POST /api/finance/receipt-scan` extracts from a photo of a receipt. */
export type ScannedReceipt = {
  merchant: string;
  amount: number;
  date: string;
  category: string;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  confidence: number;
};

export type SubscriptionsResponse = {
  success: boolean;
  data: Subscription[];
  summary: SubscriptionSummary;
};

// Category names, payment methods and goal categories below are stored values (the API keeps them in English).
// Screens draw them through components/finance/labels.ts; the `label` on PAYMENT_METHODS is an English fallback only.
export const CATEGORY_OPTIONS: Record<EditableTransactionType, string[]> = {
  income: ['Salary', 'Freelance', 'Business', 'Scholarship', 'Gift', 'Interest', 'Refund', 'Other Income'],
  expense: ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Rent', 'Groceries', 'Other'],
  investment: ['Stocks', 'Mutual Funds', 'SIP', 'Fixed Deposit', 'Gold', 'Crypto', 'Real Estate', 'Other Investment'],
};

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank' },
  { value: 'other', label: 'Other' },
];

export const BUDGET_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Shopping',
  'Entertainment',
  'Transportation',
  'Utilities & Bills',
  'Healthcare',
  'Personal Care',
  'Travel',
  'Education',
];

export const GOAL_CATEGORIES = [
  'Emergency Fund',
  'Savings',
  'Gadgets & Tech',
  'Travel & Vacation',
  'Vehicle',
  'Home & Living',
  'Investment',
  'Education',
  'Debt Payoff',
  'Other',
];

/** Swatches offered for new goals (theme mid-tones). Goals saved earlier keep whatever colour they were stored with. */
export const GOAL_COLORS = [
  primary[500],
  success[500],
  categoryRamps.notes[500],
  warning[500],
  error[500],
  tertiary[500],
  categoryRamps.skincare[500],
];
