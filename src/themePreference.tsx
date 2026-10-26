import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'duitflow.themePreference';
const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'system' || value === 'light' || value === 'dark';

interface ThemePreferenceContextValue {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemePreferenceContext = createContext<ThemePreferenceContextValue>({
  preference: 'system',
  setPreference: () => {},
});

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (isThemePreference(stored)) setPreferenceState(stored);
      })
      .catch((error: unknown) => console.warn('Could not load theme preference', error));
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch((error: unknown) =>
      console.warn('Could not save theme preference', error),
    );
  };

  return (
    <ThemePreferenceContext.Provider value={{ preference, setPreference }}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreferenceContextValue {
  return useContext(ThemePreferenceContext);
}
