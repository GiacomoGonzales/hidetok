import React from 'react';
import { TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import HomeStackNavigator from './HomeStackNavigator';
import InboxStackNavigator from './InboxStackNavigator';
import ProfileStackNavigator from './ProfileStackNavigator';
import { MainStackParamList } from './MainStackNavigator';
import CustomTabBar from '../components/CustomTabBar';

// Componentes dummy para pestañas que abren modales
const SearchTabPlaceholder = () => null;
const CreateTabPlaceholder = () => null;

const Tab = createBottomTabNavigator();

type TabNavigatorNavigationProp = StackNavigationProp<MainStackParamList>;

// Componentes personalizados para los botones de tab
const SearchTabButton = (props: any) => {
  const navigation = useNavigation<TabNavigatorNavigationProp>();

  return (
    <TouchableOpacity
      {...props}
      onPress={() => {
        console.log('🔍 Search button pressed');
        try {
          const parentNav = navigation.getParent();
          console.log('🔍 Parent navigation:', parentNav ? 'exists' : 'null');
          if (parentNav) {
            console.log('🔍 Navigating to Search...');
            (parentNav as any).navigate('Search');
          } else {
            console.log('🔍 Trying direct navigation...');
            (navigation as any).navigate('Search');
          }
        } catch (error) {
          console.error('🔍 Error navigating to Search:', error);
        }
      }}
    />
  );
};

const CreateTabButton = (props: any) => {
  const navigation = useNavigation<TabNavigatorNavigationProp>();

  return (
    <TouchableOpacity
      {...props}
      onPress={() => {
        console.log('➕ Create button pressed');
        try {
          const parentNav = navigation.getParent();
          console.log('➕ Parent navigation:', parentNav ? 'exists' : 'null');
          if (parentNav) {
            console.log('➕ Navigating to Create...');
            (parentNav as any).navigate('Create');
          } else {
            console.log('➕ Trying direct navigation...');
            (navigation as any).navigate('Create');
          }
        } catch (error) {
          console.error('➕ Error navigating to Create:', error);
        }
      }}
    />
  );
};

const TabNavigator: React.FC = () => {
  const { theme } = useTheme();
  const { isDesktop, isTablet } = useResponsive();
  const insets = useSafeAreaInsets();

  // Calcular padding inferior para Android
  // Si insets.bottom > 0, el sistema ya reporta el safe area (navegación por gestos)
  // Si insets.bottom === 0, puede ser un dispositivo con botones fijos
  const androidBottomPadding = insets.bottom > 0
    ? insets.bottom + 10  // Dispositivo con safe area reportado
    : 15;                 // Dispositivo con botones fijos (padding moderado)

  const androidHeight = insets.bottom > 0
    ? 60 + insets.bottom + 10
    : 75;                 // Altura moderada para botones fijos

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.dark ? 'rgba(10, 10, 10, 0.85)' : 'rgba(255, 255, 255, 0.95)' }]}>
            <BlurView
              intensity={80}
              tint={theme.dark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ),
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Search':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Create':
              iconName = focused ? 'add-circle' : 'add-circle-outline';
              break;
            case 'Inbox':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: (isDesktop || isTablet) ? {
          display: 'none',
        } : {
          backgroundColor: 'transparent',
          borderTopColor: theme.colors.border,
          borderTopWidth: 0.5,
          height: Platform.OS === 'android'
            ? androidHeight
            : Math.max(90, 60 + insets.bottom),
          paddingBottom: Platform.OS === 'android'
            ? androidBottomPadding
            : Math.max(20, insets.bottom),
          paddingTop: 10,
          marginBottom: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
          marginBottom: 0,
          letterSpacing: -0.2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStackNavigator}
        options={{ tabBarLabel: 'Inicio' }}
      />
      <Tab.Screen
        name="Search"
        component={SearchTabPlaceholder}
        options={{
          tabBarLabel: 'Buscar',
          tabBarButton: (props) => <SearchTabButton {...props} />
        }}
      />
      <Tab.Screen
        name="Create"
        component={CreateTabPlaceholder}
        options={{
          tabBarLabel: 'Crear',
          tabBarButton: (props) => <CreateTabButton {...props} />
        }}
      />
      <Tab.Screen 
        name="Inbox" 
        component={InboxStackNavigator}
        options={{ tabBarLabel: 'Inbox' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackNavigator}
        options={{ tabBarLabel: 'Perfil' }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
