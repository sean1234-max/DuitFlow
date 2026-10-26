import { createContext, useContext, type ReactNode } from 'react';

import { usePersistentState } from '../storage';
import { isBudgetList, type Budget } from './budgets';
import { applyContribution, isGoalList, type Goal } from './goals';
import { isTransactionList, type ExpenseCategory, type Transaction } from './transactions';

export type TransactionInput = Omit<Transaction, 'id'>;
export type GoalInput = Pick<Goal, 'name' | 'targetSen'>;

interface FinanceContextValue {
  transactions: readonly Transaction[];
  budgets: readonly Budget[];
  goals: readonly Goal[];
  addTransaction: (input: TransactionInput) => void;
  updateTransaction: (id: string, input: TransactionInput) => void;
  deleteTransaction: (id: string) => void;
  setBudget: (category: ExpenseCategory, limitSen: number) => void;
  removeBudget: (category: ExpenseCategory) => void;
  addGoal: (input: GoalInput) => void;
  updateGoal: (id: string, input: GoalInput) => void;
  contributeToGoal: (id: string, deltaSen: number) => void;
  deleteGoal: (id: string) => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const byNewestFirst = (a: Transaction, b: Transaction) => b.occurredAt.localeCompare(a.occurredAt);

// ponytail: data lives only on this device (AsyncStorage); move to Supabase for sync/backup.
export function FinanceProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions, transactionsLoaded] = usePersistentState<Transaction[]>(
    'duitflow.transactions',
    [],
    isTransactionList,
  );
  const [budgets, setBudgets, budgetsLoaded] = usePersistentState<Budget[]>(
    'duitflow.budgets',
    [],
    isBudgetList,
  );
  const [goals, setGoals, goalsLoaded] = usePersistentState<Goal[]>('duitflow.goals', [], isGoalList);

  // Render nothing for the few ms it takes to read storage, so no edit can race the load.
  if (!transactionsLoaded || !budgetsLoaded || !goalsLoaded) return null;

  const value: FinanceContextValue = {
    transactions,
    budgets,
    goals,
    addTransaction: (input) =>
      setTransactions((current) => [{ ...input, id: newId() }, ...current].sort(byNewestFirst)),
    updateTransaction: (id, input) =>
      setTransactions((current) =>
        current.map((t) => (t.id === id ? { ...input, id } : t)).sort(byNewestFirst),
      ),
    deleteTransaction: (id) => setTransactions((current) => current.filter((t) => t.id !== id)),
    setBudget: (category, limitSen) =>
      setBudgets((current) => [...current.filter((b) => b.category !== category), { category, limitSen }]),
    removeBudget: (category) => setBudgets((current) => current.filter((b) => b.category !== category)),
    addGoal: (input) =>
      setGoals((current) => [
        ...current,
        { ...input, id: newId(), savedSen: 0, createdAt: new Date().toISOString() },
      ]),
    updateGoal: (id, input) =>
      setGoals((current) => current.map((g) => (g.id === id ? { ...g, ...input } : g))),
    contributeToGoal: (id, deltaSen) =>
      setGoals((current) => current.map((g) => (g.id === id ? applyContribution(g, deltaSen) : g))),
    deleteGoal: (id) => setGoals((current) => current.filter((g) => g.id !== id)),
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const value = useContext(FinanceContext);
  if (!value) throw new Error('useFinance must be used inside FinanceProvider');
  return value;
}
