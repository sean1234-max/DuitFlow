// Single source of truth for DuitFlow brand + design tokens.
// Colors are initial recommendations; change them here and the whole app follows.

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

export const colors = {
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
