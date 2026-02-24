import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../contexts/ThemeContext';
import MainTabsScreen from '../screens/MainTabsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SearchScreen from '../screens/SearchScreen';
import CreateScreen from '../screens/CreateScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import CommunityScreen from '../screens/CommunityScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HidiCreationScreen from '../screens/HidiCreationScreen';
import AiAvatarScreen from '../screens/AiAvatarScreen';
import ReelsScreen from '../screens/ReelsScreen';
import AuthStackNavigator from './AuthStackNavigator';
import Sidebar from '../components/Sidebar';
import RightSidebar from '../components/RightSidebar';
import { Post } from '../services/firestoreService';
import { scale } from '../utils/scale';

export type MainStackParamList = {
  Main: undefined;
  Settings: undefined;
  Search: undefined;
  Create: undefined;
  PostDetail: {
    post: Post;
  };
  UserProfile: {
    userId: string;
  };
  Community: {
    communityId: string;
  };
  HidiCreation: undefined;
  AiAvatar: undefined;
  Reels: {
    initialPost: Post;
    initialVideoPosts: Post[];
    communitySlug?: string | null;
    initialPositionMillis?: number;
  };
  Auth: {
    screen?: 'Login' | 'Register';
  } | undefined;
  Login: undefined;
  Register: undefined;
};

const Stack = createStackNavigator<MainStackParamList>();

const MainStackNavigator: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const { theme } = useTheme();
  const { isDesktop } = useResponsive();
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);

  React.useEffect(() => {
    // Después de que authLoading sea false por primera vez, marcar que ya no es carga inicial
    if (!authLoading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [authLoading, isInitialLoad]);

  // Mostrar loading mientras se verifica la autenticación
  // O durante la carga inicial para evitar flash
  if (authLoading || isInitialLoad) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#0A0A0A' }]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  // Si el usuario está autenticado pero necesita completar el onboarding
  // (perfil sin displayName configurado, creado recientemente, o sin comunidades seleccionadas)
  const needsOnboarding = user && userProfile && (
    !userProfile?.displayName ||
    userProfile.displayName === user.email?.split('@')[0] ||
    userProfile.displayName === 'Usuario Anónimo' ||
    !userProfile.hasCompletedCommunityOnboarding
  );

  console.log('🧭 Navigation check:', {
    user: user ? 'exists' : 'null',
    displayName: userProfile?.displayName,
    email: user?.email,
    hasCompletedCommunityOnboarding: userProfile?.hasCompletedCommunityOnboarding,
    joinedCommunities: userProfile?.joinedCommunities?.length,
    needsOnboarding,
  });

  if (needsOnboarding) {
    return <OnboardingScreen />;
  }

  // Mostrar la app principal - tanto para usuarios autenticados como no autenticados
  // La landing page se mostrará y los botones de login/register estarán disponibles
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
          presentation: 'card',
          headerShown: false,
          gestureEnabled: true,
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
        name="Create"
        options={{
          presentation: 'card',
          headerShown: false,
          gestureEnabled: false,
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
                <CreateScreen {...props} />
              </View>
              <View style={styles.rightSidebar}>
                <RightSidebar />
              </View>
            </View>
          ) : (
            <CreateScreen {...props} />
          )
        )}
      </Stack.Screen>
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{
          presentation: 'card',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{
          presentation: 'card',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          presentation: 'card',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="HidiCreation"
        component={HidiCreationScreen}
        options={{
          presentation: 'card',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AiAvatar"
        component={AiAvatarScreen}
        options={{
          presentation: 'card',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Reels"
        component={ReelsScreen}
        options={{
          presentation: 'fullScreenModal',
          headerShown: false,
          cardStyle: { backgroundColor: '#000' },
        }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          presentation: 'modal',
          headerShown: false,
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
  },
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  leftSidebar: {
    width: scale(280),
    borderRightWidth: scale(0.5),
  },
  mainContent: {
    flex: 1,
    minWidth: 0,
    maxWidth: scale(700),
    borderLeftWidth: Platform.OS === 'web' ? scale(0.5) : 0,
    borderRightWidth: Platform.OS === 'web' ? scale(0.5) : 0,
  },
  rightSidebar: {
    width: scale(320),
    borderLeftWidth: scale(0.5),
  },
});

export default MainStackNavigator;
