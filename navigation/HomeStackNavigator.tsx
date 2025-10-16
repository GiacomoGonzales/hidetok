import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from '../screens/HomeScreen';

export type HomeStackParamList = {
  HomeFeed: undefined;
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
        name="HomeFeed" 
        component={HomeScreen}
      />
    </Stack.Navigator>
  );
};

export default HomeStackNavigator;
