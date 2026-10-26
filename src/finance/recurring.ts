import { atLocalNoon, daysInMonth } from '../dates.ts';
import {
  isTransactionType,
  isValidCategoryName,
  type Category,
  type Transaction,
  type TransactionType,
} from './transactions.ts';

// A transaction that repeats on the same day every month (salary, rent, subscriptions).
export interface Recurring {
  id: string;
  type: TransactionType;
  amountSen: number;
  category: Category | null;
  note: string;
  dayOfMonth: number; // 1-31; clamped to the month's last day (31 → 30 Apr, 28/29 Feb)
  startDate: string; // ISO; no occurrences before this
  lastGeneratedMonth: string | null; // 'YYYY-MM' of the newest occurrence already created
}

export const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

// Occurrence ids are derived from the rule and month, so two phones generating the same
// month write the same row instead of a duplicate.
export const occurrenceId = (recurringId: string, month: string) => `${recurringId}@${month}`;

export interface DueResult {
  transactions: Transaction[];
  lastGeneratedMonth: string | null;
}

// Every occurrence from the month after lastGeneratedMonth (or the start month) up to
// today that has not been created yet. Deleting a generated transaction does not bring
// it back, because lastGeneratedMonth has already moved past it.
export function dueOccurrences(rule: Recurring, today: Date): DueResult {
  const start = new Date(rule.startDate);
  const created: Transaction[] = [];
  let last = rule.lastGeneratedMonth;
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  if (last) {
    const [y, m] = last.split('-').map(Number);
    cursor = new Date(y, m, 1); // month after `last` (months are 0-based in Date)
  }
  while (cursor <= today) {
    const day = Math.min(rule.dayOfMonth, daysInMonth(cursor));
    const occurrence = atLocalNoon(new Date(cursor.getFullYear(), cursor.getMonth(), day));
    if (occurrence > today) break;
    const month = monthKey(cursor);
    if (occurrence >= atLocalNoon(start)) {
      created.push({
        id: occurrenceId(rule.id, month),
        type: rule.type,
        amountSen: rule.amountSen,
        category: rule.category,
        note: rule.note,
        occurredAt: occurrence.toISOString(),
      });
    }
    last = month;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return { transactions: created, lastGeneratedMonth: last };
}

export function isRecurringList(value: unknown): value is Recurring[] {
  return (
    Array.isArray(value) &&
    value.every(
      (r) =>
        typeof r === 'object' &&
        r !== null &&
        typeof r.id === 'string' &&
        isTransactionType(r.type) &&
        Number.isInteger(r.amountSen) &&
        r.amountSen > 0 &&
        (r.category === null || isValidCategoryName(r.category)) &&
        typeof r.note === 'string' &&
        Number.isInteger(r.dayOfMonth) &&
        r.dayOfMonth >= 1 &&
        r.dayOfMonth <= 31 &&
        typeof r.startDate === 'string' &&
        (r.lastGeneratedMonth === null || typeof r.lastGeneratedMonth === 'string'),
    )
  );
}
