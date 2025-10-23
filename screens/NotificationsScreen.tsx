import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import Header from '../components/Header';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention';
  user: {
    username: string;
    avatar: string;
  };
  content: string;
  time: string;
  read: boolean;
  postImage?: string;
}

// Notificaciones de prueba
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'like',
    user: {
      username: 'usuario_anonimo',
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
    content: 'le gustó tu publicación',
    time: 'Hace 5 min',
    read: false,
    postImage: 'https://picsum.photos/seed/1/200',
  },
  {
    id: '2',
    type: 'comment',
    user: {
      username: 'anonimo123',
      avatar: 'https://i.pravatar.cc/150?img=2',
    },
    content: 'comentó: "¡Excelente post!"',
    time: 'Hace 15 min',
    read: false,
    postImage: 'https://picsum.photos/seed/2/200',
  },
  {
    id: '3',
    type: 'follow',
    user: {
      username: 'persona_oculta',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    content: 'comenzó a seguirte',
    time: 'Hace 1 hora',
    read: false,
  },
  {
    id: '4',
    type: 'mention',
    user: {
      username: 'usuario_secreto',
      avatar: 'https://i.pravatar.cc/150?img=4',
    },
    content: 'te mencionó en un comentario',
    time: 'Hace 2 horas',
    read: true,
    postImage: 'https://picsum.photos/seed/3/200',
  },
  {
    id: '5',
    type: 'like',
    user: {
      username: 'fantasma_digital',
      avatar: 'https://i.pravatar.cc/150?img=5',
    },
    content: 'le gustó tu publicación',
    time: 'Hace 3 horas',
    read: true,
    postImage: 'https://picsum.photos/seed/4/200',
  },
  {
    id: '6',
    type: 'comment',
    user: {
      username: 'ninja_nocturno',
      avatar: 'https://i.pravatar.cc/150?img=6',
    },
    content: 'comentó: "Interesante punto de vista"',
    time: 'Hace 5 horas',
    read: true,
    postImage: 'https://picsum.photos/seed/5/200',
  },
  {
    id: '7',
    type: 'follow',
    user: {
      username: 'sombra_anonima',
      avatar: 'https://i.pravatar.cc/150?img=7',
    },
    content: 'comenzó a seguirte',
    time: 'Ayer',
    read: true,
  },
];

const NotificationsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { isDesktop } = useResponsive();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState(mockNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const handleNotificationsPress = () => {
    navigation.goBack();
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const getIconForType = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return { name: 'heart', color: theme.colors.like };
      case 'comment':
        return { name: 'chatbubble', color: theme.colors.accent };
      case 'follow':
        return { name: 'person-add', color: theme.colors.accent };
      case 'mention':
        return { name: 'at', color: theme.colors.accent };
    }
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const renderNotification = ({ item }: { item: Notification }) => {
    const icon = getIconForType(item.type);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            backgroundColor: item.read ? theme.colors.background : theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
        onPress={() => markAsRead(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationLeft}>
          {/* Avatar con badge de tipo */}
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: item.user.avatar }}
              style={[styles.avatar, { backgroundColor: theme.colors.surface }]}
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
            <Text style={[styles.notificationText, { color: theme.colors.text }]}>
              <Text style={styles.username}>{item.user.username}</Text>{' '}
              {item.content}
            </Text>
            <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
              {item.time}
            </Text>
          </View>
        </View>

        {/* Imagen del post (si existe) */}
        {item.postImage && (
          <Image
            source={{ uri: item.postImage }}
            style={[styles.postThumbnail, { backgroundColor: theme.colors.surface }]}
          />
        )}

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
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Notificaciones
        </Text>
        <TouchableOpacity
          onPress={markAllAsRead}
          style={styles.markAllButton}
          activeOpacity={0.7}
        >
          <Text style={[styles.markAllText, { color: theme.colors.accent }]}>
            Marcar todas
          </Text>
        </TouchableOpacity>
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
            No leídas
          </Text>
          {filter === 'unread' && (
            <View style={[styles.filterIndicator, { backgroundColor: theme.colors.accent }]} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons
              name="notifications-off-outline"
              size={scale(64)}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No hay notificaciones nuevas
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
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: scale(0.5),
  },
  title: {
    fontSize: FONT_SIZE.xxl,
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
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  avatar: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
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
  },
  notificationText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
    marginBottom: scale(4),
  },
  username: {
    fontWeight: FONT_WEIGHT.semibold,
  },
  time: {
    fontSize: FONT_SIZE.xs,
  },
  postThumbnail: {
    width: scale(48),
    height: scale(48),
    borderRadius: BORDER_RADIUS.sm,
    marginLeft: SPACING.md,
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
  emptyText: {
    fontSize: FONT_SIZE.base,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
});

export default NotificationsScreen;
