import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CommunitiesManagementScreen from '../screens/CommunitiesManagementScreen';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Settings: undefined;
  CommunitiesManagement: undefined;
};

const Stack = createStackNavigator<ProfileStackParamList>();

const ProfileStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="CommunitiesManagement" component={CommunitiesManagementScreen} />
    </Stack.Navigator>
  );
};

export default ProfileStackNavigator;
