import { createContext, useContext, type ReactNode } from 'react';

import { formatDay, formatMonth, formatShortDay } from '../dates';
import { usePersistentState } from '../storage';
import { en, type TranslationKey } from './en';
import { ms } from './ms';
import { zh } from './zh';

export type Language = 'en' | 'zh' | 'ms';
export type LanguagePreference = 'system' | Language;

const DICTIONARIES: Record<Language, Partial<Record<TranslationKey, string>>> = { en, zh, ms };

// Locale used for dates and numbers in each language (Malaysian variants).
export const LOCALES: Record<Language, string> = { en: 'en-MY', zh: 'zh-Hans-MY', ms: 'ms-MY' };

const isPreference = (v: unknown): v is LanguagePreference =>
  v === 'system' || v === 'en' || v === 'zh' || v === 'ms';

function systemLanguage(): Language {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
  if (locale.startsWith('zh')) return 'zh';
  if (locale.startsWith('ms')) return 'ms';
  return 'en';
}

export type TranslateParams = Record<string, string | number>;
export type Translate = (key: TranslationKey, params?: TranslateParams) => string;

// Replaces {name} placeholders, e.g. t('daysLeft', { n: 5 }).
export function translate(language: Language, key: TranslationKey, params?: TranslateParams): string {
  const template = DICTIONARIES[language][key] ?? en[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

interface LanguageContextValue {
  preference: LanguagePreference;
  language: Language;
  setPreference: (preference: LanguagePreference) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  preference: 'system',
  language: 'en',
  setPreference: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = usePersistentState<LanguagePreference>(
    'duitflow.language',
    'system',
    isPreference,
  );
  const language = preference === 'system' ? systemLanguage() : preference;
  return (
    <LanguageContext.Provider value={{ preference, language, setPreference }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

export function useT(): Translate {
  const { language } = useLanguage();
  return (key, params) => translate(language, key, params);
}

// Date formatters bound to the current language.
export function useDateFormat() {
  const locale = LOCALES[useLanguage().language];
  return {
    formatDay: (date: Date) => formatDay(date, locale),
    formatShortDay: (iso: string) => formatShortDay(iso, locale),
    formatMonth: (month: Date) => formatMonth(month, locale),
  };
}

export type { TranslationKey };
