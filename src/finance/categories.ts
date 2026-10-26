import { BUILT_IN_CATEGORIES, isValidCategoryName, type Category } from './transactions.ts';

export interface CustomCategory {
  id: string;
  name: Category;
}

// Built-ins first, then the user's own, without duplicates (case-insensitive).
export function allCategories(custom: readonly CustomCategory[]): Category[] {
  const seen = new Set<string>(BUILT_IN_CATEGORIES.map((c) => c.toLowerCase()));
  const extra = custom
    .map((c) => c.name)
    .filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return [...BUILT_IN_CATEGORIES, ...extra];
}

export const isDuplicateCategory = (name: string, custom: readonly CustomCategory[]) =>
  allCategories(custom).some((c) => c.toLowerCase() === name.trim().toLowerCase());

export function isCustomCategoryList(value: unknown): value is CustomCategory[] {
  return (
    Array.isArray(value) &&
    value.every(
      (c) => typeof c === 'object' && c !== null && typeof c.id === 'string' && isValidCategoryName(c.name),
    )
  );
}
