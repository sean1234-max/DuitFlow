import { EXPENSE_CATEGORIES, type ExpenseCategory } from './transactions.ts';

export interface Budget {
  category: ExpenseCategory;
  limitSen: number; // per calendar month
}

export const BUDGET_WARNING_RATIO = 0.8;

export type BudgetStatus = 'ok' | 'warning' | 'over';

export interface BudgetProgress {
  spentSen: number;
  remainingSen: number; // negative when over budget
  ratio: number; // spent / limit, may exceed 1
  status: BudgetStatus;
}

export function budgetProgress(limitSen: number, spentSen: number): BudgetProgress {
  const ratio = limitSen > 0 ? spentSen / limitSen : 0;
  const status: BudgetStatus = ratio > 1 ? 'over' : ratio >= BUDGET_WARNING_RATIO ? 'warning' : 'ok';
  return { spentSen, remainingSen: limitSen - spentSen, ratio, status };
}

export function isBudgetList(value: unknown): value is Budget[] {
  return (
    Array.isArray(value) &&
    value.every(
      (b) =>
        typeof b === 'object' &&
        b !== null &&
        EXPENSE_CATEGORIES.includes(b.category) &&
        Number.isInteger(b.limitSen) &&
        b.limitSen > 0,
    )
  );
}
