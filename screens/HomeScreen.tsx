import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useScroll } from '../contexts/ScrollContext';
import { postsService, Post } from '../services/firestoreService';
import PostCard from '../components/PostCard';
import Header from '../components/Header';
import ResponsiveLayout from '../components/ResponsiveLayout';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import { MainStackParamList } from '../navigation/MainStackNavigator';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

type HomeScreenNavigationProp = StackNavigationProp<MainStackParamList>;

const HomeScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { contentMaxWidth, isDesktop } = useResponsive();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { setIsScrollingDown } = useScroll();
  const [activeTab, setActiveTab] = useState<'following' | 'foryou'>('foryou');
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollY = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // Función de navegación para el header
  const handleSearchPress = () => {
    navigation.navigate('Search');
  };

  // Cargar posts al iniciar
  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const publicPosts = await postsService.getPublicPosts(20);
      setPosts(publicPosts);
    } catch (err) {
      console.error('Error loading posts:', err);
      setError('Error al cargar los posts');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPosts();
    } catch (err) {
      console.error('Error refreshing posts:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleLike = async (postId: string) => {
    if (!postId) return;
    
    // Actualizar UI inmediatamente (optimistic update)
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, likes: post.likes + 1 }
          : post
      )
    );

    try {
      // TODO: Implementar likes en Firestore cuando tengamos la funcionalidad
      // await postsService.likePost(postId, user?.uid);
    } catch (error) {
      console.error('Error liking post:', error);
      // Revertir cambio si hay error
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { ...post, likes: post.likes - 1 }
            : post
        )
      );
    }
  };

  const handleComment = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      navigation.navigate('PostDetail', { post });
    }
  };

  const handlePrivateMessage = (userId: string, userData?: { displayName: string; avatarType?: string; avatarId?: string; photoURL?: string }) => {
    if (!user || user.uid === userId) return; // No enviar mensaje a sí mismo

    // Navegar a la pantalla de conversación en el tab de Inbox
    navigation.navigate('Main' as never, {
      screen: 'Inbox',
      params: {
        screen: 'Conversation',
        params: {
          otherUserId: userId,
          otherUserData: userData,
        },
      },
    } as never);
  };

  const handlePostPress = (post: Post) => {
    // Solo navegar si el post tiene imágenes
    if (post.imageUrls && post.imageUrls.length > 0) {
      navigation.navigate('PostDetail', { post });
    }
  };

  // Manejar el scroll
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDiff = currentScrollY - scrollY.current;

    // Solo detectar scroll si hay un movimiento significativo (más de 5px)
    if (Math.abs(scrollDiff) > scale(5)) {
      const isGoingDown = scrollDiff > 0;
      setIsScrollingDown(isGoingDown);

      // Limpiar timeout previo
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      // Después de 150ms sin scroll, resetear a transparente=false
      scrollTimeout.current = setTimeout(() => {
        setIsScrollingDown(false);
      }, 150);
    }

    scrollY.current = currentScrollY;
  };

  const renderTabButton = (tab: 'following' | 'foryou', label: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[
        styles.tabText,
        { color: activeTab === tab ? theme.colors.accent : theme.colors.textSecondary }
      ]}>
        {label}
      </Text>
      {activeTab === tab && (
        <View style={[
          styles.tabIndicator,
          {
            backgroundColor: theme.colors.accent,
            shadowColor: theme.colors.accent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: scale(4),
          }
        ]} />
      )}
    </TouchableOpacity>
  );

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postContainer}>
      <PostCard
        post={item}
        onLike={handleLike}
        onComment={handleComment}
        onPrivateMessage={handlePrivateMessage}
        onPress={handlePostPress}
      />
    </View>
  );

  // Filtrar posts según la pestaña activa
  const getFilteredPosts = () => {
    if (activeTab === 'following') {
      // TODO: Implementar funcionalidad de "siguiendo" cuando tengamos follows
      return posts; // Por ahora mostrar todos
    }
    return posts; // Para ti: todos los posts
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Cargando posts...
        </Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.text }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[
            styles.retryButton,
            {
              backgroundColor: theme.colors.accent,
              shadowColor: theme.colors.accent,
              shadowOffset: { width: 0, height: scale(3) },
              shadowOpacity: 0.3,
              shadowRadius: scale(8),
            }
          ]}
          onPress={loadPosts}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderHeader = () => (
    <View>
      {/* Header - solo en móvil */}
      {!isDesktop && (
        <Header
          onSearchPress={handleSearchPress}
        />
      )}

      {/* Tabs */}
      <View style={[styles.tabContainer, { borderBottomColor: theme.colors.border }]}>
        {renderTabButton('following', 'Siguiendo')}
        {renderTabButton('foryou', 'Para ti')}
      </View>

      {/* Campo de creación rápida */}
      <TouchableOpacity
        style={[
          styles.quickPostContainer,
          {
            backgroundColor: theme.colors.card,
            shadowColor: theme.dark ? theme.colors.glow : '#000',
            shadowOffset: { width: 0, height: scale(1) },
            shadowOpacity: theme.dark ? 0.15 : 0.05,
            shadowRadius: theme.dark ? scale(8) : scale(4),
          }
        ]}
        onPress={() => navigation.navigate('Create' as never)}
        activeOpacity={0.7}
      >
        <View style={styles.quickPostContent}>
          {userProfile ? (
            <AvatarDisplay
              size={scale(40)}
              avatarType={userProfile.avatarType || 'predefined'}
              avatarId={userProfile.avatarId || 'male'}
              photoURL={userProfile.photoURL}
              backgroundColor={theme.colors.accent}
              showBorder={false}
            />
          ) : (
            <View style={[styles.quickPostAvatar, { backgroundColor: theme.colors.accent }]}>
              <Ionicons name="person" size={scale(20)} color="white" />
            </View>
          )}
          <Text style={[styles.quickPostPlaceholder, { color: theme.colors.textSecondary }]}>
            ¿Qué quieres compartir?
          </Text>
        </View>
        <View style={styles.quickPostActions}>
          <Ionicons name="image-outline" size={scale(20)} color={theme.colors.textSecondary} />
          <Ionicons name="videocam-outline" size={scale(20)} color={theme.colors.textSecondary} />
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Feed */}
      <FlatList
        data={getFilteredPosts()}
        renderItem={renderPost}
        keyExtractor={item => item.id || item.userId}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[
          getFilteredPosts().length === 0 && styles.emptyContainer
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              ¡Sé el primero en publicar!
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              No hay posts aún. Crea el primer post y comienza la conversación.
            </Text>
            <TouchableOpacity
              style={[
                styles.createFirstPostButton,
                {
                  backgroundColor: theme.colors.accent,
                  shadowColor: theme.colors.accent,
                  shadowOffset: { width: 0, height: scale(4) },
                  shadowOpacity: 0.3,
                  shadowRadius: scale(12),
                }
              ]}
              onPress={() => navigation.navigate('Create' as never)}
            >
              <Text style={styles.createFirstPostText}>Crear mi primer post</Text>
            </TouchableOpacity>
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
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: scale(0.5),
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    position: 'relative',
  },
  activeTabButton: {},
  tabText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    letterSpacing: scale(-0.2),
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: scale(3),
  },
  quickPostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    elevation: 1,
  },
  quickPostContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  quickPostAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickPostPlaceholder: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
    letterSpacing: scale(-0.2),
  },
  quickPostActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  postContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
  },
  errorText: {
    fontSize: FONT_SIZE.base,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    fontWeight: FONT_WEIGHT.regular,
  },
  retryButton: {
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    color: 'white',
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: scale(-0.2),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: scale(60),
    paddingHorizontal: SPACING.xxxl,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.md,
    textAlign: 'center',
    letterSpacing: scale(-0.5),
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.base,
    lineHeight: scale(22),
    textAlign: 'center',
    marginBottom: SPACING.xxxl,
    fontWeight: FONT_WEIGHT.regular,
  },
  createFirstPostButton: {
    paddingHorizontal: SPACING.xxxl,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
  },
  createFirstPostText: {
    color: 'white',
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: scale(-0.2),
  },
});

export default HomeScreen;
