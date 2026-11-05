import { i18n } from '@/i18n';

/**
 * Names for the values the API stores in English ("Food & Dining", "upi"). The stored value never changes; only what
 * is drawn does. A value we do not know (a custom category the user typed) is shown as written.
 * Call these while rendering, never at module scope.
 */
const CATEGORY_IDS = {
  Salary: 'salary',
  Freelance: 'freelance',
  Business: 'business',
  Scholarship: 'scholarship',
  Gift: 'gift',
  Interest: 'interest',
  Refund: 'refund',
  'Other Income': 'otherIncome',
  Food: 'food',
  Transport: 'transport',
  Shopping: 'shopping',
  Bills: 'bills',
  Entertainment: 'entertainment',
  Health: 'health',
  Education: 'education',
  Rent: 'rent',
  Groceries: 'groceries',
  Other: 'other',
  Stocks: 'stocks',
  'Mutual Funds': 'mutualFunds',
  SIP: 'sip',
  'Fixed Deposit': 'fixedDeposit',
  Gold: 'gold',
  Crypto: 'crypto',
  'Real Estate': 'realEstate',
  'Other Investment': 'otherInvestment',
  'Food & Dining': 'foodDining',
  Transportation: 'transportation',
  'Utilities & Bills': 'utilitiesBills',
  Healthcare: 'healthcare',
  'Personal Care': 'personalCare',
  Travel: 'travel',
  'Emergency Fund': 'emergencyFund',
  Savings: 'savings',
  'Gadgets & Tech': 'gadgetsTech',
  'Travel & Vacation': 'travelVacation',
  Vehicle: 'vehicle',
  'Home & Living': 'homeLiving',
  Investment: 'investment',
  'Debt Payoff': 'debtPayoff',
} as const;

type CategoryId = (typeof CATEGORY_IDS)[keyof typeof CATEGORY_IDS];

export function categoryLabel(value: string): string {
  const id = (CATEGORY_IDS as Record<string, CategoryId | undefined>)[value];
  return id ? i18n.t(`finance:categories.${id}` as const) : value;
}

export function transactionTypeLabel(type: string): string {
  switch (type) {
    case 'income':
      return i18n.t('finance:types.income');
    case 'expense':
      return i18n.t('finance:types.expense');
    case 'investment':
      return i18n.t('finance:types.investment');
    case 'transfer':
      return i18n.t('finance:types.transfer');
    default:
      return type;
  }
}

export function paymentMethodLabel(method: string): string {
  switch (method) {
    case 'upi':
      return i18n.t('finance:payment.upi');
    case 'cash':
      return i18n.t('finance:payment.cash');
    case 'card':
      return i18n.t('finance:payment.card');
    case 'bank_transfer':
      return i18n.t('finance:payment.bank_transfer');
    case 'other':
      return i18n.t('finance:payment.other');
    default:
      return method;
  }
}
