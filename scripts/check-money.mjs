// Run: node scripts/check-money.mjs  (Node 23.6+ strips TS types natively)
import assert from 'node:assert/strict';

import { formatMYR, parseAmountToSen } from '../src/money.ts';
import { summarize } from '../src/transactions/model.ts';

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

const tx = (type, amountSen) => ({ id: type, type, amountSen, category: null, note: '', occurredAt: '' });
assert.deepEqual(
  summarize([tx('income', 300000), tx('expense', 5000), tx('refund', 1000), tx('transfer', 20000), tx('card_payment', 40000)]),
  { incomeSen: 300000, spendingSen: 4000, netSen: 296000 },
);

console.log('money checks passed');
