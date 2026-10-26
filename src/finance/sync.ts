import type { SupabaseClient } from '@supabase/supabase-js';

import { isBudgetList, type Budget } from './budgets.ts';
import { isGoalList, type Goal } from './goals.ts';
import { isTransactionList, type Transaction } from './transactions.ts';

export interface Snapshot {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
}

type Row = Record<string, unknown>;

// App records <-> database rows (snake_case, scoped to one user).
export const toTransactionRow = (userId: string, t: Transaction): Row => ({
  user_id: userId,
  id: t.id,
  type: t.type,
  amount_sen: t.amountSen,
  category: t.category,
  note: t.note,
  occurred_at: t.occurredAt,
  updated_at: new Date().toISOString(),
});

export const fromTransactionRow = (r: Row) => ({
  id: r.id,
  type: r.type,
  amountSen: Number(r.amount_sen),
  category: r.category,
  note: r.note,
  occurredAt: typeof r.occurred_at === 'string' ? new Date(r.occurred_at).toISOString() : r.occurred_at,
});

export const toBudgetRow = (userId: string, b: Budget): Row => ({
  user_id: userId,
  category: b.category,
  limit_sen: b.limitSen,
  updated_at: new Date().toISOString(),
});

export const fromBudgetRow = (r: Row) => ({ category: r.category, limitSen: Number(r.limit_sen) });

export const toGoalRow = (userId: string, g: Goal): Row => ({
  user_id: userId,
  id: g.id,
  name: g.name,
  target_sen: g.targetSen,
  saved_sen: g.savedSen,
  created_at: g.createdAt,
  updated_at: new Date().toISOString(),
});

export const fromGoalRow = (r: Row) => ({
  id: r.id,
  name: r.name,
  targetSen: Number(r.target_sen),
  savedSen: Number(r.saved_sen),
  createdAt: typeof r.created_at === 'string' ? new Date(r.created_at).toISOString() : r.created_at,
});

async function selectAll(client: SupabaseClient, table: string): Promise<Row[]> {
  const { data, error } = await client.from(table).select('*');
  if (error) throw new Error(`Could not load ${table}: ${error.message}`);
  return data ?? [];
}

// Server data is external input, so it is validated like anything read from storage.
export async function pullSnapshot(client: SupabaseClient): Promise<Snapshot> {
  const [txRows, budgetRows, goalRows] = await Promise.all([
    selectAll(client, 'transactions'),
    selectAll(client, 'budgets'),
    selectAll(client, 'goals'),
  ]);
  const transactions = txRows
    .map(fromTransactionRow)
    .sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)));
  const budgets = budgetRows.map(fromBudgetRow);
  const goals = goalRows.map(fromGoalRow);
  if (!isTransactionList(transactions) || !isBudgetList(budgets) || !isGoalList(goals)) {
    throw new Error('Cloud data is in an unexpected format.');
  }
  return { transactions, budgets, goals };
}

export async function checked(promise: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await promise;
  if (error) throw new Error(error.message);
}

const quoteList = (values: string[]) => `(${values.map((v) => `"${v.replace(/"/g, '\\"')}"`).join(',')})`;

// Uploads every local record. With deleteMissing, cloud rows absent locally are removed,
// making the cloud an exact copy of this device.
export async function pushSnapshot(
  client: SupabaseClient,
  userId: string,
  snapshot: Snapshot,
  deleteMissing: boolean,
): Promise<void> {
  const tables = [
    {
      table: 'transactions',
      key: 'id',
      keys: snapshot.transactions.map((t) => t.id),
      rows: snapshot.transactions.map((t) => toTransactionRow(userId, t)),
      onConflict: 'user_id,id',
    },
    {
      table: 'budgets',
      key: 'category',
      keys: snapshot.budgets.map((b) => b.category),
      rows: snapshot.budgets.map((b) => toBudgetRow(userId, b)),
      onConflict: 'user_id,category',
    },
    {
      table: 'goals',
      key: 'id',
      keys: snapshot.goals.map((g) => g.id),
      rows: snapshot.goals.map((g) => toGoalRow(userId, g)),
      onConflict: 'user_id,id',
    },
  ];
  for (const { table, key, keys, rows, onConflict } of tables) {
    if (rows.length > 0) await checked(client.from(table).upsert(rows, { onConflict }));
    if (!deleteMissing) continue;
    const remove = client.from(table).delete().eq('user_id', userId);
    await checked(keys.length > 0 ? remove.not(key, 'in', quoteList(keys)) : remove);
  }
}
