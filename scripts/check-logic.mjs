// Run: npm run check  (Node 23.6+ strips TS types natively)
import assert from 'node:assert/strict';

import { formatMYR, parseAmountToSen } from '../src/money.ts';
import { budgetProgress } from '../src/finance/budgets.ts';
import { applyContribution, goalProgress } from '../src/finance/goals.ts';
import { forecastMonthEnd, spendingByCategory } from '../src/finance/insights.ts';
import {
  fromBudgetRow,
  fromGoalRow,
  fromTransactionRow,
  toBudgetRow,
  toGoalRow,
  toTransactionRow,
} from '../src/finance/sync.ts';
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
const sample = octTx[0];
const txRow = toTransactionRow('user-1', sample);
assert.equal(txRow.user_id, 'user-1');
assert.equal(txRow.amount_sen, sample.amountSen);
assert.deepEqual(fromTransactionRow({ ...txRow, occurred_at: '2026-10-01T04:00:00+00:00' }), {
  ...sample,
  occurredAt: '2026-10-01T04:00:00.000Z',
});
const budget = { category: 'Transport', limitSen: 30000 };
assert.deepEqual(fromBudgetRow(toBudgetRow('user-1', budget)), budget);
const savedGoal = { ...goal, createdAt: '2026-06-01T04:00:00.000Z' };
assert.deepEqual(fromGoalRow({ ...toGoalRow('user-1', savedGoal), saved_sen: '25000' }), savedGoal);

console.log('logic checks passed');
