import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { messagesService, Message, ParticipantData } from '../services/messagesService';
import { uploadMessageImageFromUri } from '../services/storageService';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../constants/design';

type ConversationScreenParams = {
  conversationId?: string;
  otherUserId?: string;
  otherUserData?: ParticipantData;
};

const ConversationScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: ConversationScreenParams }, 'params'>>();
  const insets = useSafeAreaInsets();

  const { conversationId: initialConversationId, otherUserId, otherUserData } = route.params || {};

  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Resetear conversationId cuando cambia el otherUserId (nueva conversación)
  useEffect(() => {
    if (otherUserId) {
      console.log('🔄 [ConversationScreen] Cambiando a conversación con:', otherUserId.substring(0, 8));
      setConversationId(undefined);
      setMessages([]);
      setLoading(true);
    }
  }, [otherUserId]);

  // Cargar o crear conversación
  useEffect(() => {
    const initConversation = async () => {
      if (!user || !userProfile) return;

      try {
        let convId = conversationId;

        // Si no tenemos conversationId pero sí otherUserId, crear/buscar conversación
        if (!convId && otherUserId && otherUserData) {
          console.log('🔍 [ConversationScreen] Buscando/creando conversación con:', otherUserId.substring(0, 8));

          const currentUserData: ParticipantData = {
            displayName: userProfile.displayName,
            avatarType: userProfile.avatarType,
            avatarId: userProfile.avatarId,
            photoURL: userProfile.photoURL,
            photoURLThumbnail: userProfile.photoURLThumbnail,
          };

          convId = await messagesService.getOrCreateConversation(
            user.uid,
            otherUserId,
            currentUserData,
            otherUserData
          );

          console.log('✅ [ConversationScreen] Conversación obtenida:', convId.substring(0, 8));
          setConversationId(convId);
        }

        if (convId) {
          // Cargar mensajes iniciales
          const initialMessages = await messagesService.getMessages(convId);
          setMessages(initialMessages);

          // Marcar mensajes como leídos
          await messagesService.markAsRead(convId, user.uid);
        }

        setLoading(false);
      } catch (error) {
        console.error('❌ [ConversationScreen] Error inicializando conversación:', error);
        setLoading(false);
      }
    };

    initConversation();
  }, [user, userProfile, conversationId, otherUserId, otherUserData]);

  // Suscribirse a mensajes en tiempo real
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = messagesService.subscribeToMessages(conversationId, (newMessages) => {
      setMessages(newMessages);

      // Marcar como leído cuando llegan nuevos mensajes
      if (user) {
        messagesService.markAsRead(conversationId, user.uid);
      }

      // Scroll al último mensaje
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => unsubscribe();
  }, [conversationId, user]);

  const handleSendMessage = async (content: string) => {
    if (!conversationId || !user || !content.trim() || sending) return;

    try {
      setSending(true);
      await messagesService.sendMessage(conversationId, user.uid, content.trim());
      setSending(false);

      // Scroll al último mensaje después de enviar
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      setSending(false);
    }
  };

  const handleImagePress = async () => {
    if (!conversationId || !user || sending) return;

    try {
      // Solicitar permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permisos necesarios',
          'Necesitamos permisos para acceder a tus fotos'
        );
        return;
      }

      // Seleccionar imagen
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSending(true);

        // Subir imagen a Firebase Storage
        const imageUrl = await uploadMessageImageFromUri(
          result.assets[0].uri,
          user.uid
        );

        // Enviar mensaje con la imagen
        await messagesService.sendMessage(
          conversationId,
          user.uid,
          'Imagen',
          'image',
          imageUrl
        );

        setSending(false);

        // Scroll al último mensaje
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error enviando imagen:', error);
      Alert.alert('Error', 'No se pudo enviar la imagen');
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (!user) return null;
    return <MessageBubble message={item} isCurrentUser={item.senderId === user.uid} />;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  // Obtener información del otro usuario
  const getOtherUserInfo = () => {
    if (otherUserData) {
      return otherUserData;
    }
    return {
      displayName: 'Usuario',
      avatarType: 'predefined' as const,
      avatarId: 'male',
    };
  };

  const otherUser = getOtherUserInfo();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, {
        backgroundColor: theme.colors.card,
        borderBottomColor: theme.colors.border,
        paddingTop: insets.top + SPACING.sm,
      }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            // Navegar siempre a la lista de mensajes (InboxList)
            navigation.navigate('InboxList' as never);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <AvatarDisplay
            size={36}
            avatarType={otherUser.avatarType || 'predefined'}
            avatarId={otherUser.avatarId || 'male'}
            photoURL={typeof otherUser.photoURL === 'string' ? otherUser.photoURL : undefined}
            photoURLThumbnail={typeof otherUser.photoURLThumbnail === 'string' ? otherUser.photoURLThumbnail : undefined}
            backgroundColor={theme.colors.accent}
            showBorder={false}
          />
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {otherUser.displayName}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Toca para ver perfil
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerAction}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id || `${item.senderId}-${item.timestamp}`}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              Comienza la conversación
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Envía un mensaje para iniciar el chat con {otherUser.displayName}
            </Text>
          </View>
        )}
      />

      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        onImagePress={handleImagePress}
        placeholder="Escribe un mensaje..."
        disabled={sending}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 0.5,
    gap: SPACING.md,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
  },
  headerAction: {
    padding: SPACING.xs,
  },
  messagesList: {
    paddingVertical: SPACING.md,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxxl,
    paddingTop: 60,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.sm,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.base,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: FONT_WEIGHT.regular,
  },
});

export default ConversationScreen;
