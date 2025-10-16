// Sistema de diseño moderno y minimalista para HideTok

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const FONT_SIZE = {
  xs: 12,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const FONT_WEIGHT = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const ICON_SIZE = {
  xs: 16,
  sm: 18,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

export const BUTTON_HEIGHT = {
  sm: 32,
  md: 40,
  lg: 48,
} as const;

export const OPACITY = {
  disabled: 0.5,
  hover: 0.8,
  overlay: 0.6,
} as const;
