import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Appearance, ColorSchemeName, Animated, StyleSheet, View } from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Theme {
  dark: boolean;
  colors: {
    primary: string;
    background: string;
    surface: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    accent: string;
    accentLight: string;
    accentDark: string;
    like: string;
    error: string;
    glow: string;
    backdrop: string;
  };
}

const lightTheme: Theme = {
  dark: false,
  colors: {
    primary: '#8B5CF6',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    accent: '#8B5CF6',
    accentLight: '#A78BFA',
    accentDark: '#7C3AED',
    like: '#EF4444',
    error: '#EF4444',
    glow: 'rgba(139, 92, 246, 0.15)',
    backdrop: 'rgba(0, 0, 0, 0.4)',
  },
};

const darkTheme: Theme = {
  dark: true,
  colors: {
    primary: '#8B5CF6',
    background: '#0A0A0A',
    surface: '#1C1C1E',
    card: '#111111',
    text: '#FFFFFF',
    textSecondary: '#98989D',
    border: '#38383A',
    accent: '#8B5CF6',
    accentLight: '#A78BFA',
    accentDark: '#7C3AED',
    like: '#FF6B6B',
    error: '#FF6B6B',
    glow: 'rgba(139, 92, 246, 0.25)',
    backdrop: 'rgba(0, 0, 0, 0.7)',
  },
};

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  // Dos overlays: uno blanco (tapa al ir light→dark), uno negro (tapa al ir dark→light)
  const lightOverlay = useRef(new Animated.Value(0)).current;
  const darkOverlay = useRef(new Animated.Value(0)).current;
  const needsFadeRef = useRef<'light' | 'dark' | null>(null);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  const getEffectiveTheme = (): Theme => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return themeMode === 'dark' ? darkTheme : lightTheme;
  };

  const theme = getEffectiveTheme();

  // Fade-out after theme render
  useEffect(() => {
    if (needsFadeRef.current) {
      const overlay = needsFadeRef.current === 'light' ? lightOverlay : darkOverlay;
      needsFadeRef.current = null;

      Animated.timing(overlay, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  }, [themeMode]);

  const setThemeMode = (mode: ThemeMode) => {
    const currentDark = theme.dark;
    const targetDark = mode === 'dark' || (mode === 'system' && systemColorScheme === 'dark');

    if (currentDark !== targetDark) {
      if (currentDark) {
        // Estamos en dark, vamos a light → tapar con overlay NEGRO
        darkOverlay.setValue(1);
        needsFadeRef.current = 'dark';
      } else {
        // Estamos en light, vamos a dark → tapar con overlay BLANCO
        lightOverlay.setValue(1);
        needsFadeRef.current = 'light';
      }
    }

    setThemeModeState(mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode }}>
      <View style={styles.wrapper}>
        {children}
        <Animated.View
          pointerEvents="none"
          style={[styles.overlay, styles.overlayWhite, { opacity: lightOverlay }]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.overlay, styles.overlayBlack, { opacity: darkOverlay }]}
        />
      </View>
    </ThemeContext.Provider>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  overlayWhite: {
    backgroundColor: '#FFFFFF',
  },
  overlayBlack: {
    backgroundColor: '#0A0A0A',
  },
});

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
