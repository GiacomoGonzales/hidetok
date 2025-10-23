import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { useTheme } from '../contexts/ThemeContext';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

const AuthStackNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.colors.background },
        animationEnabled: true,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          animationTypeForReplace: 'push',
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          animationTypeForReplace: 'push',
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthStackNavigator;
