import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../contexts/ThemeContext';
import MainTabsScreen from '../screens/MainTabsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SearchScreen from '../screens/SearchScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import AuthStackNavigator from './AuthStackNavigator';
import Sidebar from '../components/Sidebar';
import RightSidebar from '../components/RightSidebar';
import { Post } from '../data/mockData';

export type MainStackParamList = {
  Main: undefined;
  Settings: undefined;
  Search: undefined;
  PostDetail: {
    post: Post;
  };
};

const Stack = createStackNavigator<MainStackParamList>();

const MainStackNavigator: React.FC = () => {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const { isDesktop } = useResponsive();

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  // Si no hay usuario autenticado, mostrar pantallas de autenticación
  if (!user) {
    return <AuthStackNavigator />;
  }

  // Usuario autenticado, mostrar la app principal
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { flex: 1 },
      }}
    >
      <Stack.Screen name="Main" options={{ cardStyle: { flex: 1 } }}>
        {(props) => (
          isDesktop ? (
            <View style={[styles.desktopContainer, { backgroundColor: theme.colors.background }]}>
              <View style={styles.leftSidebar}>
                <Sidebar />
              </View>
              <View style={[styles.mainContent, {
                borderLeftColor: theme.colors.border,
                borderRightColor: theme.colors.border,
              }]}>
                <MainTabsScreen {...props} />
              </View>
              <View style={styles.rightSidebar}>
                <RightSidebar />
              </View>
            </View>
          ) : (
            <MainTabsScreen {...props} />
          )
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Settings"
        options={{
          presentation: 'modal',
        }}
      >
        {(props) => (
          isDesktop ? (
            <View style={[styles.desktopContainer, { backgroundColor: theme.colors.background }]}>
              <View style={styles.leftSidebar}>
                <Sidebar />
              </View>
              <View style={[styles.mainContent, {
                borderLeftColor: theme.colors.border,
                borderRightColor: theme.colors.border,
              }]}>
                <SettingsScreen {...props} />
              </View>
              <View style={styles.rightSidebar}>
                <RightSidebar />
              </View>
            </View>
          ) : (
            <SettingsScreen {...props} />
          )
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Search"
        options={{
          presentation: Platform.OS === 'web' ? 'card' : 'modal',
        }}
      >
        {(props) => (
          isDesktop ? (
            <View style={[styles.desktopContainer, { backgroundColor: theme.colors.background }]}>
              <View style={styles.leftSidebar}>
                <Sidebar />
              </View>
              <View style={[styles.mainContent, {
                borderLeftColor: theme.colors.border,
                borderRightColor: theme.colors.border,
              }]}>
                <SearchScreen {...props} />
              </View>
              <View style={styles.rightSidebar}>
                <RightSidebar />
              </View>
            </View>
          ) : (
            <SearchScreen {...props} />
          )
        )}
      </Stack.Screen>
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  desktopContainer: {
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

export default MainStackNavigator;
