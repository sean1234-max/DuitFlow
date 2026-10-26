// Single source of truth for DuitFlow brand + design tokens.
// Colors are initial recommendations; change them here and the whole app follows.

import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useThemePreference } from './themePreference';

export const brand = {
  name: 'DuitFlow',
  slogan: 'Know Where Your Money Goes.',
  sloganZh: '让每一笔钱，都有迹可循。',
  currency: 'MYR',
} as const;

// Sampled from the logo: navy "D" plus a mint-to-blue ribbon.
const palette = {
  mint: '#66DDB4',
  mintTint: '#E8F9F2',
  blue: '#3C88D1',
  navy: '#1D1C55',
  slate: '#64748B',
  slateDark: '#475569',
  lightGray: '#F5F7FA',
  white: '#FFFFFF',
  border: '#E2E8F0',
  danger: '#DC2626',
} as const;

export interface Colors {
  isDark: boolean;
  primary: string;
  primaryTint: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  icon: string;
  textOnPrimary: string;
  border: string;
  warning: string;
  danger: string;
}

export const lightColors: Colors = {
  isDark: false,
  primary: palette.mint,
  primaryTint: palette.mintTint,
  secondary: palette.navy,
  // Blue is 3.5:1 on the background: fine for charts/icons, too light for body text.
  accent: palette.blue,
  background: palette.lightGray,
  surface: palette.white,
  textPrimary: palette.navy,
  // Brand slate (#64748B) is 4.4:1 on the background, under WCAG AA; slateDark passes.
  textSecondary: palette.slateDark,
  icon: palette.slate,
  // Navy on mint is 9.3:1; white on mint would fail AA.
  textOnPrimary: palette.navy,
  border: palette.border,
  warning: '#B45309', // 5.0:1 on white
  danger: palette.danger,
};

// Deep navy derived from the logo. All text pairs are 6:1 or better.
export const darkColors: Colors = {
  isDark: true,
  primary: palette.mint,
  primaryTint: '#1F3D3A',
  secondary: '#EEF1F7',
  accent: '#5AA2E8',
  background: '#0E0F24',
  surface: '#1A1B3A',
  textPrimary: '#EEF1F7',
  textSecondary: '#A9B2C3',
  icon: '#8792A8',
  textOnPrimary: palette.navy,
  border: '#2E3060',
  warning: '#FBBF24',
  danger: '#F87171',
};

// Uses the in-app choice, falling back to the phone's light/dark setting for "system".
export function useColors(): Colors {
  const { preference } = useThemePreference();
  const systemScheme = useColorScheme();
  const scheme = preference === 'system' ? systemScheme : preference;
  return scheme === 'dark' ? darkColors : lightColors;
}

// Builds a StyleSheet from the current colors, rebuilt only when the scheme changes.
export function useThemedStyles<T>(factory: (colors: Colors) => T): T {
  const colors = useColors();
  return useMemo(() => factory(colors), [colors, factory]);
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

export const typography = {
  display: { fontSize: 32, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '400' },
} as const;
