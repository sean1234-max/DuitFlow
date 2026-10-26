// Single source of truth for DuitFlow brand + design tokens.
// Colors are initial recommendations; change them here and the whole app follows.

export const brand = {
  name: 'DuitFlow',
  slogan: 'Know Where Your Money Goes.',
  sloganZh: '让每一笔钱，都有迹可循。',
  currency: 'MYR',
} as const;

const palette = {
  emerald: '#10B981',
  emeraldTint: '#E7F8F1',
  navy: '#0F2D56',
  slate: '#64748B',
  slateDark: '#475569',
  lightGray: '#F5F7FA',
  white: '#FFFFFF',
  border: '#E2E8F0',
  danger: '#DC2626',
} as const;

export const colors = {
  primary: palette.emerald,
  primaryTint: palette.emeraldTint,
  secondary: palette.navy,
  background: palette.lightGray,
  surface: palette.white,
  textPrimary: palette.navy,
  // Brand slate (#64748B) is 4.4:1 on the background, under WCAG AA; slateDark passes.
  textSecondary: palette.slateDark,
  icon: palette.slate,
  // White on emerald is 2.5:1 (fails AA); navy on emerald is 5.4:1.
  textOnPrimary: palette.navy,
  border: palette.border,
  danger: palette.danger,
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

export const typography = {
  display: { fontSize: 32, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '400' },
} as const;

// Formats a ringgit amount, e.g. 4820.5 -> "RM 4,820.50".
export const formatMYR = (amount: number) =>
  `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
