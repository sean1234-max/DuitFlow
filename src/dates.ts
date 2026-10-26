// Calendar helpers. Transaction dates are stored as ISO strings at local noon,
// so moving between time zones never shifts a transaction to another day.

export function atLocalNoon(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

export function addDays(date: Date, days: number): Date {
  return atLocalNoon(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isSameMonth(iso: string, month: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
}

export function daysInMonth(month: Date): number {
  return new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
}

export function addMonths(month: Date, months: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + months, 1);
}

export const DEFAULT_LOCALE = 'en-MY';

export const formatDay = (date: Date, locale = DEFAULT_LOCALE) =>
  date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export const formatShortDay = (iso: string, locale = DEFAULT_LOCALE) =>
  new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });

export const formatMonth = (month: Date, locale = DEFAULT_LOCALE) =>
  month.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
