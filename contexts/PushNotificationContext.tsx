import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { pushNotificationService, PushNotificationData } from '../services/pushNotificationService';
import { useAuth } from './AuthContext';

interface PushNotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  registerForPush: () => Promise<void>;
}

const PushNotificationContext = createContext<PushNotificationContextType>({
  expoPushToken: null,
  notification: null,
  registerForPush: async () => {},
});

export const usePushNotifications = () => useContext(PushNotificationContext);

export const PushNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);

  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  // Registrar para push notifications
  const registerForPush = async () => {
    const token = await pushNotificationService.registerForPushNotifications();
    if (token) {
      setExpoPushToken(token);
      // Guardar token en Firestore si hay usuario
      if (user?.uid) {
        await pushNotificationService.savePushToken(user.uid, token);
      }
    }
  };

  // Registrar automáticamente cuando el usuario está autenticado
  useEffect(() => {
    if (user?.uid) {
      registerForPush();
    }
  }, [user?.uid]);

  // Configurar listeners
  useEffect(() => {
    // Listener para notificaciones recibidas (app en primer plano)
    notificationListener.current = pushNotificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('📬 Notificación recibida:', notification);
        setNotification(notification);
      }
    );

    // Listener para cuando el usuario toca una notificación
    responseListener.current = pushNotificationService.addNotificationResponseListener(
      (response) => {
        console.log('👆 Notificación tocada:', response);
        const data = response.notification.request.content.data as PushNotificationData;
        handleNotificationNavigation(data);
      }
    );

    // Verificar si la app fue abierta por una notificación
    pushNotificationService.getLastNotificationResponse().then((response) => {
      if (response) {
        const data = response.notification.request.content.data as PushNotificationData;
        handleNotificationNavigation(data);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // Navegar según el tipo de notificación
  const handleNotificationNavigation = (data: PushNotificationData) => {
    if (!data) return;

    try {
      switch (data.type) {
        case 'like':
        case 'comment':
        case 'mention':
        case 'repost':
        case 'reply':
          if (data.postId) {
            navigation.navigate('PostDetail', { postId: data.postId });
          }
          break;
        case 'follow':
          if (data.senderId) {
            navigation.navigate('UserProfile', { userId: data.senderId });
          }
          break;
        case 'message':
          if (data.conversationId) {
            navigation.navigate('Conversation', { conversationId: data.conversationId });
          }
          break;
        default:
          // Ir a la pantalla de notificaciones
          navigation.navigate('Main', { screen: 'Inbox' });
      }
    } catch (error) {
      console.error('Error navegando desde notificación:', error);
    }
  };

  return (
    <PushNotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        registerForPush,
      }}
    >
      {children}
    </PushNotificationContext.Provider>
  );
};

export default PushNotificationContext;
