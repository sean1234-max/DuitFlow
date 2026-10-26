// Amounts are stored as integer sen (1 RM = 100 sen) to avoid float rounding errors.

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
export const MAX_AMOUNT_SEN = 100_000_000_00; // RM 100 million sanity cap

// Parses user input like "12", "12.5", "1,234.50" into sen. Returns null if invalid or not positive.
export function parseAmountToSen(input: string): number | null {
  const cleaned = input.trim().replace(/,/g, '');
  if (!AMOUNT_PATTERN.test(cleaned)) return null;
  const [whole, fraction = ''] = cleaned.split('.');
  const sen = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return sen > 0 && sen <= MAX_AMOUNT_SEN ? sen : null;
}

// Formats sen back into an editable amount, e.g. 1250 -> "12.50".
export const formatAmountInput = (sen: number) => (sen / 100).toFixed(2);

// Formats sen as ringgit, e.g. 482050 -> "RM 4,820.50", -500 -> "-RM 5.00".
export function formatMYR(sen: number): string {
  const ringgit = (Math.abs(sen) / 100).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sen < 0 ? '-' : ''}RM ${ringgit}`;
}
