import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { User, Message } from '../data/mockData';
import { ParticipantData } from '../services/messagesService';

import InboxScreen from '../screens/InboxScreen';
import ChatScreen from '../screens/ChatScreen';
import ConversationScreen from '../screens/ConversationScreen';

export type InboxStackParamList = {
  InboxList: undefined;
  Chat: {
    conversation: {
      id: string;
      participant: User;
      messages: Message[];
    };
  };
  Conversation: {
    conversationId?: string;
    otherUserId?: string;
    otherUserData?: ParticipantData;
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
      <Stack.Screen
        name="Conversation"
        component={ConversationScreen}
      />
    </Stack.Navigator>
  );
};

export default InboxStackNavigator;
