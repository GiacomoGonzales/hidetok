import { Platform } from 'react-native';

// Factor de escala para web (90% = 0.9)
const WEB_SCALE_FACTOR = 0.9;

/**
 * Escala un valor numérico en un 10% para web (90% del tamaño original)
 * En mobile mantiene el valor original
 */
export const scale = (value: number): number => {
  if (Platform.OS === 'web') {
    return value * WEB_SCALE_FACTOR;
  }
  return value;
};

/**
 * Escala múltiples valores de un objeto de estilos
 */
export const scaleStyles = <T extends Record<string, any>>(styles: T): T => {
  if (Platform.OS !== 'web') {
    return styles;
  }

  const scaledStyles: any = {};

  for (const key in styles) {
    const value = styles[key];

    if (typeof value === 'number') {
      scaledStyles[key] = value * WEB_SCALE_FACTOR;
    } else if (typeof value === 'object' && value !== null) {
      scaledStyles[key] = scaleStyles(value);
    } else {
      scaledStyles[key] = value;
    }
  }

  return scaledStyles as T;
};
