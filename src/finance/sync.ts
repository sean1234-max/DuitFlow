import type { SupabaseClient } from '@supabase/supabase-js';

import { isBudgetList, type Budget } from './budgets.ts';
import { isCustomCategoryList, type CustomCategory } from './categories.ts';
import { isGoalList, type Goal } from './goals.ts';
import { isRecurringList, type Recurring } from './recurring.ts';
import { isTransactionList, type Transaction } from './transactions.ts';

export interface FinanceData {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  recurring: Recurring[];
  categories: CustomCategory[];
}

export type CollectionName = keyof FinanceData;
export type ItemOf<N extends CollectionName> = FinanceData[N][number];

type Row = Record<string, unknown>;

// Everything sync needs to know about one kind of record. Adding a new kind of data
// means adding one entry here plus its table in a migration.
export interface Collection<T> {
  table: string;
  keyColumn: string; // primary key column besides user_id
  keyOf: (item: T) => string;
  toRow: (userId: string, item: T) => Row;
  fromRow: (row: Row) => unknown;
  isValid: (value: unknown) => value is T[];
  sort?: (a: T, b: T) => number;
}

const isoOrRaw = (v: unknown) => (typeof v === 'string' ? new Date(v).toISOString() : v);
const now = () => new Date().toISOString();

export const byNewestFirst = (a: Transaction, b: Transaction) =>
  b.occurredAt.localeCompare(a.occurredAt);

export const COLLECTIONS: { [N in CollectionName]: Collection<ItemOf<N>> } = {
  transactions: {
    table: 'transactions',
    keyColumn: 'id',
    keyOf: (t) => t.id,
    toRow: (userId, t) => ({
      user_id: userId,
      id: t.id,
      type: t.type,
      amount_sen: t.amountSen,
      category: t.category,
      note: t.note,
      occurred_at: t.occurredAt,
      updated_at: now(),
    }),
    fromRow: (r) => ({
      id: r.id,
      type: r.type,
      amountSen: Number(r.amount_sen),
      category: r.category,
      note: r.note,
      occurredAt: isoOrRaw(r.occurred_at),
    }),
    isValid: isTransactionList,
    sort: byNewestFirst,
  },
  budgets: {
    table: 'budgets',
    keyColumn: 'category',
    keyOf: (b) => b.category,
    toRow: (userId, b) => ({
      user_id: userId,
      category: b.category,
      limit_sen: b.limitSen,
      updated_at: now(),
    }),
    fromRow: (r) => ({ category: r.category, limitSen: Number(r.limit_sen) }),
    isValid: isBudgetList,
  },
  goals: {
    table: 'goals',
    keyColumn: 'id',
    keyOf: (g) => g.id,
    toRow: (userId, g) => ({
      user_id: userId,
      id: g.id,
      name: g.name,
      target_sen: g.targetSen,
      saved_sen: g.savedSen,
      created_at: g.createdAt,
      updated_at: now(),
    }),
    fromRow: (r) => ({
      id: r.id,
      name: r.name,
      targetSen: Number(r.target_sen),
      savedSen: Number(r.saved_sen),
      createdAt: isoOrRaw(r.created_at),
    }),
    isValid: isGoalList,
    sort: (a, b) => a.createdAt.localeCompare(b.createdAt),
  },
  recurring: {
    table: 'recurring',
    keyColumn: 'id',
    keyOf: (r) => r.id,
    toRow: (userId, r) => ({
      user_id: userId,
      id: r.id,
      type: r.type,
      amount_sen: r.amountSen,
      category: r.category,
      note: r.note,
      day_of_month: r.dayOfMonth,
      start_date: r.startDate,
      last_generated_month: r.lastGeneratedMonth,
      updated_at: now(),
    }),
    fromRow: (r) => ({
      id: r.id,
      type: r.type,
      amountSen: Number(r.amount_sen),
      category: r.category,
      note: r.note,
      dayOfMonth: Number(r.day_of_month),
      startDate: isoOrRaw(r.start_date),
      lastGeneratedMonth: r.last_generated_month,
    }),
    isValid: isRecurringList,
  },
  categories: {
    table: 'categories',
    keyColumn: 'id',
    keyOf: (c) => c.id,
    toRow: (userId, c) => ({ user_id: userId, id: c.id, name: c.name, updated_at: now() }),
    fromRow: (r) => ({ id: r.id, name: r.name }),
    isValid: isCustomCategoryList,
    sort: (a, b) => a.name.localeCompare(b.name),
  },
};

export const COLLECTION_NAMES = Object.keys(COLLECTIONS) as CollectionName[];

export const EMPTY_DATA: FinanceData = {
  transactions: [],
  budgets: [],
  goals: [],
  recurring: [],
  categories: [],
};

// A delete that could not reach the cloud yet; replayed on the next sync.
export interface Tombstone {
  collection: CollectionName;
  key: string;
}

export const isTombstoneList = (value: unknown): value is Tombstone[] =>
  Array.isArray(value) &&
  value.every(
    (t) =>
      typeof t === 'object' &&
      t !== null &&
      COLLECTION_NAMES.includes(t.collection) &&
      typeof t.key === 'string',
  );

type Result = PromiseLike<{ error: { message: string } | null }>;

export async function checked(promise: Result) {
  const { error } = await promise;
  if (error) throw new Error(error.message);
}

const conflictTarget = (c: { keyColumn: string }) => `user_id,${c.keyColumn}`;

export function saveRemote<N extends CollectionName>(
  client: SupabaseClient,
  userId: string,
  name: N,
  item: ItemOf<N>,
): Result {
  const c = COLLECTIONS[name];
  return client.from(c.table).upsert(c.toRow(userId, item), { onConflict: conflictTarget(c) });
}

export function deleteRemote(
  client: SupabaseClient,
  userId: string,
  name: CollectionName,
  key: string,
): Result {
  const c = COLLECTIONS[name];
  return client.from(c.table).delete().eq('user_id', userId).eq(c.keyColumn, key);
}

// Server data is external input, so it is validated like anything read from storage.
export async function pullData(client: SupabaseClient): Promise<FinanceData> {
  const entries = await Promise.all(
    COLLECTION_NAMES.map(async (name) => {
      const c = COLLECTIONS[name] as Collection<unknown>;
      const { data, error } = await client.from(c.table).select('*');
      if (error) throw new Error(`Could not load ${c.table}: ${error.message}`);
      const items = (data ?? []).map(c.fromRow);
      if (!c.isValid(items)) throw new Error(`Cloud ${c.table} data is in an unexpected format.`);
      return [name, c.sort ? [...items].sort(c.sort) : items] as const;
    }),
  );
  return Object.fromEntries(entries) as unknown as FinanceData;
}

// Uploads every local record (insert or overwrite). Never deletes cloud rows by itself;
// deletes travel as tombstones so one phone cannot wipe another phone's new records.
export async function pushData(client: SupabaseClient, userId: string, data: FinanceData) {
  for (const name of COLLECTION_NAMES) {
    const c = COLLECTIONS[name] as Collection<unknown>;
    const rows = (data[name] as unknown[]).map((item) => c.toRow(userId, item));
    if (rows.length > 0) {
      await checked(client.from(c.table).upsert(rows, { onConflict: conflictTarget(c) }));
    }
  }
}

export async function applyTombstones(client: SupabaseClient, userId: string, tombstones: Tombstone[]) {
  for (const { collection, key } of tombstones) {
    await checked(deleteRemote(client, userId, collection, key));
  }
}

// Inserts or replaces an item (matched by key) without mutating the list.
export function upsertItem<T>(list: readonly T[], item: T, c: Collection<T>): T[] {
  const key = c.keyOf(item);
  const next = [...list.filter((existing) => c.keyOf(existing) !== key), item];
  return c.sort ? next.sort(c.sort) : next;
}
