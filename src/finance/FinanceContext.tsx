import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { useAuth } from '../auth/AuthContext';
import { atLocalNoon } from '../dates';
import { usePersistentState } from '../storage';
import { supabase } from '../supabase';
import { isBudgetList, type Budget } from './budgets';
import { isCustomCategoryList, type CustomCategory } from './categories';
import { applyContribution, isGoalList, type Goal } from './goals';
import { dueOccurrences, isRecurringList, type Recurring } from './recurring';
import {
  applyTombstones,
  checked,
  COLLECTION_NAMES,
  COLLECTIONS,
  deleteRemote,
  isTombstoneList,
  pullData,
  pushData,
  saveRemote,
  upsertItem,
  type Collection,
  type CollectionName,
  type FinanceData,
  type ItemOf,
  type Tombstone,
} from './sync';
import { isTransactionList, type Category, type Transaction } from './transactions';

export type TransactionInput = Omit<Transaction, 'id'>;
export type GoalInput = Pick<Goal, 'name' | 'targetSen'>;
export type RecurringInput = Omit<Recurring, 'id' | 'lastGeneratedMonth'>;
export type SyncState = 'local' | 'syncing' | 'synced' | 'error';

interface FinanceContextValue extends Readonly<FinanceData> {
  syncState: SyncState;
  syncError: string | null;
  syncNow: () => void;
  addTransaction: (input: TransactionInput) => void;
  updateTransaction: (id: string, input: TransactionInput) => void;
  deleteTransaction: (id: string) => void;
  setBudget: (category: Category, limitSen: number) => void;
  removeBudget: (category: Category) => void;
  addGoal: (input: GoalInput) => void;
  updateGoal: (id: string, input: GoalInput) => void;
  contributeToGoal: (id: string, deltaSen: number) => void;
  deleteGoal: (id: string) => void;
  addRecurring: (input: RecurringInput) => void;
  deleteRecurring: (id: string) => void;
  addCategory: (name: string) => void;
  deleteCategory: (id: string) => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const isOwner = (v: unknown): v is string | null => v === null || typeof v === 'string';
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unknown error');
const REALTIME_DEBOUNCE_MS = 800;

// How to line up this device with the cloud when a user is signed in:
// merge     – data was recorded before signing in: upload it, then download everything
// reconcile – this device has changes that failed to upload: upload them (and queued
//             deletes), then download everything
// pull      – the device is up to date: just download
// replace   – the cache belongs to another account: discard it, then download
type SyncMode = 'merge' | 'reconcile' | 'pull' | 'replace';

// ponytail: local-first cache, write-through to Supabase, last-writer-wins per row.
// A record deleted on one phone while another phone holds an unsynced edit of it can
// come back; add per-row updated_at comparison if that ever matters in practice.
export function FinanceProvider({ children }: { children: ReactNode }) {
  const { isReady: isAuthReady, session } = useAuth();
  const userId = session?.user.id ?? null;

  const [transactions, setTransactions, l1] = usePersistentState<Transaction[]>(
    'duitflow.transactions',
    [],
    isTransactionList,
  );
  const [budgets, setBudgets, l2] = usePersistentState<Budget[]>('duitflow.budgets', [], isBudgetList);
  const [goals, setGoals, l3] = usePersistentState<Goal[]>('duitflow.goals', [], isGoalList);
  const [recurring, setRecurring, l4] = usePersistentState<Recurring[]>(
    'duitflow.recurring',
    [],
    isRecurringList,
  );
  const [categories, setCategories, l5] = usePersistentState<CustomCategory[]>(
    'duitflow.categories',
    [],
    isCustomCategoryList,
  );
  // Which account the cached data belongs to (null = recorded without signing in).
  const [owner, setOwner, l6] = usePersistentState<string | null>('duitflow.owner', null, isOwner);
  const [hasUnsynced, setHasUnsynced, l7] = usePersistentState('duitflow.unsynced', false, isBoolean);
  const [tombstones, setTombstones, l8] = usePersistentState<Tombstone[]>(
    'duitflow.pendingDeletes',
    [],
    isTombstoneList,
  );
  const [syncState, setSyncState] = useState<SyncState>('local');
  const [syncError, setSyncError] = useState<string | null>(null);

  const isLoaded = l1 && l2 && l3 && l4 && l5 && l6 && l7 && l8;
  const data: FinanceData = { transactions, budgets, goals, recurring, categories };

  // Setters by collection name, so the save/remove helpers below work for every kind.
  const setters: { [N in CollectionName]: (update: (list: ItemOf<N>[]) => ItemOf<N>[]) => void } = {
    transactions: setTransactions,
    budgets: setBudgets,
    goals: setGoals,
    recurring: setRecurring,
    categories: setCategories,
  };

  // Realtime callbacks need the latest pending-change flags without resubscribing.
  const pendingRef = useRef({ hasUnsynced, tombstones });
  pendingRef.current = { hasUnsynced, tombstones };

  const replaceAll = (next: FinanceData) => {
    for (const name of COLLECTION_NAMES) setters[name](() => next[name] as never);
  };

  const sync = async (signedInUserId: string, mode: SyncMode) => {
    if (!supabase) return;
    setSyncState('syncing');
    setSyncError(null);
    try {
      if (mode === 'merge' || mode === 'reconcile') await pushData(supabase, signedInUserId, data);
      if (mode === 'reconcile') await applyTombstones(supabase, signedInUserId, tombstones);
      replaceAll(await pullData(supabase));
      setOwner(signedInUserId);
      setHasUnsynced(false);
      setTombstones([]);
      setSyncState('synced');
    } catch (error: unknown) {
      console.warn('Sync failed', error);
      if (mode === 'reconcile') setHasUnsynced(true);
      setSyncState('error');
      setSyncError(errorMessage(error));
    }
  };

  // Sign-in, sign-out and app start.
  useEffect(() => {
    if (!isLoaded || !isAuthReady) return;
    if (!userId) {
      // Signed out: remove that account's data from this device.
      if (owner) {
        replaceAll({ transactions: [], budgets: [], goals: [], recurring: [], categories: [] });
        setOwner(null);
        setHasUnsynced(false);
        setTombstones([]);
      }
      return;
    }
    const isPending = hasUnsynced || tombstones.length > 0;
    const mode: SyncMode =
      owner === null ? 'merge' : owner !== userId ? 'replace' : isPending ? 'reconcile' : 'pull';
    // Syncing with Supabase is exactly what this effect is for; sync() marks the request in flight.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void sync(userId, mode);
    // Runs once per sign-in / app start; the sync reads the latest local data itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isAuthReady, userId]);

  // Live updates: when another phone changes this account's data, download it.
  useEffect(() => {
    const client = supabase;
    if (!client || !userId || !isLoaded) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedulePull = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const { hasUnsynced: unsynced, tombstones: pending } = pendingRef.current;
        if (unsynced || pending.length > 0) return; // local changes first; Sync now handles it
        pullData(client)
          .then(replaceAll)
          .catch((error: unknown) => console.warn('Live update failed', error));
      }, REALTIME_DEBOUNCE_MS);
    };
    const channel = client.channel(`finance-${userId}`);
    for (const name of COLLECTION_NAMES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: COLLECTIONS[name].table, filter: `user_id=eq.${userId}` },
        schedulePull,
      );
    }
    channel.subscribe();
    return () => {
      clearTimeout(timer);
      void client.removeChannel(channel);
    };
    // replaceAll only calls stable state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isLoaded]);

  // Writes one change to the cloud after it has been applied locally.
  const save = <N extends CollectionName>(name: N, item: ItemOf<N>) => {
    const setter = setters[name] as (update: (list: ItemOf<N>[]) => ItemOf<N>[]) => void;
    setter((list) => upsertItem(list, item, COLLECTIONS[name] as Collection<ItemOf<N>>));
    if (!supabase || !userId) return;
    checked(saveRemote(supabase, userId, name, item))
      .then(() => setSyncState('synced'))
      .catch((error: unknown) => {
        console.warn('Could not save change to the cloud', error);
        setHasUnsynced(true);
        setSyncState('error');
        setSyncError(errorMessage(error));
      });
  };

  const remove = <N extends CollectionName>(name: N, key: string) => {
    const c = COLLECTIONS[name] as Collection<ItemOf<N>>;
    const setter = setters[name] as (update: (list: ItemOf<N>[]) => ItemOf<N>[]) => void;
    setter((list) => list.filter((item) => c.keyOf(item) !== key));
    if (!supabase || !userId) return;
    checked(deleteRemote(supabase, userId, name, key))
      .then(() => setSyncState('synced'))
      .catch((error: unknown) => {
        console.warn('Could not delete from the cloud', error);
        setTombstones((current) => [...current, { collection: name, key }]);
        setSyncState('error');
        setSyncError(errorMessage(error));
      });
  };

  // Create recurring transactions that have come due (on load and after each sync).
  useEffect(() => {
    if (!isLoaded || (userId && syncState !== 'synced')) return;
    const today = atLocalNoon(new Date());
    for (const rule of recurring) {
      const due = dueOccurrences(rule, today);
      if (due.lastGeneratedMonth === rule.lastGeneratedMonth) continue;
      due.transactions.forEach((t) => save('transactions', t));
      save('recurring', { ...rule, lastGeneratedMonth: due.lastGeneratedMonth });
    }
    // save() is recreated each render; reruns are driven by the data itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId, syncState, recurring]);

  if (!isLoaded) return null;

  const value: FinanceContextValue = {
    ...data,
    syncState: userId ? syncState : 'local',
    syncError,
    syncNow: () => {
      if (userId) void sync(userId, 'reconcile');
    },
    addTransaction: (input) => save('transactions', { ...input, id: newId() }),
    updateTransaction: (id, input) => save('transactions', { ...input, id }),
    deleteTransaction: (id) => remove('transactions', id),
    setBudget: (category, limitSen) => save('budgets', { category, limitSen }),
    removeBudget: (category) => remove('budgets', category),
    addGoal: (input) =>
      save('goals', { ...input, id: newId(), savedSen: 0, createdAt: new Date().toISOString() }),
    updateGoal: (id, input) => {
      const goal = goals.find((g) => g.id === id);
      if (goal) save('goals', { ...goal, ...input });
    },
    contributeToGoal: (id, deltaSen) => {
      const goal = goals.find((g) => g.id === id);
      if (goal) save('goals', applyContribution(goal, deltaSen));
    },
    deleteGoal: (id) => remove('goals', id),
    addRecurring: (input) => save('recurring', { ...input, id: newId(), lastGeneratedMonth: null }),
    deleteRecurring: (id) => remove('recurring', id),
    addCategory: (name) => save('categories', { id: newId(), name: name.trim() }),
    deleteCategory: (id) => remove('categories', id),
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const value = useContext(FinanceContext);
  if (!value) throw new Error('useFinance must be used inside FinanceProvider');
  return value;
}
