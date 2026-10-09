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

export const GOAL_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];
