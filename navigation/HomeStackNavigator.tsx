import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import LandingScreen from '../screens/LandingScreen';
import HomeScreen from '../screens/HomeScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

export type HomeStackParamList = {
  Landing: undefined;
  Feed: { communityId?: string | null; communitySlug?: string | null } | undefined;
  HomeFeed: undefined;
  Notifications: undefined;
};

const Stack = createStackNavigator<HomeStackParamList>();

const HomeStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Landing"
        component={LandingScreen}
      />
      <Stack.Screen
        name="Feed"
        component={HomeScreen}
      />
      <Stack.Screen
        name="HomeFeed"
        component={HomeScreen}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
      />
    </Stack.Navigator>
  );
};

export default HomeStackNavigator;
