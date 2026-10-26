import { daysInMonth, isSameMonth } from '../dates.ts';
import { summarize, type Category, type Transaction } from './transactions.ts';

export const monthTransactions = (transactions: readonly Transaction[], month: Date) =>
  transactions.filter((t) => isSameMonth(t.occurredAt, month));

export interface CategorySpend {
  category: Category;
  spentSen: number;
  share: number; // 0..1 of total category spending
}

// Spending per category (expenses minus refunds), largest first. Empty categories are dropped.
export function spendingByCategory(transactions: readonly Transaction[]): CategorySpend[] {
  const totals = new Map<Category, number>();
  for (const t of transactions) {
    if (!t.category) continue;
    const sign = t.type === 'expense' ? 1 : t.type === 'refund' ? -1 : 0;
    totals.set(t.category, (totals.get(t.category) ?? 0) + sign * t.amountSen);
  }
  const positive = [...totals].filter(([, sen]) => sen > 0);
  const total = positive.reduce((sum, [, sen]) => sum + sen, 0);
  return positive
    .map(([category, spentSen]) => ({ category, spentSen, share: spentSen / total }))
    .sort((a, b) => b.spentSen - a.spentSen);
}

export const MIN_DAYS_FOR_FORECAST = 3;

export interface MonthForecast {
  incomeSen: number;
  spentSoFarSen: number;
  projectedSpendingSen: number;
  projectedNetSen: number;
  daysLeft: number;
  isReliable: boolean; // false in the first days of the month, when the average is noisy
}

// ponytail: straight-line projection of this month's average daily spending; does not
// assume any further income. Upgrade to recurring-bill detection once there is history.
export function forecastMonthEnd(transactions: readonly Transaction[], today: Date): MonthForecast {
  const { incomeSen, spendingSen } = summarize(monthTransactions(transactions, today));
  const daysElapsed = today.getDate();
  const daysLeft = daysInMonth(today) - daysElapsed;
  const projectedSpendingSen = Math.round(spendingSen + (spendingSen / daysElapsed) * daysLeft);
  return {
    incomeSen,
    spentSoFarSen: spendingSen,
    projectedSpendingSen,
    projectedNetSen: incomeSen - projectedSpendingSen,
    daysLeft,
    isReliable: daysElapsed >= MIN_DAYS_FOR_FORECAST,
  };
}
