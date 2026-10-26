// Run: npm run check  (Node 23.6+ strips TS types natively)
import assert from 'node:assert/strict';

import { formatMYR, parseAmountToSen } from '../src/money.ts';
import { budgetProgress } from '../src/finance/budgets.ts';
import { applyContribution, goalProgress } from '../src/finance/goals.ts';
import { forecastMonthEnd, spendingByCategory } from '../src/finance/insights.ts';
import { parseBankMessage } from '../src/finance/bankMessage.ts';
import { allCategories, isDuplicateCategory } from '../src/finance/categories.ts';
import { csvCell, transactionsToCsv } from '../src/finance/csv.ts';
import { dueOccurrences } from '../src/finance/recurring.ts';
import { COLLECTIONS, upsertItem } from '../src/finance/sync.ts';
import { isTransactionList, summarize } from '../src/finance/transactions.ts';

assert.equal(parseAmountToSen('12'), 1200);
assert.equal(parseAmountToSen('12.5'), 1250);
assert.equal(parseAmountToSen('1,234.56'), 123456);
assert.equal(parseAmountToSen('0.10'), 10);
assert.equal(parseAmountToSen('0'), null);
assert.equal(parseAmountToSen('1.234'), null);
assert.equal(parseAmountToSen('-5'), null);
assert.equal(parseAmountToSen('abc'), null);
assert.equal(parseAmountToSen(''), null);
assert.equal(parseAmountToSen('999999999999'), null);

assert.equal(formatMYR(482050), 'RM 4,820.50');
assert.equal(formatMYR(-500), '-RM 5.00');

const tx = (type, amountSen, category = null, occurredAt = '') => ({ id: type, type, amountSen, category, note: '', occurredAt });
assert.deepEqual(
  summarize([tx('income', 300000), tx('expense', 5000), tx('refund', 1000), tx('transfer', 20000), tx('card_payment', 40000)]),
  { incomeSen: 300000, spendingSen: 4000, netSen: 296000 },
);

// Category spending nets refunds and drops categories at or below zero.
const day = (d) => new Date(2026, 9, d, 12).toISOString();
const octTx = [
  tx('expense', 6000, 'Food & Drinks', day(1)),
  tx('expense', 2000, 'Transport', day(2)),
  tx('refund', 2000, 'Transport', day(3)),
  tx('expense', 4000, 'Food & Drinks', day(4)),
  tx('income', 500000, null, day(5)),
];
assert.deepEqual(spendingByCategory(octTx), [{ category: 'Food & Drinks', spentSen: 10000, share: 1 }]);

// Forecast: RM 100 spent by day 10 of a 31-day month -> RM 310 projected, income not extrapolated.
const forecast = forecastMonthEnd(octTx, new Date(2026, 9, 10, 12));
assert.equal(forecast.spentSoFarSen, 10000);
assert.equal(forecast.projectedSpendingSen, 31000);
assert.equal(forecast.projectedNetSen, 500000 - 31000);
assert.equal(forecast.daysLeft, 21);
assert.equal(forecast.isReliable, true);
assert.equal(forecastMonthEnd(octTx, new Date(2026, 9, 2, 12)).isReliable, false);

// Budgets: warning from 80%, over above 100%.
assert.equal(budgetProgress(10000, 7999).status, 'ok');
assert.equal(budgetProgress(10000, 8000).status, 'warning');
assert.equal(budgetProgress(10000, 10000).status, 'warning');
assert.equal(budgetProgress(10000, 10001).status, 'over');
assert.equal(budgetProgress(10000, 12000).remainingSen, -2000);

// Goals: progress capped at 100%, withdrawals never go below zero.
const goal = { id: 'g', name: 'Trip', targetSen: 100000, savedSen: 25000, createdAt: '' };
assert.deepEqual(goalProgress(goal), { ratio: 0.25, remainingSen: 75000, isComplete: false });
assert.equal(applyContribution(goal, -99999).savedSen, 0);
assert.equal(goalProgress(applyContribution(goal, 90000)).ratio, 1);
assert.equal(goal.savedSen, 25000, 'applyContribution must not mutate');

// Stored data validation rejects malformed records.
assert.equal(isTransactionList(octTx), true);
assert.equal(isTransactionList([{ ...octTx[0], amountSen: 1.5 }]), false);
assert.equal(isTransactionList([{ ...octTx[0], type: 'gift' }]), false);
assert.equal(isTransactionList('nope'), false);

// Cloud rows round-trip back to the exact app records, scoped to the signed-in user.
const T = COLLECTIONS.transactions;
const sample = octTx[0];
const txRow = T.toRow('user-1', sample);
assert.equal(txRow.user_id, 'user-1');
assert.equal(txRow.amount_sen, sample.amountSen);
assert.deepEqual(T.fromRow({ ...txRow, occurred_at: '2026-10-01T04:00:00+00:00' }), {
  ...sample,
  occurredAt: '2026-10-01T04:00:00.000Z',
});
const budget = { category: 'Transport', limitSen: 30000 };
assert.deepEqual(COLLECTIONS.budgets.fromRow(COLLECTIONS.budgets.toRow('user-1', budget)), budget);
const savedGoal = { ...goal, createdAt: '2026-06-01T04:00:00.000Z' };
assert.deepEqual(
  COLLECTIONS.goals.fromRow({ ...COLLECTIONS.goals.toRow('user-1', savedGoal), saved_sen: '25000' }),
  savedGoal,
);
const rule = {
  id: 'r1', type: 'income', amountSen: 420000, category: null, note: 'Salary',
  dayOfMonth: 31, startDate: new Date(2026, 7, 15, 12).toISOString(), lastGeneratedMonth: '2026-09',
};
const ruleRow = COLLECTIONS.recurring.toRow('user-1', rule);
assert.equal(ruleRow.day_of_month, 31);
assert.deepEqual(
  COLLECTIONS.recurring.fromRow({ ...ruleRow, start_date: rule.startDate.replace('Z', '+00:00') }),
  rule,
);
assert.deepEqual(
  COLLECTIONS.categories.fromRow(COLLECTIONS.categories.toRow('u', { id: 'c1', name: 'Pets' })),
  { id: 'c1', name: 'Pets' },
);

// upsertItem replaces by key, keeps sort order, and never mutates.
const list = [sample];
const edited = upsertItem(list, { ...sample, amountSen: 1 }, T);
assert.equal(edited.length, 1);
assert.equal(edited[0].amountSen, 1);
assert.equal(list[0].amountSen, sample.amountSen);

// Recurring: one occurrence per month, day clamped to month length, stable ids,
// nothing before the start date, nothing in the future.
const fresh = { ...rule, lastGeneratedMonth: null };
const due = dueOccurrences(fresh, new Date(2026, 9, 26, 12));
assert.deepEqual(due.transactions.map((t) => t.id), ['r1@2026-08', 'r1@2026-09']);
assert.equal(new Date(due.transactions[1].occurredAt).getDate(), 30); // 31 Sep -> 30 Sep
assert.equal(due.lastGeneratedMonth, '2026-09'); // 31 Oct hasn't happened yet
assert.deepEqual(dueOccurrences(rule, new Date(2026, 9, 26, 12)).transactions, []);
assert.equal(dueOccurrences(rule, new Date(2026, 9, 31, 12)).transactions[0].id, 'r1@2026-10');
const firsts = dueOccurrences({ ...fresh, dayOfMonth: 1 }, new Date(2026, 9, 26, 12));
assert.deepEqual(firsts.transactions.map((t) => t.id), ['r1@2026-09', 'r1@2026-10']); // 1 Aug < start

// Categories: built-ins first, custom de-duplicated case-insensitively.
const cats = allCategories([{ id: '1', name: 'Pets' }, { id: '2', name: 'pets' }, { id: '3', name: 'transport' }]);
assert.deepEqual(cats.slice(8), ['Pets']);
assert.equal(isDuplicateCategory(' TRANSPORT ', []), true);

// Bank messages (English and Malay).
assert.deepEqual(parseBankMessage('Maybank: RM45.90 debited from A/C xx1234 at GRAB*FOOD on 26/10.'), { type: 'expense', amountSen: 4590, note: 'GRAB*FOOD' });
assert.deepEqual(parseBankMessage('You have received RM 1,200.00 from AHMAD BIN ALI via DuitNow.'), { type: 'income', amountSen: 120000, note: 'AHMAD BIN ALI' });
assert.equal(parseBankMessage('CIMB: Your card was charged MYR 89.00 at SHOPEE MY.').note, 'SHOPEE MY');
assert.equal(parseBankMessage('Refund of RM29.90 from Lazada has been credited.').type, 'refund');
assert.equal(parseBankMessage('Wang RM50.00 telah dikreditkan ke akaun anda.').type, 'income');
assert.equal(parseBankMessage('Pembelian RM12.50 di KK MART pada 26/10.').note, 'KK MART');
assert.equal(parseBankMessage('Hello, no money here'), null);

// CSV: formula injection neutralised, quotes escaped, expenses negative.
assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
assert.equal(csvCell('a,b'), '"a,b"');
assert.equal(csvCell('-RM5 refund'), "'-RM5 refund"); // user text starting with - is still guarded
const csv = transactionsToCsv([{ ...octTx[0], note: 'Lunch, "mamak"' }]).split('\r\n');
assert.equal(csv[0], 'Date,Type,Category,Amount (RM),Note');
assert.equal(csv[1], '2026-10-01,expense,Food & Drinks,-60.00,"Lunch, ""mamak"""');

console.log('logic checks passed');
