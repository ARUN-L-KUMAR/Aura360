import type React from 'react';
import {
  Banknote,
  Briefcase,
  Building,
  Car,
  CircleDollarSign,
  Coins,
  CreditCard,
  Film,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  PiggyBank,
  Plane,
  Receipt,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Store,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
  Zap,
} from 'lucide-react-native';

import type { PaymentMethod } from '@/features/finance/types';

export type LucideIconComponent = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const CATEGORY_MAP: Record<string, LucideIconComponent> = {
  // Expenses
  Food: Utensils,
  Transport: Car,
  Shopping: ShoppingBag,
  Bills: Receipt,
  Entertainment: Film,
  Health: HeartPulse,
  Education: GraduationCap,
  Rent: Home,
  Groceries: ShoppingCart,
  Other: Tag,

  // Income
  Salary: Briefcase,
  Freelance: Laptop,
  Business: Store,
  Scholarship: GraduationCap,
  Gift: Sparkles,
  Interest: TrendingUp,
  Refund: RotateCcw,
  'Other Income': CircleDollarSign,

  // Investments
  Stocks: TrendingUp,
  'Mutual Funds': PiggyBank,
  SIP: RotateCcw,
  'Fixed Deposit': Landmark,
  Gold: Coins,
  Crypto: Zap,
  'Real Estate': Building,
  'Other Investment': Banknote,

  // Budgets
  'Food & Dining': Utensils,
  Transportation: Car,
  'Utilities & Bills': Zap,
  Healthcare: HeartPulse,
  'Personal Care': Sparkles,
  Travel: Plane,
  __OVERALL__: Wallet,

  // Goals
  'Emergency Fund': ShieldCheck,
  Savings: PiggyBank,
  'Gadgets & Tech': Smartphone,
  'Travel & Vacation': Plane,
  Vehicle: Car,
  'Home & Living': Home,
  Investment: TrendingUp,
  'Debt Payoff': CreditCard,
};

export function getCategoryLucideIcon(category: string): LucideIconComponent {
  return CATEGORY_MAP[category] ?? Tag;
}

export const PAYMENT_LUCIDE_ICONS: Record<PaymentMethod, LucideIconComponent> = {
  cash: Banknote,
  upi: Smartphone,
  card: CreditCard,
  bank_transfer: Landmark,
  other: Wallet,
};

export function getPaymentLucideIcon(method: PaymentMethod | null | undefined): LucideIconComponent {
  if (!method) return Wallet;
  return PAYMENT_LUCIDE_ICONS[method] ?? Wallet;
}

/**
 * The payment method's icon as a ready element. Call sites use this instead of picking a component into a variable
 * during render (which the React Compiler lint rightly flags: "cannot create components during render").
 */
export function renderPaymentLucideIcon(method: PaymentMethod | null | undefined, { size, color }: { size: number; color: string }) {
  const Icon = getPaymentLucideIcon(method);
  return <Icon size={size} color={color} />;
}
