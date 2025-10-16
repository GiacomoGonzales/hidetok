import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { 
  mockConversations, 
  mockUsers, 
  Conversation, 
  Message, 
  getRelativeTime, 
  formatNumber 
} from '../data/mockData';
import { InboxStackParamList } from '../navigation/InboxStackNavigator';

type InboxScreenNavigationProp = StackNavigationProp<InboxStackParamList, 'InboxList'>;

const InboxScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<InboxScreenNavigationProp>();
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);

  // Mock messages para cada conversación
  const getMessagesForConversation = (conversationId: string): Message[] => {
    const mockMessages: { [key: string]: Message[] } = {
      'conv1': [
        {
          id: 'msg1',
          conversationId: 'conv1',
          senderId: '2',
          content: 'Hola! Me gustó mucho tu post sobre reflexiones',
          createdAt: new Date(Date.now() - 30 * 60 * 1000),
          isRead: false,
        },
        {
          id: 'msg2',
          conversationId: 'conv1',
          senderId: 'current_user',
          content: '¡Gracias! Me alegra saber que te pareció interesante',
          createdAt: new Date(Date.now() - 25 * 60 * 1000),
          isRead: true,
        },
        {
          id: 'msg3',
          conversationId: 'conv1',
          senderId: '2',
          content: '¿Tienes más pensamientos sobre el anonimato en redes sociales?',
          createdAt: new Date(Date.now() - 20 * 60 * 1000),
          isRead: false,
        },
      ],
      'conv2': [
        {
          id: 'msg4',
          conversationId: 'conv2',
          senderId: 'current_user',
          content: 'Gracias por la recomendación!',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          isRead: true,
        },
        {
          id: 'msg5',
          conversationId: 'conv2',
          senderId: '3',
          content: 'De nada! Espero que te sea útil',
          createdAt: new Date(Date.now() - 90 * 60 * 1000),
          isRead: true,
        },
      ],
    };
    return mockMessages[conversationId] || [];
  };

  const handleConversationPress = (conversation: Conversation) => {
    const messages = getMessagesForConversation(conversation.id);
    const participant = conversation.participants.find(p => p.id !== 'current_user') || conversation.participants[0];
    
    navigation.navigate('Chat', {
      conversation: {
        id: conversation.id,
        participant,
        messages,
      },
    });

    // Marcar como leído
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversation.id 
          ? { ...conv, unreadCount: 0 }
          : conv
      )
    );
  };

  const handleDeleteConversation = (conversationId: string) => {
    Alert.alert(
      'Eliminar conversación',
      '¿Estás seguro de que quieres eliminar esta conversación? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => {
            setConversations(prev => prev.filter(conv => conv.id !== conversationId));
          }
        },
      ]
    );
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const participant = item.participants.find(p => p.id !== 'current_user') || item.participants[0];
    const lastMessage = item.lastMessage;
    const hasUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        style={[styles.conversationItem, { 
          backgroundColor: hasUnread ? theme.colors.surface : 'transparent',
          borderBottomColor: theme.colors.border,
        }]}
        onPress={() => handleConversationPress(item)}
        onLongPress={() => handleDeleteConversation(item.id)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: participant.avatar }}
          style={[styles.participantAvatar, { backgroundColor: theme.colors.surface }]}
        />
        
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.participantName, { 
              color: theme.colors.text,
              fontWeight: hasUnread ? 'bold' : '600',
            }]}>
              {participant.username}
            </Text>
            
            <View style={styles.conversationMeta}>
              {lastMessage && (
                <Text style={[styles.messageTime, { color: theme.colors.textSecondary }]}>
                  {getRelativeTime(lastMessage.createdAt)}
                </Text>
              )}
              {hasUnread && (
                <View style={[styles.unreadBadge, { backgroundColor: theme.colors.accent }]}>
                  <Text style={styles.unreadCount}>
                    {item.unreadCount > 9 ? '9+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.messagePreview}>
            {lastMessage ? (
              <Text 
                style={[styles.lastMessage, { 
                  color: hasUnread ? theme.colors.text : theme.colors.textSecondary,
                  fontWeight: hasUnread ? '500' : 'normal',
                }]} 
                numberOfLines={2}
              >
                {lastMessage.senderId === 'current_user' ? 'Tú: ' : ''}{lastMessage.content}
              </Text>
            ) : (
              <Text style={[styles.noMessages, { color: theme.colors.textSecondary }]}>
                No hay mensajes aún
              </Text>
            )}
          </View>
        </View>

        <Ionicons 
          name="chevron-forward" 
          size={16} 
          color={theme.colors.textSecondary} 
        />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        No tienes conversaciones
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        Las conversaciones privadas aparecerán aquí cuando alguien te escriba o cuando uses "Privado" en una publicación.
      </Text>
      <View style={styles.emptyHints}>
        <View style={styles.emptyHint}>
          <Ionicons name="mail-outline" size={20} color={theme.colors.accent} />
          <Text style={[styles.emptyHintText, { color: theme.colors.textSecondary }]}>
            Toca "Privado" en cualquier post para iniciar una conversación
          </Text>
        </View>
        <View style={styles.emptyHint}>
          <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.accent} />
          <Text style={[styles.emptyHintText, { color: theme.colors.textSecondary }]}>
            Todas las conversaciones son privadas y anónimas
          </Text>
        </View>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={[styles.header, { 
      backgroundColor: theme.colors.background,
      borderBottomColor: theme.colors.border,
    }]}>
      <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
        Mensajes
      </Text>
      <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
        {conversations.length > 0 
          ? `${conversations.length} conversación${conversations.length > 1 ? 'es' : ''}`
          : 'Conversaciones privadas'
        }
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderHeader()}
      
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.conversationsList,
          conversations.length === 0 && styles.emptyList
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  conversationsList: {
    paddingVertical: 8,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
  },
  conversationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageTime: {
    fontSize: 12,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messagePreview: {
    marginRight: 8,
  },
  lastMessage: {
    fontSize: 14,
    lineHeight: 18,
  },
  noMessages: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyHints: {
    gap: 16,
  },
  emptyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyHintText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 18,
  },
});

export default InboxScreen;
