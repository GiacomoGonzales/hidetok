import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { messagesService, Conversation } from '../services/messagesService';
import { InboxStackParamList } from '../navigation/InboxStackNavigator';
import Header from '../components/Header';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';

type InboxScreenNavigationProp = StackNavigationProp<InboxStackParamList, 'InboxList'>;

const InboxScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<InboxScreenNavigationProp>();
  const { isDesktop } = useResponsive();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Función de navegación para el header
  const handleNotificationsPress = () => {
    const parentNav = navigation.getParent()?.getParent();
    if (parentNav) {
      (parentNav as any).navigate('Home', {
        screen: 'HomeFeed',
        params: { screen: 'Notifications' }
      });
    }
  };

  // Cargar conversaciones y suscribirse a cambios en tiempo real
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Suscribirse a conversaciones en tiempo real
    const unsubscribe = messagesService.subscribeToConversations(user.uid, (newConversations) => {
      setConversations(newConversations);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleConversationPress = (conversation: Conversation) => {
    if (!user) return;

    // Obtener datos del otro usuario
    const otherUserId = conversation.participants.find(id => id !== user.uid);
    if (!otherUserId) return;

    const otherUserData = conversation.participantsData[otherUserId];

    navigation.navigate('Conversation', {
      conversationId: conversation.id,
      otherUserId,
      otherUserData,
    });
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
          onPress: async () => {
            try {
              await messagesService.deleteConversation(conversationId);
            } catch (error) {
              console.error('Error eliminando conversación:', error);
              Alert.alert('Error', 'No se pudo eliminar la conversación');
            }
          }
        },
      ]
    );
  };

  const getRelativeTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    if (!user) return null;

    // Obtener datos del otro usuario
    const otherUserId = item.participants.find(id => id !== user.uid);
    if (!otherUserId) return null;

    const otherUserData = item.participantsData[otherUserId];
    if (!otherUserData) return null;

    const lastMessage = item.lastMessage;
    const hasUnread = lastMessage && !lastMessage.read && lastMessage.senderId !== user.uid;

    return (
      <TouchableOpacity
        style={[styles.conversationItem, {
          backgroundColor: hasUnread ? theme.colors.surface : 'transparent',
          borderBottomColor: theme.colors.border,
        }]}
        onPress={() => handleConversationPress(item)}
        onLongPress={() => handleDeleteConversation(item.id!)}
        activeOpacity={0.8}
      >
        <AvatarDisplay
          size={48}
          avatarType={otherUserData.avatarType || 'predefined'}
          avatarId={otherUserData.avatarId || 'male'}
          photoURL={typeof otherUserData.photoURL === 'string' ? otherUserData.photoURL : undefined}
          photoURLThumbnail={typeof otherUserData.photoURLThumbnail === 'string' ? otherUserData.photoURLThumbnail : undefined}
          backgroundColor={theme.colors.accent}
          showBorder={false}
        />

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.participantName, {
              color: theme.colors.text,
              fontWeight: hasUnread ? FONT_WEIGHT.bold : FONT_WEIGHT.semibold,
            }]}>
              {otherUserData.displayName}
            </Text>

            <View style={styles.conversationMeta}>
              {lastMessage && (
                <Text style={[styles.messageTime, { color: theme.colors.textSecondary }]}>
                  {getRelativeTime(lastMessage.timestamp)}
                </Text>
              )}
              {hasUnread && (
                <View style={[styles.unreadBadge, { backgroundColor: theme.colors.accent }]}>
                  <View style={styles.unreadDot} />
                </View>
              )}
            </View>
          </View>

          <View style={styles.messagePreview}>
            {lastMessage ? (
              <Text
                style={[styles.lastMessage, {
                  color: hasUnread ? theme.colors.text : theme.colors.textSecondary,
                  fontWeight: hasUnread ? FONT_WEIGHT.medium : FONT_WEIGHT.regular,
                }]}
                numberOfLines={2}
              >
                {lastMessage.senderId === user.uid ? 'Tú: ' : ''}{lastMessage.content}
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
      <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surface }]}>
        <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.textSecondary} />
      </View>
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
    <View style={[styles.searchContainer, {
      backgroundColor: theme.colors.background,
    }]}>
      <View style={[styles.searchBar, {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
      }]}>
        <Ionicons
          name="search"
          size={18}
          color={theme.colors.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="Buscar en mensajes"
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  // Filtrar conversaciones por búsqueda
  const getFilteredConversations = () => {
    if (!searchQuery.trim()) return conversations;

    return conversations.filter(conversation => {
      const otherUserId = conversation.participants.find(id => id !== user?.uid);
      if (!otherUserId) return false;

      const otherUserData = conversation.participantsData[otherUserId];
      const displayName = otherUserData?.displayName?.toLowerCase() || '';
      const lastMessageContent = conversation.lastMessage?.content?.toLowerCase() || '';
      const query = searchQuery.toLowerCase();

      return displayName.includes(query) || lastMessageContent.includes(query);
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header principal - solo en móvil */}
      {!isDesktop && (
        <Header
          onNotificationsPress={handleNotificationsPress}
          showMessagesIcon={true}
        />
      )}

      {renderHeader()}

      <FlatList
        data={getFilteredConversations()}
        renderItem={renderConversation}
        keyExtractor={item => item.id || ''}
        contentContainerStyle={[
          styles.conversationsList,
          getFilteredConversations().length === 0 && styles.emptyList
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
    paddingVertical: SPACING.xs,
  },
  clearButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  conversationsList: {
    paddingVertical: SPACING.sm,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 0.5,
    gap: SPACING.md,
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
    fontSize: FONT_SIZE.base,
    letterSpacing: -0.2,
  },
  conversationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  messageTime: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.regular,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  unreadDot: {
    width: '100%',
    height: '100%',
  },
  messagePreview: {
    marginRight: SPACING.sm,
  },
  lastMessage: {
    fontSize: FONT_SIZE.sm,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  noMessages: {
    fontSize: FONT_SIZE.sm,
    fontStyle: 'italic',
    fontWeight: FONT_WEIGHT.regular,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: SPACING.xxxl,
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
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.base,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
    fontWeight: FONT_WEIGHT.regular,
  },
  emptyHints: {
    gap: SPACING.lg,
  },
  emptyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  emptyHintText: {
    fontSize: FONT_SIZE.sm,
    flex: 1,
    lineHeight: 18,
    fontWeight: FONT_WEIGHT.regular,
  },
});

export default InboxScreen;
