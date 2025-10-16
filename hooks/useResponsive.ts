import { useState, useEffect } from 'react';
import { Dimensions, Platform, ScaledSize } from 'react-native';

interface ResponsiveValues {
  isWeb: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
  contentMaxWidth: number;
  isLandscape: boolean;
}

const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
} as const;

const CONTENT_MAX_WIDTHS = {
  mobile: '100%',
  tablet: 600,
  desktop: 600,
  wide: 800,
} as const;

/**
 * Hook para manejar diseño responsive en web y mobile
 *
 * Breakpoints:
 * - Mobile: < 768px
 * - Tablet: 768px - 1024px
 * - Desktop: > 1024px
 */
export const useResponsive = (): ResponsiveValues => {
  const [dimensions, setDimensions] = useState<ScaledSize>(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const isWeb = Platform.OS === 'web';
  const { width, height } = dimensions;

  // Determinar tipo de dispositivo basado en ancho
  const isMobile = width < BREAKPOINTS.mobile;
  const isTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
  const isDesktop = width >= BREAKPOINTS.tablet;
  const isLandscape = width > height;

  // Determinar ancho máximo del contenido
  let contentMaxWidth: number | string = '100%';
  if (isDesktop) {
    contentMaxWidth = CONTENT_MAX_WIDTHS.desktop;
  } else if (isTablet) {
    contentMaxWidth = CONTENT_MAX_WIDTHS.tablet;
  }

  return {
    isWeb,
    isMobile,
    isTablet,
    isDesktop,
    width,
    height,
    contentMaxWidth,
    isLandscape,
  };
};

/**
 * Helper para obtener estilos responsive
 */
export const getResponsiveStyle = <T,>(
  mobileStyle: T,
  tabletStyle?: T,
  desktopStyle?: T
): T => {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  if (isDesktop && desktopStyle) return desktopStyle;
  if (isTablet && tabletStyle) return tabletStyle;
  return mobileStyle;
};

export default useResponsive;
