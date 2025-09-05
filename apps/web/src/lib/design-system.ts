// CivicLens Design System Configuration

// Color Palette - Vibrant colors for anti-corruption platform
export const colors = {
  // Primary: Teal - Trust & transparency
  primary: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#0891b2', // Main primary
    600: '#0e7490',
    700: '#155e75',
    800: '#164e63',
    900: '#134e4a',
  },
  
  // Secondary: Orange - Action & urgency
  secondary: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#ea580c', // Main secondary
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  // Accent: Violet - Innovation & technology
  accent: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#7c3aed', // Main accent
    600: '#7c2d12',
    700: '#6b21a8',
    800: '#581c87',
    900: '#4c1d95',
  },
  
  // Success: Lime - Positive outcomes
  success: {
    50: '#f7fee7',
    100: '#ecfccb',
    200: '#d9f99d',
    300: '#bef264',
    400: '#a3e635',
    500: '#65a30d', // Main success
    600: '#65a30d',
    700: '#4d7c0f',
    800: '#365314',
    900: '#1a2e05',
  },
  
  // Warning: Amber - Caution & attention
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#d97706', // Main warning
    600: '#b45309',
    700: '#92400e',
    800: '#78350f',
    900: '#451a03',
  },
  
  // Error: Red - Danger & high risk
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#dc2626', // Main error
    600: '#b91c1c',
    700: '#991b1b',
    800: '#7f1d1d',
    900: '#450a0a',
  },
  
  // Neutral: Gray - Text & backgrounds
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
};

// Risk Score Color Mapping
export const riskColors = {
  low: colors.success[500],      // 0-30: Green
  medium: colors.warning[500],   // 31-50: Amber
  high: colors.secondary[500],   // 51-70: Orange
  critical: colors.error[500],   // 71-100: Red
};

// Module Color Mapping
export const moduleColors = {
  procureLens: colors.primary[500],    // Teal
  feeCheck: colors.secondary[500],     // Orange
  rtiCopilot: colors.accent[500],      // Violet
  fairLine: colors.error[500],         // Red
  permitPath: colors.warning[500],     // Amber
  wardWallet: colors.success[500],     // Lime
};

// Border Radius System - Rounded corners everywhere
export const borderRadius = {
  none: '0',
  sm: '0.25rem',    // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px - Main radius used everywhere
  '3xl': '1.5rem',  // 24px
  full: '9999px',
};

// Shadow System - Soft shadows with blur
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  colored: {
    primary: `0 10px 15px -3px ${colors.primary[500]}20, 0 4px 6px -4px ${colors.primary[500]}10`,
    secondary: `0 10px 15px -3px ${colors.secondary[500]}20, 0 4px 6px -4px ${colors.secondary[500]}10`,
    accent: `0 10px 15px -3px ${colors.accent[500]}20, 0 4px 6px -4px ${colors.accent[500]}10`,
  },
};

// Animation Timing - 200ms ease transitions
export const transitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
  bounce: '200ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

// Spacing System - 4px base unit
export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
};

// Typography Scale
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    heading: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Monaco', 'Consolas', 'monospace'],
  },
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
};

// Component variants
export const variants = {
  card: {
    default: `rounded-2xl bg-white shadow-lg border border-${colors.neutral[200]}`,
    elevated: `rounded-2xl bg-white shadow-xl border border-${colors.neutral[100]}`,
    colored: {
      primary: `rounded-2xl bg-gradient-to-br from-${colors.primary[50]} to-${colors.primary[100]} border border-${colors.primary[200]}`,
      secondary: `rounded-2xl bg-gradient-to-br from-${colors.secondary[50]} to-${colors.secondary[100]} border border-${colors.secondary[200]}`,
    },
  },
  button: {
    primary: `rounded-2xl bg-${colors.primary[500]} text-white hover:bg-${colors.primary[600]} active:scale-95 transition-all duration-200`,
    secondary: `rounded-2xl bg-${colors.secondary[500]} text-white hover:bg-${colors.secondary[600]} active:scale-95 transition-all duration-200`,
    outline: `rounded-2xl border-2 border-${colors.primary[500]} text-${colors.primary[500]} hover:bg-${colors.primary[50]} active:scale-95 transition-all duration-200`,
  },
  badge: {
    primary: `rounded-full bg-${colors.primary[100]} text-${colors.primary[800]} px-3 py-1 text-sm font-medium`,
    secondary: `rounded-full bg-${colors.secondary[100]} text-${colors.secondary[800]} px-3 py-1 text-sm font-medium`,
    success: `rounded-full bg-${colors.success[100]} text-${colors.success[800]} px-3 py-1 text-sm font-medium`,
    warning: `rounded-full bg-${colors.warning[100]} text-${colors.warning[800]} px-3 py-1 text-sm font-medium`,
    error: `rounded-full bg-${colors.error[100]} text-${colors.error[800]} px-3 py-1 text-sm font-medium`,
  },
};

// Utility functions
export const getRiskScoreColor = (score: number): string => {
  if (score <= 30) return riskColors.low;
  if (score <= 50) return riskColors.medium;
  if (score <= 70) return riskColors.high;
  return riskColors.critical;
};

export const getRiskScoreLabel = (score: number): string => {
  if (score <= 30) return 'Low Risk';
  if (score <= 50) return 'Medium Risk';
  if (score <= 70) return 'High Risk';
  return 'Critical Risk';
};

export const getModuleColor = (module: keyof typeof moduleColors): string => {
  return moduleColors[module] || colors.neutral[500];
};

export const formatCurrency = (amount: number, currency = 'BDT'): string => {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: currency === 'BDT' ? 'BDT' : 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date: Date | number, locale = 'en'): string => {
  return new Intl.DateTimeFormat(locale === 'bn' ? 'bn-BD' : 'en-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};

export const formatRelativeTime = (date: Date | number, locale = 'en'): string => {
  const rtf = new Intl.RelativeTimeFormat(locale === 'bn' ? 'bn-BD' : 'en-BD', {
    numeric: 'auto',
  });
  
  const now = new Date();
  const target = new Date(date);
  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (Math.abs(diffDays) < 1) {
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    return rtf.format(diffHours, 'hour');
  }
  
  return rtf.format(diffDays, 'day');
};