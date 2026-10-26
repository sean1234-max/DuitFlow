import type { SupabaseClient } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { useAuth } from '../auth/AuthContext';
import { usePersistentState } from '../storage';
import { supabase } from '../supabase';
import { isBudgetList, type Budget } from './budgets';
import { applyContribution, isGoalList, type Goal } from './goals';
import {
  checked,
  pullSnapshot,
  pushSnapshot,
  toBudgetRow,
  toGoalRow,
  toTransactionRow,
} from './sync';
import { isTransactionList, type ExpenseCategory, type Transaction } from './transactions';

export type TransactionInput = Omit<Transaction, 'id'>;
export type GoalInput = Pick<Goal, 'name' | 'targetSen'>;
export type SyncState = 'local' | 'syncing' | 'synced' | 'error';

interface FinanceContextValue {
  transactions: readonly Transaction[];
  budgets: readonly Budget[];
  goals: readonly Goal[];
  syncState: SyncState;
  syncError: string | null;
  syncNow: () => void;
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
const isOwner = (v: unknown): v is string | null => v === null || typeof v === 'string';
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unknown error');

type RemoteOp = (client: SupabaseClient, userId: string) => PromiseLike<{ error: { message: string } | null }>;

// How to line up this device with the cloud when a user is signed in:
// merge     – data was recorded before signing in: upload it, then download everything
// reconcile – this device has edits that failed to upload: make the cloud match the device
// pull      – the device is up to date: just download
// replace   – the cache belongs to another account: discard it, then download
type SyncMode = 'merge' | 'reconcile' | 'pull' | 'replace';

// ponytail: local-first cache with write-through to Supabase and last-writer-wins.
// Offline deletes on one device can remove another device's newer rows on reconcile;
// add per-row updated_at merging if multi-device editing becomes common.
export function FinanceProvider({ children }: { children: ReactNode }) {
  const { isReady: isAuthReady, session } = useAuth();
  const userId = session?.user.id ?? null;

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
  // Which account the cached data belongs to (null = recorded without signing in).
  const [owner, setOwner, ownerLoaded] = usePersistentState<string | null>('duitflow.owner', null, isOwner);
  const [hasUnsynced, setHasUnsynced, unsyncedLoaded] = usePersistentState(
    'duitflow.unsynced',
    false,
    isBoolean,
  );
  const [syncState, setSyncState] = useState<SyncState>('local');
  const [syncError, setSyncError] = useState<string | null>(null);

  const isLoaded = transactionsLoaded && budgetsLoaded && goalsLoaded && ownerLoaded && unsyncedLoaded;

  const clearLocal = () => {
    setTransactions([]);
    setBudgets([]);
    setGoals([]);
    setHasUnsynced(false);
  };

  const sync = async (signedInUserId: string, mode: SyncMode) => {
    if (!supabase) return;
    setSyncState('syncing');
    setSyncError(null);
    try {
      if (mode === 'replace') clearLocal();
      const local = { transactions, budgets, goals };
      if (mode === 'merge' || mode === 'reconcile') {
        await pushSnapshot(supabase, signedInUserId, local, mode === 'reconcile');
      }
      const cloud = await pullSnapshot(supabase);
      setTransactions(cloud.transactions);
      setBudgets(cloud.budgets);
      setGoals(cloud.goals);
      setOwner(signedInUserId);
      setHasUnsynced(false);
      setSyncState('synced');
    } catch (error: unknown) {
      console.warn('Sync failed', error);
      if (mode === 'reconcile') setHasUnsynced(true);
      setSyncState('error');
      setSyncError(errorMessage(error));
    }
  };

  useEffect(() => {
    if (!isLoaded || !isAuthReady) return;
    if (!userId) {
      // Signed out: remove that account's data from this device.
      if (owner) {
        clearLocal();
        setOwner(null);
      }
      return;
    }
    const mode: SyncMode =
      owner === null ? 'merge' : owner !== userId ? 'replace' : hasUnsynced ? 'reconcile' : 'pull';
    // Syncing with Supabase is exactly what this effect is for; sync() marks the request in flight.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void sync(userId, mode);
    // Runs once per sign-in / app start; the sync reads the latest local data itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isAuthReady, userId]);

  if (!isLoaded) return null;

  // Writes one change to the cloud after it has been applied locally. A failure is kept
  // as "unsynced" so the next app start (or Sync now) uploads the device's data.
  const remote = (op: RemoteOp) => {
    if (!supabase || !userId) return;
    checked(op(supabase, userId))
      .then(() => setSyncState('synced'))
      .catch((error: unknown) => {
        console.warn('Could not save change to the cloud', error);
        setHasUnsynced(true);
        setSyncState('error');
        setSyncError(errorMessage(error));
      });
  };

  const saveGoal = (goal: Goal) => {
    setGoals((current) => current.map((g) => (g.id === goal.id ? goal : g)));
    remote((c, uid) => c.from('goals').upsert(toGoalRow(uid, goal), { onConflict: 'user_id,id' }));
  };

  const value: FinanceContextValue = {
    transactions,
    budgets,
    goals,
    syncState: userId ? syncState : 'local',
    syncError,
    syncNow: () => {
      if (userId) void sync(userId, 'reconcile');
    },
    addTransaction: (input) => {
      const transaction = { ...input, id: newId() };
      setTransactions((current) => [transaction, ...current].sort(byNewestFirst));
      remote((c, uid) => c.from('transactions').insert(toTransactionRow(uid, transaction)));
    },
    updateTransaction: (id, input) => {
      const transaction = { ...input, id };
      setTransactions((current) =>
        current.map((t) => (t.id === id ? transaction : t)).sort(byNewestFirst),
      );
      remote((c, uid) =>
        c.from('transactions').upsert(toTransactionRow(uid, transaction), { onConflict: 'user_id,id' }),
      );
    },
    deleteTransaction: (id) => {
      setTransactions((current) => current.filter((t) => t.id !== id));
      remote((c, uid) => c.from('transactions').delete().eq('user_id', uid).eq('id', id));
    },
    setBudget: (category, limitSen) => {
      const budget = { category, limitSen };
      setBudgets((current) => [...current.filter((b) => b.category !== category), budget]);
      remote((c, uid) =>
        c.from('budgets').upsert(toBudgetRow(uid, budget), { onConflict: 'user_id,category' }),
      );
    },
    removeBudget: (category) => {
      setBudgets((current) => current.filter((b) => b.category !== category));
      remote((c, uid) => c.from('budgets').delete().eq('user_id', uid).eq('category', category));
    },
    addGoal: (input) => {
      const goal = { ...input, id: newId(), savedSen: 0, createdAt: new Date().toISOString() };
      setGoals((current) => [...current, goal]);
      remote((c, uid) => c.from('goals').insert(toGoalRow(uid, goal)));
    },
    updateGoal: (id, input) => {
      const goal = goals.find((g) => g.id === id);
      if (goal) saveGoal({ ...goal, ...input });
    },
    contributeToGoal: (id, deltaSen) => {
      const goal = goals.find((g) => g.id === id);
      if (goal) saveGoal(applyContribution(goal, deltaSen));
    },
    deleteGoal: (id) => {
      setGoals((current) => current.filter((g) => g.id !== id));
      remote((c, uid) => c.from('goals').delete().eq('user_id', uid).eq('id', id));
    },
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const value = useContext(FinanceContext);
  if (!value) throw new Error('useFinance must be used inside FinanceProvider');
  return value;
}
