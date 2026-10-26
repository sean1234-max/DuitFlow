export type TransactionType = 'income' | 'expense' | 'transfer' | 'refund' | 'card_payment';

export const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'refund', label: 'Refund' },
  { value: 'card_payment', label: 'Card payment' },
];

export const EXPENSE_CATEGORIES = [
  'Food & Drinks',
  'Transport',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Health',
  'Education',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Transaction {
  id: string;
  type: TransactionType;
  amountSen: number; // always positive; `type` decides the direction
  category: ExpenseCategory | null; // only for expenses
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
export function signedAmountSen({ type, amountSen }: Transaction): number {
  return type === 'expense' ? -amountSen : amountSen;
}

export function isSameMonth(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}
