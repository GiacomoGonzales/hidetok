import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert, Platform } from 'react-native';

import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { ScrollProvider } from './contexts/ScrollContext';
import MainStackNavigator from './navigation/MainStackNavigator';
import ErrorBoundary from './components/ErrorBoundary';

// Configuración de linking para web
const linking: any = {
  prefixes: ['http://localhost:8082', 'https://hidetok.app'],
  config: {
    screens: {
      Main: {
        path: '',
        screens: {
          Home: {
            path: 'home',
            screens: {
              HomeFeed: '',
            },
          },
          Create: 'create',
          Inbox: {
            path: 'inbox',
            screens: {
              InboxMain: '',
            },
          },
          Profile: {
            path: 'profile',
            screens: {
              ProfileMain: '',
            },
          },
        },
      },
      Search: 'search',
      Settings: 'settings',
      PostDetail: 'post/:id',
    },
  },
};

// Global error handler
const originalConsoleError = console.error;
console.error = (...args) => {
  originalConsoleError(...args);
  if (__DEV__ && Platform.OS !== 'web') {
    // Solo mostrar alerts en mobile, en web usamos console
    Alert.alert('Error detectado', JSON.stringify(args));
  }
};

// Catch unhandled promise rejections
const handleUnhandledRejection = (event: any) => {
  console.error('🚨 Unhandled Promise Rejection:', event.reason);
  if (__DEV__ && Platform.OS !== 'web') {
    Alert.alert('Promise Rejection', event.reason?.toString() || 'Unknown error');
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
}

export default function App() {
  useEffect(() => {
    console.log('🚀 App component mounted');
    console.log('📱 Platform:', Platform.OS);

    // Test basic functionality
    try {
      console.log('✅ App initialization started');
    } catch (error) {
      console.error('❌ Error in App initialization:', error);
    }
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <ScrollProvider>
              <NavigationContainer linking={linking}>
                <MainStackNavigator />
              </NavigationContainer>
            </ScrollProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
