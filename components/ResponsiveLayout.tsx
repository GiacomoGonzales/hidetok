import React from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  showRightSidebar?: boolean;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  showRightSidebar = true
}) => {
  const { theme } = useTheme();
  const { isDesktop, isTablet } = useResponsive();

  console.log('📐 ResponsiveLayout - isDesktop:', isDesktop, 'isTablet:', isTablet);

  // En móvil, solo mostrar el contenido
  if (!isDesktop && !isTablet) {
    console.log('📐 ResponsiveLayout - Rendering MOBILE layout');
    return <>{children}</>;
  }

  console.log('📐 ResponsiveLayout - Rendering DESKTOP layout');

  // En tablet y desktop, mostrar layout de columnas
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Sidebar izquierda - solo en desktop */}
      {isDesktop && (
        <View style={styles.leftSidebar}>
          <Sidebar />
        </View>
      )}

      {/* Contenido central */}
      <View style={[
        styles.mainContent,
        {
          borderLeftColor: theme.colors.border,
          borderRightColor: theme.colors.border,
        }
      ]}>
        {children}
      </View>

      {/* Sidebar derecha - solo en desktop y si showRightSidebar */}
      {isDesktop && showRightSidebar && (
        <View style={styles.rightSidebar}>
          <RightSidebar />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 1600,
    width: '100%',
    alignSelf: 'center',
  },
  leftSidebar: {
    width: 300,
    borderRightWidth: 0.5,
  },
  mainContent: {
    flex: 1,
    minWidth: 0,
    maxWidth: 700,
    borderLeftWidth: Platform.OS === 'web' ? 0.5 : 0,
    borderRightWidth: Platform.OS === 'web' ? 0.5 : 0,
  },
  rightSidebar: {
    width: 400,
    borderLeftWidth: 0.5,
  },
});

export default ResponsiveLayout;
