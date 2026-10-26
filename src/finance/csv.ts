import type { Transaction } from './transactions.ts';

// Quotes a user-typed text cell for CSV. Text starting with = + - @ is prefixed with '
// so spreadsheet apps show it as text instead of running it as a formula (CSV injection).
export function csvCell(value: string): string {
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const HEADER = ['Date', 'Type', 'Category', 'Amount (RM)', 'Note'].join(',');

const localDate = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Amounts are plain numbers (no "RM", no thousands separator) so spreadsheets can sum
// them; expenses are negative. Dates are local YYYY-MM-DD. Only text cells are escaped:
// dates, types and amounts are generated here and are always safe.
export function transactionsToCsv(transactions: readonly Transaction[]): string {
  const rows = transactions.map((t) => {
    const signed = t.type === 'expense' ? -t.amountSen : t.amountSen;
    return [
      localDate(t.occurredAt),
      t.type,
      csvCell(t.category ?? ''),
      (signed / 100).toFixed(2),
      csvCell(t.note),
    ].join(',');
  });
  return [HEADER, ...rows].join('\r\n');
}
