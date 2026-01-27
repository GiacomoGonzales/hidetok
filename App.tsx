import React, { useEffect, useState } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert, Platform, StatusBar } from 'react-native';
import * as Linking from 'expo-linking';

import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { UserProfileProvider } from './contexts/UserProfileContext';
import { ScrollProvider } from './contexts/ScrollContext';
import { PushNotificationProvider } from './contexts/PushNotificationContext';
import MainStackNavigator from './navigation/MainStackNavigator';
import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';

// Tema oscuro personalizado para React Navigation
const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0A0A0A',
    card: '#0A0A0A',
    primary: '#8B5CF6',
  },
};

// Prefijo para deep links nativos
const prefix = Linking.createURL('/');

// Configuración de linking para deep links y universal links
const linking: any = {
  prefixes: [
    prefix,
    'hidetok://',
    'https://hidetok.com',
    'https://www.hidetok.com',
    'http://localhost:8082',
  ],
  config: {
    screens: {
      Main: {
        path: '',
        screens: {
          Home: {
            path: 'home',
            screens: {
              Landing: '',
              Feed: 'feed/:communitySlug?',
              HomeFeed: 'all',
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
      PostDetail: {
        path: 'post/:postId',
        parse: {
          postId: (postId: string) => postId,
        },
      },
      UserProfile: {
        path: 'user/:userId',
        parse: {
          userId: (userId: string) => userId,
        },
      },
      Community: {
        path: 'community/:communityId',
        parse: {
          communityId: (communityId: string) => communityId,
        },
      },
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
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    console.log('🚀 App component mounted');
    console.log('📱 Platform:', Platform.OS);
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        <ThemeProvider>
          <AuthProvider>
            <UserProfileProvider>
              <ScrollProvider>
                <NavigationContainer linking={linking} theme={CustomDarkTheme}>
                  <PushNotificationProvider>
                    <MainStackNavigator />
                  </PushNotificationProvider>
                </NavigationContainer>
              </ScrollProvider>
            </UserProfileProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
