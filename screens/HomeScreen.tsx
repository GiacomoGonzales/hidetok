import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { DocumentSnapshot } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useScroll } from '../contexts/ScrollContext';
import { useResponsive } from '../hooks/useResponsive';
import { useUserProfile } from '../contexts/UserProfileContext';
import { postsService, Post } from '../services/firestoreService';
import { useCommunities } from '../hooks/useCommunities';
import { preloadCommunities } from '../hooks/useCommunityById';
import { Community } from '../services/communityService';
import PostCard from '../components/PostCard';
import Header from '../components/Header';
import ResponsiveLayout from '../components/ResponsiveLayout';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import { HomeStackParamList } from '../navigation/HomeStackNavigator';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList>;
type HomeScreenRouteProp = RouteProp<HomeStackParamList, 'Feed'>;

const HomeScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { scrollToTopTrigger } = useScroll();
  const { contentMaxWidth, isDesktop } = useResponsive();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const route = useRoute<HomeScreenRouteProp>();
  const insets = useSafeAreaInsets();

  // Obtener communityId o communitySlug de los parametros de navegacion (desde Landing o Create)
  const paramCommunityId = route.params?.communityId ?? null;
  const paramCommunitySlug = route.params?.communitySlug ?? null;
  const isFromLanding = route.name === 'Feed';

  // Communities
  const { officialCommunities, isLoading: communitiesLoading, getCommunityBySlug } = useCommunities(user?.uid);

  // Resolver el slug inicial de la comunidad
  const resolveInitialCommunitySlug = (): string | null => {
    // Si viene communitySlug directamente, usarlo
    if (paramCommunitySlug) return paramCommunitySlug;
    // Si viene communityId, intentar encontrar la comunidad por id o tratarlo como slug
    if (paramCommunityId) {
      const community = officialCommunities.find(c => c.id === paramCommunityId || c.slug === paramCommunityId);
      return community?.slug ?? paramCommunityId; // Usar el paramCommunityId como slug si no encuentra
    }
    return null;
  };

  const [selectedCommunitySlug, setSelectedCommunitySlug] = useState<string | null>(resolveInitialCommunitySlug());

  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false); // Loading suave al cambiar de comunidad
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const flatListRef = React.useRef<FlatList>(null);
  const currentScrollPosition = useRef(0);
  const [visiblePostIds, setVisiblePostIds] = useState<Set<string>>(new Set());

  // Detectar qué posts están visibles en pantalla
  const viewabilityConfigCallbackPairs = useRef([
    {
      viewabilityConfig: { itemVisiblePercentThreshold: 50 },
      onViewableItemsChanged: ({ viewableItems }: { viewableItems: Array<{ item: Post; isViewable: boolean }> }) => {
        const ids = new Set<string>();
        viewableItems.forEach((entry) => {
          if (entry.item.id) {
            ids.add(entry.item.id);
          }
        });
        setVisiblePostIds(ids);
      },
    },
  ]).current;

  // Cache de posts por comunidad para carga instantánea
  const postsCache = useRef<Map<string, { posts: Post[]; lastDoc: DocumentSnapshot | null; timestamp: number }>>(new Map());
  const CACHE_DURATION = 60000; // 1 minuto de validez del cache

  // Función de navegación para el header
  const handleNotificationsPress = () => {
    navigation.navigate('Notifications' as any);
  };

  // Scroll to top cuando se dispara el trigger
  useEffect(() => {
    if (scrollToTopTrigger > 0 && flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [scrollToTopTrigger]);

  // Sincronizar el slug de la comunidad desde los parametros de navegacion
  useEffect(() => {
    if (isFromLanding) {
      if (paramCommunitySlug) {
        setSelectedCommunitySlug(paramCommunitySlug);
      } else if (paramCommunityId) {
        // Si viene communityId, buscar la comunidad y usar su slug
        const community = officialCommunities.find(c => c.id === paramCommunityId || c.slug === paramCommunityId);
        setSelectedCommunitySlug(community?.slug ?? paramCommunityId);
      }
    }
  }, [paramCommunityId, paramCommunitySlug, isFromLanding, officialCommunities]);

  // Validar que la comunidad seleccionada exista por slug, si no, resetear a "Todas"
  // Solo resetear si es una comunidad oficial que no se encontró (las de usuario se permiten siempre)
  useEffect(() => {
    if (selectedCommunitySlug && !communitiesLoading) {
      const existsInAll = officialCommunities.some(c => c.slug === selectedCommunitySlug);
      // Si no existe en oficiales, verificar si es un slug válido que viene de parámetros
      // (comunidad de usuario) — en ese caso no resetear
      if (!existsInAll && !paramCommunitySlug && !paramCommunityId) {
        setSelectedCommunitySlug(null);
      }
    }
  }, [selectedCommunitySlug, officialCommunities, communitiesLoading, paramCommunitySlug, paramCommunityId]);

  // Precargar comunidades en el cache para que PostCard las muestre rápido
  useEffect(() => {
    if (officialCommunities.length > 0) {
      preloadCommunities(officialCommunities);
    }
  }, [officialCommunities]);

  // Referencia para saber si es la primera carga
  const isFirstLoad = useRef(true);

  // Cargar posts al iniciar y cuando cambia la comunidad seleccionada
  useEffect(() => {
    loadPosts(isFirstLoad.current);
    isFirstLoad.current = false;
  }, [selectedCommunitySlug]);

  // Scroll to top cuando se toca el tab de Home estando ya en Home
  // Si ya está arriba, refrescar la página
  useEffect(() => {
    const parentNavigation = navigation.getParent();
    if (!parentNavigation) return;

    const unsubscribe = parentNavigation.addListener('tabPress', (e: any) => {
      // Solo hacer scroll si el tab presionado es Home
      if (e.target?.includes('Home')) {
        // Si ya estamos arriba (menos de 50px), refrescar
        if (currentScrollPosition.current < 50) {
          onRefresh();
        } else {
          // Si no, hacer scroll arriba
          if (flatListRef.current) {
            flatListRef.current.scrollToOffset({ offset: 0, animated: true });
          }
        }
      }
    });

    return unsubscribe;
  }, [navigation]);

  const loadPosts = async (isInitial = false, forceRefresh = false) => {
    const cacheKey = selectedCommunitySlug || 'all';
    const cached = postsCache.current.get(cacheKey);
    const now = Date.now();

    // Si hay cache válido y no es refresh forzado, mostrar cache instantáneamente
    if (cached && !forceRefresh && (now - cached.timestamp < CACHE_DURATION)) {
      setPosts(cached.posts);
      setLastDoc(cached.lastDoc);
      setHasMore(cached.posts.length === 15);
      setLoading(false);
      setFiltering(false);
      return;
    }

    // Si hay cache pero está expirado, mostrar el cache mientras carga nuevos datos
    if (cached && !isInitial) {
      setPosts(cached.posts);
      setLastDoc(cached.lastDoc);
    }

    try {
      // Solo mostrar loading completo en la carga inicial sin cache
      if (isInitial && !cached) {
        setLoading(true);
      } else if (!cached) {
        setFiltering(true);
      }
      setError(null);

      let result;
      if (selectedCommunitySlug) {
        result = await postsService.getByCommunitySlugPaginated(selectedCommunitySlug, 15);
      } else {
        result = await postsService.getPublicPostsPaginated(15);
      }

      const documents = result?.documents || [];

      // Guardar en cache
      postsCache.current.set(cacheKey, {
        posts: documents,
        lastDoc: result?.lastDoc || null,
        timestamp: now,
      });

      setPosts(documents);
      setLastDoc(result?.lastDoc || null);
      setHasMore(documents.length === 15);
    } catch (err) {
      console.error('Error loading posts:', err);
      // Solo mostrar error si no hay cache
      if (!cached) {
        setError('Error al cargar los posts');
      }
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  };

  const loadMorePosts = async () => {
    if (loadingMore || !hasMore || loading || !lastDoc) return;

    try {
      setLoadingMore(true);

      let result;
      if (selectedCommunitySlug) {
        result = await postsService.getByCommunitySlugPaginated(selectedCommunitySlug, 15, lastDoc);
      } else {
        result = await postsService.getPublicPostsPaginated(15, lastDoc);
      }

      const documents = result?.documents || [];
      if (documents.length > 0) {
        setPosts([...posts, ...documents]);
        setLastDoc(result?.lastDoc || null);
        setHasMore(documents.length === 15);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more posts:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setHasMore(true);
    setLastDoc(null);

    const cacheKey = selectedCommunitySlug || 'all';
    const now = Date.now();

    try {
      let result;
      if (selectedCommunitySlug) {
        result = await postsService.getByCommunitySlugPaginated(selectedCommunitySlug, 15);
      } else {
        result = await postsService.getPublicPostsPaginated(15);
      }
      const documents = result?.documents || [];

      // Actualizar cache
      postsCache.current.set(cacheKey, {
        posts: documents,
        lastDoc: result?.lastDoc || null,
        timestamp: now,
      });

      setPosts(documents);
      setLastDoc(result?.lastDoc || null);
      setHasMore(documents.length === 15);
      setError(null);
    } catch (err) {
      console.error('Error refreshing posts:', err);
      setError('Error al cargar los posts');
    } finally {
      setRefreshing(false);
    }
  }, [selectedCommunitySlug]);

  const handleComment = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      const parentNavigation = navigation.getParent();
      if (parentNavigation) {
        (parentNavigation as any).navigate('PostDetail', { post });
      }
    }
  };

  const handlePrivateMessage = (userId: string, userData?: { displayName: string; avatarType?: string; avatarId?: string; photoURL?: string; photoURLThumbnail?: string }) => {
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
    // Navegar al detalle del post
    const parentNavigation = navigation.getParent();
    if (parentNavigation) {
      (parentNavigation as any).navigate('PostDetail', { post });
    }
  };

  // Obtener las comunidades del usuario para el filtro
  const getUserCommunities = useCallback(() => {
    if (!userProfile?.joinedCommunities) return [];
    return officialCommunities.filter(c => c.id && userProfile.joinedCommunities.includes(c.id));
  }, [officialCommunities, userProfile?.joinedCommunities]);

  const handleCommunitySelect = (communitySlug: string | null) => {
    console.log('🎯 Community selected:', communitySlug);
    setSelectedCommunitySlug(communitySlug);
    // Reset pagination
    setLastDoc(null);
    setHasMore(true);
  };

  const renderCommunityTab = (community: Community | null, label?: string) => {
    const isSelected = community?.slug ? selectedCommunitySlug === community.slug : selectedCommunitySlug === null;

    return (
      <TouchableOpacity
        key={community?.slug || 'all'}
        style={[
          styles.communityTab,
          {
            backgroundColor: isSelected ? `${theme.colors.accent}15` : theme.colors.surface,
            borderColor: isSelected ? theme.colors.accent : theme.colors.border,
          },
        ]}
        onPress={() => handleCommunitySelect(community?.slug || null)}
        activeOpacity={0.7}
      >
        {community ? (
          <>
            <Ionicons
              name={community.icon as any}
              size={scale(16)}
              color={isSelected ? theme.colors.accent : theme.colors.text}
            />
            <Text
              style={[
                styles.communityTabText,
                { color: isSelected ? theme.colors.accent : theme.colors.text },
              ]}
              numberOfLines={1}
            >
              {community.name}
            </Text>
          </>
        ) : (
          <>
            <Ionicons
              name="globe-outline"
              size={scale(16)}
              color={isSelected ? theme.colors.accent : theme.colors.text}
            />
            <Text
              style={[
                styles.communityTabText,
                { color: isSelected ? theme.colors.accent : theme.colors.text },
              ]}
            >
              {label || 'Todas'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderCommunitySelector = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.communityTabsContainer}
    >
      {renderCommunityTab(null, 'Todas')}
      {officialCommunities.map(community => renderCommunityTab(community))}
    </ScrollView>
  );

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postContainer}>
      <PostCard
        post={item}
        onComment={handleComment}
        onPrivateMessage={handlePrivateMessage}
        onPress={handlePostPress}
        isVisible={visiblePostIds.has(item.id || '')}
      />
    </View>
  );

  // Obtener la comunidad seleccionada
  const getSelectedCommunity = () => {
    if (!selectedCommunitySlug) return null;
    return getCommunityBySlug(selectedCommunitySlug) || null;
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

  // Funcion para volver a la landing
  const handleBackToLanding = () => {
    navigation.goBack();
  };

  // Obtener nombre de la comunidad seleccionada
  const getSelectedCommunityName = () => {
    if (!selectedCommunitySlug) return 'Todas las comunidades';
    const community = getCommunityBySlug(selectedCommunitySlug);
    return community?.name || selectedCommunitySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Determinar si la comunidad seleccionada es de usuario (no oficial)
  const isUserCommunityFeed = selectedCommunitySlug
    ? !officialCommunities.some(c => c.slug === selectedCommunitySlug)
    : false;

  const renderListHeader = () => (
    <View>
      {/* Community tabs dentro del FlatList */}
      {!isDesktop && !isUserCommunityFeed && (
        <View style={[styles.communityTabContainer, { borderBottomColor: theme.colors.border }]}>
          {renderCommunitySelector()}
        </View>
      )}
      {/* Indicador de filtrado */}
      {filtering && (
        <View style={styles.filteringIndicator}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header fijo arriba (NO absolute, layout normal) */}
      {!isDesktop && (
        <View style={{ backgroundColor: theme.colors.background }}>
          {isFromLanding ? (
            <View style={[styles.feedHeader, { paddingTop: insets.top + SPACING.sm }]}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackToLanding}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={scale(24)} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={[styles.feedHeaderTitle, { color: theme.colors.text }]} numberOfLines={1}>
                {getSelectedCommunityName()}
              </Text>
              <View style={styles.headerSpacer} />
            </View>
          ) : (
            <Header onNotificationsPress={handleNotificationsPress} />
          )}
        </View>
      )}

      {/* Feed con pull-to-refresh */}
      <FlatList
        ref={flatListRef}
        data={posts}
        extraData={visiblePostIds}
        renderItem={renderPost}
        keyExtractor={item => item.id || item.userId}
        contentContainerStyle={[
          posts.length === 0 && styles.emptyContainer
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          currentScrollPosition.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={() =>
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={[styles.loadingMoreText, { color: theme.colors.textSecondary }]}>
                Cargando más posts...
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={() =>
          filtering ? null : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {selectedCommunitySlug ? 'Sin publicaciones' : '¡Sé el primero en publicar!'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              {selectedCommunitySlug
                ? 'Esta comunidad aún no tiene posts. ¡Sé el primero!'
                : 'No hay posts aún. Crea el primer post y comienza la conversación.'}
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
              onPress={() => (navigation as any).navigate('Create')}
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
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  feedHeaderTitle: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: scale(32),
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
  communityTabContainer: {
    borderBottomWidth: scale(0.5),
  },
  communityTabsContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  communityTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  communityTabText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
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
  filteringIndicator: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  loadingMore: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMoreText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.sm,
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
