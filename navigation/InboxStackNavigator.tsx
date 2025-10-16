import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { User, Message } from '../data/mockData';

import InboxScreen from '../screens/InboxScreen';
import ChatScreen from '../screens/ChatScreen';

export type InboxStackParamList = {
  InboxList: undefined;
  Chat: {
    conversation: {
      id: string;
      participant: User;
      messages: Message[];
    };
  };
};

const Stack = createStackNavigator<InboxStackParamList>();

const InboxStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="InboxList" 
        component={InboxScreen}
      />
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen}
      />
    </Stack.Navigator>
  );
};

export default InboxStackNavigator;
