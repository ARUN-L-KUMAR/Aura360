import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { OVERALL_BUDGET, type PaymentMethod } from '@/features/finance/types';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * One icon per stored category name (the API keeps them in English), so a category is recognisable without reading its
 * label or relying on colour. A category the user typed themselves gets the generic tag.
 */
const CATEGORY_ICONS: Record<string, IconName> = {
  // expenses
  Food: 'restaurant-outline',
  Transport: 'bus-outline',
  Shopping: 'bag-handle-outline',
  Bills: 'receipt-outline',
  Entertainment: 'film-outline',
  Health: 'medkit-outline',
  Education: 'school-outline',
  Rent: 'home-outline',
  Groceries: 'basket-outline',
  Other: 'ellipsis-horizontal-circle-outline',
  // income
  Salary: 'briefcase-outline',
  Freelance: 'laptop-outline',
  Business: 'storefront-outline',
  Scholarship: 'ribbon-outline',
  Gift: 'gift-outline',
  Interest: 'trending-up-outline',
  Refund: 'return-up-back-outline',
  'Other Income': 'add-circle-outline',
  // investments
  Stocks: 'stats-chart-outline',
  'Mutual Funds': 'pie-chart-outline',
  SIP: 'repeat-outline',
  'Fixed Deposit': 'lock-closed-outline',
  Gold: 'diamond-outline',
  Crypto: 'logo-bitcoin',
  'Real Estate': 'business-outline',
  'Other Investment': 'cash-outline',
  // budgets
  'Food & Dining': 'restaurant-outline',
  Transportation: 'bus-outline',
  'Utilities & Bills': 'flash-outline',
  Healthcare: 'medkit-outline',
  'Personal Care': 'sparkles-outline',
  Travel: 'airplane-outline',
  [OVERALL_BUDGET]: 'wallet-outline',
  // goals
  'Emergency Fund': 'shield-checkmark-outline',
  Savings: 'wallet-outline',
  'Gadgets & Tech': 'phone-portrait-outline',
  'Travel & Vacation': 'airplane-outline',
  Vehicle: 'car-outline',
  'Home & Living': 'home-outline',
  Investment: 'trending-up-outline',
  'Debt Payoff': 'card-outline',
};

export const CUSTOM_CATEGORY_ICON: IconName = 'create-outline';

export function categoryIcon(category: string): IconName {
  return CATEGORY_ICONS[category] ?? 'pricetag-outline';
}

/** Icon per payment method (the values of the `payment_method` enum). */
export const PAYMENT_ICONS: Record<PaymentMethod, IconName> = {
  cash: 'cash-outline',
  upi: 'phone-portrait-outline',
  card: 'card-outline',
  bank_transfer: 'business-outline',
  other: 'wallet-outline',
};
