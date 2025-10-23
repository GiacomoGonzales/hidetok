// Sistema de diseño moderno y minimalista para HideTok
import { scale } from '../utils/scale';

export const SPACING = {
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(20),
  xxl: scale(24),
  xxxl: scale(32),
} as const;

export const FONT_SIZE = {
  xs: scale(12),
  sm: scale(13),
  base: scale(15),
  md: scale(16),
  lg: scale(18),
  xl: scale(20),
  xxl: scale(24),
  xxxl: scale(32),
} as const;

export const FONT_WEIGHT = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const BORDER_RADIUS = {
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(20),
  full: 9999,
} as const;

export const ICON_SIZE = {
  xs: scale(16),
  sm: scale(18),
  md: scale(20),
  lg: scale(24),
  xl: scale(28),
} as const;

export const BUTTON_HEIGHT = {
  sm: scale(32),
  md: scale(40),
  lg: scale(48),
} as const;

export const OPACITY = {
  disabled: 0.5,
  hover: 0.8,
  overlay: 0.6,
} as const;
