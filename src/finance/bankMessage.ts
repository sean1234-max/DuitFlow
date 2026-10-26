import { parseAmountToSen } from '../money.ts';
import type { TransactionType } from './transactions.ts';

export interface ParsedBankMessage {
  type: TransactionType;
  amountSen: number;
  note: string; // merchant or sender when found
}

// English and Malay wording seen in Malaysian bank and e-wallet alerts.
const INCOME_WORDS = /\b(credited|received|deposit(ed)?|transfer(red)? in|incoming|dikreditkan|diterima|masuk|terima)\b/i;
const REFUND_WORDS = /\b(refund(ed)?|reversal|pemulangan|bayaran balik)\b/i;
const EXPENSE_WORDS = /\b(debited|spent|purchase[ds]?|payment|paid|charged|withdrawal|transaction|didebitkan|pembelian|bayaran|dibelanjakan|pengeluaran)\b/i;
const AMOUNT = /(?:RM|MYR)\s?([\d,]+(?:\.\d{1,2})?)/i;
const MERCHANT = /\b(?:at|@|to|from|kepada|daripada|di)\s+([A-Za-z0-9][A-Za-z0-9&'.\-* ]{1,40}?)(?=\s+(?:on|pada|using|via|ref|for|is|dated)\b|[.,;:]|\s*$)/i;
const MAX_NOTE_LENGTH = 100;

// ponytail: keyword heuristics, not a per-bank parser. The user always reviews the
// filled form before saving; add bank-specific patterns if users report misses.
export function parseBankMessage(text: string): ParsedBankMessage | null {
  const amountMatch = text.match(AMOUNT);
  if (!amountMatch) return null;
  const amountSen = parseAmountToSen(amountMatch[1]);
  if (amountSen === null) return null;

  const type: TransactionType = REFUND_WORDS.test(text)
    ? 'refund'
    : INCOME_WORDS.test(text) && !EXPENSE_WORDS.test(text.replace(INCOME_WORDS, ''))
      ? 'income'
      : 'expense';

  const merchant = text.match(MERCHANT)?.[1]?.trim() ?? '';
  return { type, amountSen, note: merchant.slice(0, MAX_NOTE_LENGTH) };
}
