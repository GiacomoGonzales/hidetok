import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useResponsive } from '../hooks/useResponsive';
import { notificationService, Notification, NotificationType } from '../services/notificationService';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import Header from '../components/Header';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

// Función para formatear tiempo relativo
const formatRelativeTime = (timestamp: any): string => {
  if (!timestamp) return '';

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

// Obtener icono y color según tipo de notificación
const getNotificationIcon = (type: NotificationType): { name: string; color: string } => {
  switch (type) {
    case 'like':
      return { name: 'heart', color: '#EF4444' };
    case 'comment':
      return { name: 'chatbubble', color: '#3B82F6' };
    case 'follow':
      return { name: 'person-add', color: '#8B5CF6' };
    case 'repost':
      return { name: 'repeat', color: '#10B981' };
    case 'mention':
      return { name: 'at', color: '#F59E0B' };
    case 'reply':
      return { name: 'arrow-undo', color: '#6366F1' };
    case 'community_post':
      return { name: 'people', color: '#EC4899' };
    default:
      return { name: 'notifications', color: '#6B7280' };
  }
};

// Obtener mensaje según tipo de notificación
const getNotificationMessage = (notification: Notification): string => {
  switch (notification.type) {
    case 'like':
      return 'le gustó tu publicación';
    case 'comment':
      return 'comentó en tu publicación';
    case 'follow':
      return 'comenzó a seguirte';
    case 'repost':
      return 'compartió tu publicación';
    case 'mention':
      return 'te mencionó';
    case 'reply':
      return 'respondió a tu comentario';
    case 'community_post':
      return `publicó en ${notification.communityName || 'una comunidad'}`;
    default:
      return 'interactuó contigo';
  }
};

const NotificationsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { isDesktop } = useResponsive();

  // Usar el UID del perfil activo (real o HIDI)
  const activeUid = userProfile?.uid || user?.uid;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Suscripción en tiempo real a notificaciones del perfil activo
  useEffect(() => {
    if (!activeUid) {
      setLoading(false);
      return;
    }

    console.log('🔔 Suscribiendo a notificaciones para:', activeUid);

    const unsubscribe = notificationService.subscribeToNotifications(
      activeUid,
      (newNotifications) => {
        console.log('🔔 Notificaciones recibidas:', newNotifications.length);
        setNotifications(newNotifications);
        setLoading(false);
        setRefreshing(false);
      },
      50
    );

    return () => {
      console.log('🔔 Desuscribiendo de notificaciones');
      unsubscribe();
    };
  }, [activeUid]);

  const handleNotificationsPress = () => {
    navigation.goBack();
  };

  // Marcar notificación como leída y navegar
  const handleNotificationPress = async (notification: Notification) => {
    // Marcar como leída
    if (!notification.read && notification.id) {
      await notificationService.markAsRead(notification.id);
    }

    // Navegar según el tipo
    if (notification.type === 'follow' && notification.senderId) {
      (navigation as any).navigate('UserProfile', { userId: notification.senderId });
    }
    // Para otros tipos, podrías navegar al post
    // TODO: Implementar navegación al post cuando tengamos PostDetailScreen accesible
  };

  // Marcar todas como leídas
  const handleMarkAllAsRead = async () => {
    if (!activeUid) return;
    await notificationService.markAllAsRead(activeUid);
  };

  // Refresh manual
  const handleRefresh = async () => {
    if (!activeUid) return;
    setRefreshing(true);
    const result = await notificationService.getNotifications(activeUid, 50);
    setNotifications(result.notifications);
    setRefreshing(false);
  };

  // Filtrar notificaciones
  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  // Renderizar notificación
  const renderNotification = ({ item }: { item: Notification }) => {
    const icon = getNotificationIcon(item.type);
    const message = getNotificationMessage(item);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            backgroundColor: item.read ? theme.colors.background : theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationLeft}>
          {/* Avatar con badge de tipo */}
          <View style={styles.avatarContainer}>
            <AvatarDisplay
              size={scale(48)}
              avatarType={item.senderAvatarType || 'predefined'}
              avatarId={item.senderAvatarId || 'male'}
              photoURL={item.senderAvatar}
              backgroundColor={theme.colors.surface}
            />
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: icon.color },
              ]}
            >
              <Ionicons name={icon.name as any} size={scale(12)} color="white" />
            </View>
          </View>

          {/* Contenido */}
          <View style={styles.notificationContent}>
            <Text style={[styles.notificationText, { color: theme.colors.text }]} numberOfLines={2}>
              <Text style={styles.username}>{item.senderName}</Text>{' '}
              {message}
            </Text>

            {/* Preview del contenido */}
            {(item.postContent || item.commentContent) && (
              <Text
                style={[styles.previewText, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                "{item.commentContent || item.postContent}"
              </Text>
            )}

            <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
              {formatRelativeTime(item.createdAt)}
            </Text>
          </View>
        </View>

        {/* Indicador de no leído */}
        {!item.read && (
          <View style={[styles.unreadDot, { backgroundColor: theme.colors.accent }]} />
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Header - solo en móvil */}
      {!isDesktop && <Header onNotificationsPress={handleNotificationsPress} />}

      {/* Título y acciones */}
      <View style={[styles.titleContainer, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Notificaciones
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            style={styles.markAllButton}
            activeOpacity={0.7}
          >
            <Text style={[styles.markAllText, { color: theme.colors.accent }]}>
              Marcar todas
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros */}
      <View style={[styles.filterContainer, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'all' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterText,
              {
                color: filter === 'all' ? theme.colors.accent : theme.colors.textSecondary,
                fontWeight: filter === 'all' ? '600' : '400',
              },
            ]}
          >
            Todas
          </Text>
          {filter === 'all' && (
            <View style={[styles.filterIndicator, { backgroundColor: theme.colors.accent }]} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'unread' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('unread')}
        >
          <Text
            style={[
              styles.filterText,
              {
                color: filter === 'unread' ? theme.colors.accent : theme.colors.textSecondary,
                fontWeight: filter === 'unread' ? '600' : '400',
              },
            ]}
          >
            No leídas {unreadCount > 0 && `(${unreadCount})`}
          </Text>
          {filter === 'unread' && (
            <View style={[styles.filterIndicator, { backgroundColor: theme.colors.accent }]} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id || `notification-${item.createdAt?.seconds}`}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons
              name="notifications-off-outline"
              size={scale(64)}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {filter === 'unread' ? 'Sin notificaciones nuevas' : 'Sin notificaciones'}
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {filter === 'unread'
                ? 'Has leído todas tus notificaciones'
                : 'Cuando alguien interactúe contigo, aparecerá aquí'}
            </Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: scale(0.5),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
  },
  unreadBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  markAllButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  markAllText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: scale(0.5),
  },
  filterButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.lg,
    position: 'relative',
  },
  filterButtonActive: {},
  filterText: {
    fontSize: FONT_SIZE.base,
  },
  filterIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: scale(3),
    borderRadius: BORDER_RADIUS.sm,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: scale(0.5),
    position: 'relative',
  },
  notificationLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  typeBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  notificationContent: {
    flex: 1,
    gap: 2,
  },
  notificationText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  username: {
    fontWeight: FONT_WEIGHT.semibold,
  },
  previewText: {
    fontSize: FONT_SIZE.xs,
    fontStyle: 'italic',
    marginTop: 2,
  },
  time: {
    fontSize: FONT_SIZE.xs,
    marginTop: 4,
  },
  unreadDot: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(80),
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZE.base,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});

export default NotificationsScreen;
