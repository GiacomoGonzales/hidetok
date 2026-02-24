import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Share,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useUserById, updateUserCache } from '../hooks/useUserById';
import { useFollow } from '../hooks/useFollow';
import { postsService, Post, repostsService } from '../services/firestoreService';
import { likesService } from '../services/likesService';
import { formatNumber } from '../data/mockData';
import { MainStackParamList } from '../navigation/MainStackNavigator';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import PostCard from '../components/PostCard';
import ImageViewer from '../components/ImageViewer';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

type UserProfileScreenRouteProp = RouteProp<MainStackParamList, 'UserProfile'>;
type UserProfileScreenNavigationProp = StackNavigationProp<MainStackParamList, 'UserProfile'>;

const UserProfileScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile: currentUserProfile, updateLocalProfile } = useUserProfile();
  const navigation = useNavigation<UserProfileScreenNavigationProp>();
  const route = useRoute<UserProfileScreenRouteProp>();
  const insets = useSafeAreaInsets();

  const { userId } = route.params;

  // Obtener datos del usuario
  const { userProfile, loading: profileLoading, error: profileError } = useUserById(userId);

  // Hook de follow
  const { isFollowing, toggleFollow, isToggling, canFollow } = useFollow(userId);

  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userReposts, setUserReposts] = useState<Post[]>([]);
  const [userLikedPosts, setUserLikedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'reposts' | 'photos' | 'polls' | 'likes'>('posts');
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);

  // Cargar posts del usuario
  useEffect(() => {
    const loadUserPosts = async () => {
      if (!userId) return;

      try {
        setLoadingPosts(true);
        setPostsError(null);
        console.log('🔍 Cargando posts del usuario:', userId);

        // Cargar cada servicio por separado para identificar errores
        console.log('📋 Cargando posts propios...');
        let posts: Post[] = [];
        try {
          posts = await postsService.getByUserId(userId);
          console.log('📋 Posts encontrados:', posts.length);
        } catch (e) {
          console.error('❌ Error cargando posts:', e);
        }

        console.log('🔄 Cargando reposts...');
        let reposts: Post[] = [];
        try {
          reposts = await repostsService.getUserReposts(userId);
          console.log('🔄 Reposts encontrados:', reposts.length);
        } catch (e) {
          console.error('❌ Error cargando reposts:', e);
        }

        console.log('❤️ Cargando liked posts...');
        let likedPosts: Post[] = [];
        try {
          likedPosts = await likesService.getUserLikedPostsWithData(userId);
          console.log('❤️ Liked posts encontrados:', likedPosts.length);
        } catch (e) {
          console.error('❌ Error cargando liked posts:', e);
        }

        setUserPosts(posts);
        setUserReposts(reposts);
        setUserLikedPosts(likedPosts);
      } catch (error) {
        console.error('Error loading user posts:', error);
        setPostsError('Error al cargar las publicaciones');
      } finally {
        setLoadingPosts(false);
      }
    };

    loadUserPosts();
  }, [userId]);

  const handleShareProfile = async () => {
    if (!userProfile) return;

    try {
      await Share.share({
        message: `¡Mira el perfil de @${userProfile.displayName} en HideTok!\n\n${userProfile.bio || 'Usuario de HideTok'}`,
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
    }
  };

  const handleSendMessage = () => {
    if (!userProfile) return;

    // Navegar a la pantalla de conversación dentro del tab de Inbox
    navigation.navigate('Main', {
      screen: 'Inbox',
      params: {
        screen: 'Conversation',
        params: {
          otherUserId: userProfile.uid,
          otherUserData: {
            displayName: userProfile.displayName,
            avatarType: userProfile.avatarType,
            avatarId: userProfile.avatarId,
            photoURL: userProfile.photoURL,
          },
        },
      },
    } as any);
  };

  const handlePostPress = (post: Post) => {
    navigation.navigate('PostDetail', { post });
  };

  const handleVideoPress = useCallback((post: Post, positionMillis?: number) => {
    const videoPosts = userPosts.filter(p => !!p.videoUrl);
    (navigation as any).navigate('Reels', {
      initialPost: post,
      initialVideoPosts: videoPosts,
      communitySlug: null,
      initialPositionMillis: positionMillis,
    });
  }, [userPosts, navigation]);

  // Abrir visor de foto de perfil
  const handleAvatarLongPress = () => {
    if (userProfile?.avatarType === 'custom' && userProfile?.photoURL) {
      setShowAvatarViewer(true);
    }
  };

  const handleComment = (postId: string) => {
    const post = [...userPosts, ...userReposts, ...userLikedPosts].find(p => p.id === postId);
    if (post) {
      navigation.navigate('PostDetail', { post });
    }
  };

  const handlePrivateMessage = (userId: string) => {
    navigation.navigate('Main', {
      screen: 'Inbox',
      params: {
        screen: 'Conversation',
        params: {
          otherUserId: userId,
          otherUserData: {
            displayName: userProfile?.displayName,
            avatarType: userProfile?.avatarType,
            avatarId: userProfile?.avatarId,
            photoURL: userProfile?.photoURL,
          },
        },
      },
    } as any);
  };

  // Función para filtrar posts según la pestaña activa
  const getFilteredPosts = () => {
    switch (activeTab) {
      case 'posts':
        return userPosts;
      case 'reposts':
        return userReposts;
      case 'photos':
        return userPosts.filter(post => (post.imageUrls && post.imageUrls.length > 0) || post.videoUrl);
      case 'polls':
        return userPosts.filter(post => post.poll);
      case 'likes':
        return userLikedPosts;
      default:
        return userPosts;
    }
  };

  const renderTabButton = (
    tab: 'posts' | 'reposts' | 'photos' | 'polls' | 'likes',
    icon: string,
    label: string
  ) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === tab && { borderBottomColor: theme.colors.accent, borderBottomWidth: 2 }
      ]}
      onPress={() => setActiveTab(tab)}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={activeTab === tab ? theme.colors.accent : theme.colors.textSecondary}
      />
      <Text
        style={[
          styles.tabButtonText,
          {
            color: activeTab === tab ? theme.colors.accent : theme.colors.textSecondary,
            fontWeight: activeTab === tab ? '600' : '400',
          }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const handleToggleFollow = async () => {
    if (!userProfile || !currentUserProfile) return;

    // Optimistic update del cache
    const wasFollowing = isFollowing;
    const currentFollowers = userProfile.followers || 0;
    const newFollowers = Math.max(0, currentFollowers + (wasFollowing ? -1 : 1));

    // Actualizar el contador de "following" del usuario actual (yo)
    const currentFollowing = currentUserProfile.following || 0;
    const newFollowing = Math.max(0, currentFollowing + (wasFollowing ? -1 : 1));

    // Actualizar cache del perfil que estamos viendo
    updateUserCache(userId, { followers: newFollowers });

    // Actualizar el perfil del usuario actual (mi contador de "siguiendo")
    updateLocalProfile({ following: newFollowing });

    try {
      await toggleFollow();
      // Si tiene éxito, ambos caches ya tienen los valores correctos
    } catch (error) {
      // Revertir ambos si falla
      updateUserCache(userId, { followers: currentFollowers });
      updateLocalProfile({ following: currentFollowing });
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <PostCard
      post={item}
      onComment={handleComment}
      onPrivateMessage={handlePrivateMessage}
      onPress={handlePostPress}
      onVideoPress={handleVideoPress}
    />
  );

  // Loading state
  if (profileLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Cargando perfil...
        </Text>
      </View>
    );
  }

  // Error state
  if (profileError || !userProfile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.colors.card,
              borderBottomColor: theme.colors.border,
              paddingTop: insets.top + SPACING.sm,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Perfil</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={[styles.errorText, { color: theme.colors.text }]}>
            No se pudo cargar el perfil
          </Text>
          <Text style={[styles.errorSubtext, { color: theme.colors.textSecondary }]}>
            {profileError || 'El usuario no existe'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Verificar si es el perfil del usuario actual
  const isOwnProfile = user?.uid === userId;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.border,
            paddingTop: insets.top + SPACING.sm,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {userProfile.displayName}
        </Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShareProfile}>
          <Ionicons name="share-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Información del perfil - estilo similar a ProfileScreen */}
        <View style={styles.profileInfo}>
          {/* Avatar centrado */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onLongPress={handleAvatarLongPress}
              delayLongPress={300}
              activeOpacity={0.9}
            >
              <AvatarDisplay
                size={100}
                avatarType={userProfile.avatarType || 'predefined'}
                avatarId={userProfile.avatarId || 'male'}
                photoURL={userProfile.photoURL}
                photoURLThumbnail={userProfile.photoURLThumbnail}
                backgroundColor={theme.colors.accent}
                showBorder={false}
              />
            </TouchableOpacity>
          </View>

          {/* Nombre */}
          <Text style={[styles.displayName, { color: theme.colors.text }]}>
            {userProfile.displayName}
          </Text>

          {/* Bio */}
          {userProfile.bio && (
            <Text style={[styles.bio, { color: theme.colors.text }]}>
              {userProfile.bio}
            </Text>
          )}

          {/* Info adicional inline */}
          <View style={styles.infoSection}>
            {userProfile.website && (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => {
                  const url = userProfile.website!.startsWith('http')
                    ? userProfile.website!
                    : `https://${userProfile.website!}`;
                  Linking.openURL(url);
                }}
              >
                <Ionicons name="link-outline" size={14} color={theme.colors.accent} />
                <Text style={[styles.infoText, { color: theme.colors.accent }]} numberOfLines={1}>
                  {userProfile.website}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                {userProfile.createdAt.toDate().toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>

          {/* Estadísticas */}
          <View style={styles.statsSection}>
            <TouchableOpacity style={styles.stat} activeOpacity={0.7}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {formatNumber(userProfile.posts)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stat} activeOpacity={0.7}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {formatNumber(userProfile.followers)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Seguidores</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stat} activeOpacity={0.7}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {formatNumber(userProfile.following)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Siguiendo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stat} activeOpacity={0.7}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {formatNumber(userProfile.joinedCommunities?.length || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Comunidades</Text>
            </TouchableOpacity>
          </View>

          {/* Botones de acción */}
          {!isOwnProfile && canFollow && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.followButton,
                  {
                    backgroundColor: isFollowing ? theme.colors.surface : theme.colors.accent,
                    borderColor: theme.colors.border,
                    borderWidth: isFollowing ? 1 : 0,
                  },
                ]}
                onPress={handleToggleFollow}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isFollowing ? 'checkmark' : 'person-add'}
                  size={18}
                  color={isFollowing ? theme.colors.text : 'white'}
                />
                <Text
                  style={[
                    styles.followButtonText,
                    { color: isFollowing ? theme.colors.text : 'white' },
                  ]}
                >
                  {isFollowing ? 'Siguiendo' : 'Seguir'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.messageButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={handleSendMessage}
                activeOpacity={0.8}
              >
                <Ionicons name="paper-plane-outline" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          )}

          {isOwnProfile && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.editProfileButton, { backgroundColor: theme.colors.accent }]}
                onPress={() => navigation.navigate('Main', { screen: 'Profile' } as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.editProfileButtonText}>Ver mi perfil</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tabs de filtros */}
        <View style={[styles.tabsContainer, { borderBottomColor: theme.colors.border }]}>
          {renderTabButton('posts', 'document-text-outline', 'Posts')}
          {renderTabButton('reposts', 'repeat-outline', 'Repost')}
          {renderTabButton('photos', 'image-outline', 'Multimedia')}
          {renderTabButton('polls', 'stats-chart-outline', 'Encuestas')}
          {renderTabButton('likes', 'heart-outline', 'Me gusta')}
        </View>

        {/* Posts filtrados */}
        <View style={styles.postsContainer}>
          {loadingPosts ? (
            <View style={styles.loadingPosts}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={[styles.loadingPostsText, { color: theme.colors.textSecondary }]}>
                Cargando publicaciones...
              </Text>
            </View>
          ) : postsError ? (
            <View style={styles.errorPosts}>
              <Ionicons name="alert-circle-outline" size={32} color={theme.colors.textSecondary} />
              <Text style={[styles.errorPostsText, { color: theme.colors.text }]}>{postsError}</Text>
            </View>
          ) : getFilteredPosts().length > 0 ? (
            <FlatList
              data={getFilteredPosts()}
              renderItem={renderPost}
              keyExtractor={(item) => item.id || `post-${item.userId}-${Date.now()}`}
              contentContainerStyle={styles.postsContent}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="camera-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                Sin publicaciones en esta categoría
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Visor de foto de perfil */}
      {userProfile?.photoURL && (
        <ImageViewer
          visible={showAvatarViewer}
          imageUrls={[userProfile.photoURL]}
          onClose={() => setShowAvatarViewer(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 0.5,
  },
  backButton: {
    padding: SPACING.xs,
    width: 40,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.3,
  },
  headerRight: {
    width: 40,
  },
  shareButton: {
    padding: SPACING.xs,
  },
  loadingText: {
    marginTop: 12,
    fontSize: FONT_SIZE.base,
  },
  errorText: {
    marginTop: 16,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    color: 'white',
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
  profileInfo: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  avatarSection: {
    marginBottom: 16,
  },
  avatarContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  bio: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 13,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 20,
    paddingVertical: 16,
    width: '100%',
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    paddingHorizontal: 8,
  },
  followButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  followButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  messageButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editProfileButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  editProfileButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    marginTop: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tabButtonText: {
    fontSize: 11,
    marginTop: 2,
  },
  postsContainer: {
    paddingTop: SPACING.md,
  },
  postsContent: {
    paddingHorizontal: SPACING.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    marginTop: 16,
  },
  loadingPosts: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingPostsText: {
    marginTop: 12,
    fontSize: FONT_SIZE.sm,
  },
  errorPosts: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 32,
  },
  errorPostsText: {
    marginTop: 12,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
  },
});

export default UserProfileScreen;
