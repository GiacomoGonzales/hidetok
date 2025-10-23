import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
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

const TabNavigator: React.FC = () => {
  const { theme } = useTheme();
  const { isDesktop, isTablet } = useResponsive();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<TabNavigatorNavigationProp>();

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint={theme.dark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
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
          height: Math.max(65, 50 + insets.bottom),
          paddingBottom: Math.max(20, insets.bottom + 13),
          paddingTop: 6,
          marginBottom: 10,
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
          tabBarButton: (props) => {
            return (
              <TouchableOpacity
                {...props}
                onPress={(e) => {
                  // Prevenir navegación al tab
                  e?.preventDefault();
                  // Abrir el modal de búsqueda
                  navigation.navigate('Search');
                }}
              />
            );
          }
        }}
        listeners={{
          tabPress: (e) => {
            // Prevenir que el tab se active
            e.preventDefault();
          },
        }}
      />
      <Tab.Screen
        name="Create"
        component={CreateTabPlaceholder}
        options={{
          tabBarLabel: 'Crear',
          tabBarButton: (props) => {
            return (
              <TouchableOpacity
                {...props}
                onPress={(e) => {
                  // Prevenir navegación al tab
                  e?.preventDefault();
                  // Abrir el modal de crear
                  navigation.navigate('Create');
                }}
              />
            );
          }
        }}
        listeners={{
          tabPress: (e) => {
            // Prevenir que el tab se active
            e.preventDefault();
          },
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
