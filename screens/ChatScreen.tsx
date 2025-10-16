import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { Message, User, getRelativeTime } from '../data/mockData';

interface ChatScreenProps {
  route: {
    params: {
      conversation: {
        id: string;
        participant: User;
        messages: Message[];
      };
    };
  };
  navigation: {
    goBack: () => void;
  };
}

const ChatScreen: React.FC<ChatScreenProps> = ({ route, navigation }) => {
  const { conversation } = route.params;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>(conversation.messages);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const currentUserId = 'current_user';

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: `msg_${Date.now()}`,
        conversationId: conversation.id,
        senderId: currentUserId,
        content: newMessage.trim(),
        createdAt: new Date(),
        isRead: true,
      };

      setMessages(prev => [...prev, message]);
      setNewMessage('');

      // Simular respuesta automática después de 2 segundos
      setTimeout(() => {
        const autoReply: Message = {
          id: `msg_auto_${Date.now()}`,
          conversationId: conversation.id,
          senderId: conversation.participant.id,
          content: getRandomAutoReply(),
          createdAt: new Date(),
          isRead: false,
        };
        setMessages(prev => [...prev, autoReply]);
      }, 2000);
    }
  };

  const getRandomAutoReply = (): string => {
    const replies = [
      "¡Interesante punto de vista! 🤔",
      "Totalmente de acuerdo contigo",
      "No había pensado en eso antes",
      "¿Podrías contarme más sobre eso?",
      "Gracias por compartir eso conmigo",
      "Eso suena muy bien 👍",
      "Me parece una gran idea",
      "¿Y tú qué opinas al respecto?",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isCurrentUser = item.senderId === currentUserId;
    const isLastMessage = index === messages.length - 1;
    const showTime = index === 0 || 
      Math.abs(new Date(item.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime()) > 5 * 60 * 1000; // 5 minutos

    return (
      <View style={styles.messageContainer}>
        {showTime && (
          <Text style={[styles.messageTime, { color: theme.colors.textSecondary }]}>
            {getRelativeTime(item.createdAt)}
          </Text>
        )}
        
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          {
            backgroundColor: isCurrentUser ? theme.colors.accent : theme.colors.surface,
            alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
          }
        ]}>
          <Text style={[
            styles.messageText,
            { color: isCurrentUser ? 'white' : theme.colors.text }
          ]}>
            {item.content}
          </Text>
        </View>

        {isLastMessage && isCurrentUser && (
          <View style={styles.messageStatus}>
            <Ionicons 
              name="checkmark-done" 
              size={14} 
              color={item.isRead ? theme.colors.accent : theme.colors.textSecondary} 
            />
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Image
        source={{ uri: conversation.participant.avatar }}
        style={[styles.emptyAvatar, { backgroundColor: theme.colors.surface }]}
      />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        Chat con {conversation.participant.username}
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        Este es el inicio de tu conversación privada
      </Text>
      <Text style={[styles.emptyHint, { color: theme.colors.textSecondary }]}>
        Recuerda mantener el respeto y la privacidad 🤝
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { 
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.border,
        paddingTop: insets.top,
      }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={navigation.goBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Image
            source={{ uri: conversation.participant.avatar }}
            style={[styles.headerAvatar, { backgroundColor: theme.colors.surface }]}
          />
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {conversation.participant.username}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Usuario anónimo
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.optionsButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        style={styles.messagesList}
        contentContainerStyle={[
          styles.messagesContent,
          messages.length === 0 && styles.emptyMessagesContent,
          { paddingBottom: keyboardHeight > 0 ? 20 : 0 }
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Message Input */}
      <View style={[styles.inputContainer, { 
        backgroundColor: theme.colors.background,
        borderTopColor: theme.colors.border,
        paddingBottom: Math.max(insets.bottom, 16) + (keyboardHeight > 0 ? 16 : 0),
        transform: [{ translateY: keyboardHeight > 0 ? -keyboardHeight + insets.bottom + 16 : 0 }],
      }]}>
        <View style={[styles.inputWrapper, { 
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        }]}>
          <TextInput
            style={[styles.textInput, { color: theme.colors.text }]}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={theme.colors.textSecondary}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
            textAlignVertical="center"
          />
          <TouchableOpacity
            style={[styles.sendButton, { 
              backgroundColor: newMessage.trim() ? theme.colors.accent : theme.colors.surface,
              opacity: newMessage.trim() ? 1 : 0.5,
            }]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim()}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="send" 
              size={18} 
              color={newMessage.trim() ? 'white' : theme.colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
  },
  optionsButton: {
    padding: 4,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  emptyMessagesContent: {
    flex: 1,
    justifyContent: 'center',
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageTime: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 4,
  },
  currentUserBubble: {
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageStatus: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginRight: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 12,
    textAlign: 'center',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
    paddingVertical: 8,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChatScreen;
