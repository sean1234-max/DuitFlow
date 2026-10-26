import type { TranslationKey } from '../i18n/en.ts';

export type TransactionType = 'income' | 'expense' | 'transfer' | 'refund' | 'card_payment';

export const TRANSACTION_TYPES: { value: TransactionType; labelKey: TranslationKey }[] = [
  { value: 'expense', labelKey: 'typeExpense' },
  { value: 'income', labelKey: 'typeIncome' },
  { value: 'transfer', labelKey: 'typeTransfer' },
  { value: 'refund', labelKey: 'typeRefund' },
  { value: 'card_payment', labelKey: 'typeCardPayment' },
];

// Built-in categories are stored by these English names (stable across languages);
// users can add their own names on top (see categories.ts).
export const BUILT_IN_CATEGORIES = [
  'Food & Drinks',
  'Transport',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Health',
  'Education',
  'Other',
] as const;

export type BuiltInCategory = (typeof BUILT_IN_CATEGORIES)[number];
export type Category = string;

export const CATEGORY_MAX_LENGTH = 30;

const BUILT_IN_LABEL_KEYS: Record<BuiltInCategory, TranslationKey> = {
  'Food & Drinks': 'catFood',
  Transport: 'catTransport',
  Shopping: 'catShopping',
  'Bills & Utilities': 'catBills',
  Entertainment: 'catEntertainment',
  Health: 'catHealth',
  Education: 'catEducation',
  Other: 'catOther',
};

// Translation key for a built-in category; custom categories are shown as typed.
export const categoryLabelKey = (category: Category): TranslationKey | null =>
  BUILT_IN_LABEL_KEYS[category as BuiltInCategory] ?? null;

export const isValidCategoryName = (name: unknown): name is Category =>
  typeof name === 'string' && name.trim().length > 0 && name.length <= CATEGORY_MAX_LENGTH;

export interface Transaction {
  id: string;
  type: TransactionType;
  amountSen: number; // always positive; `type` decides the direction
  category: Category | null; // only for expenses and refunds
  note: string;
  occurredAt: string; // ISO timestamp
}

export interface Summary {
  incomeSen: number;
  spendingSen: number; // expenses minus refunds
  netSen: number;
}

// Transfers and card payments move money between your own accounts, so they are
// excluded from income/spending to avoid counting the same purchase twice.
export function summarize(transactions: readonly Transaction[]): Summary {
  const total = (type: TransactionType) =>
    transactions.filter((t) => t.type === type).reduce((sum, t) => sum + t.amountSen, 0);
  const incomeSen = total('income');
  const spendingSen = total('expense') - total('refund');
  return { incomeSen, spendingSen, netSen: incomeSen - spendingSen };
}

// Signed amount for display: expenses show as negative, everything else as positive.
export function signedAmountSen({ type, amountSen }: Pick<Transaction, 'type' | 'amountSen'>): number {
  return type === 'expense' ? -amountSen : amountSen;
}

// Refunds carry a category too, so they can be netted against that category's spending.
export const hasCategory = (type: TransactionType) => type === 'expense' || type === 'refund';

export const typeLabelKey = (type: TransactionType): TranslationKey =>
  TRANSACTION_TYPES.find((option) => option.value === type)?.labelKey ?? 'typeExpense';

export const isTransactionType = (v: unknown): v is TransactionType =>
  TRANSACTION_TYPES.some((option) => option.value === v);

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

export function isTransactionList(value: unknown): value is Transaction[] {
  return (
    Array.isArray(value) &&
    value.every(
      (t) =>
        isObject(t) &&
        typeof t.id === 'string' &&
        isTransactionType(t.type) &&
        Number.isInteger(t.amountSen) &&
        (t.category === null || isValidCategoryName(t.category)) &&
        typeof t.note === 'string' &&
        typeof t.occurredAt === 'string',
    )
  );
}
