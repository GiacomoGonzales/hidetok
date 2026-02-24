import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  ViewabilityConfig,
  ViewToken,
  Animated,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useScroll } from '../contexts/ScrollContext';
import { communityService, Community } from '../services/communityService';
import { useCommunities } from '../hooks/useCommunities';
import { postsService, Post } from '../services/firestoreService';
import { DocumentSnapshot } from 'firebase/firestore';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import PostCard from '../components/PostCard';
import Header from '../components/Header';
import DrawerMenu from '../components/DrawerMenu';
import { useUserById } from '../hooks/useUserById';
import { useVote } from '../hooks/useVote';
import { formatNumber, getRelativeTime } from '../data/mockData';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Categorias del landing con iconos y colores
const LANDING_CATEGORIES = [
  {
    id: 'noticias',
    name: 'Noticias',
    icon: 'newspaper-outline',
    customIcon: require('../assets/icons/category-noticias.png'),
    color: '#10B981',
    communitySlug: 'noticias',
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    icon: 'storefront-outline',
    customIcon: require('../assets/icons/category-marketplace.png'),
    color: '#D97706',
    communitySlug: 'marketplace',
  },
  {
    id: 'relaciones',
    name: 'Relaciones & Amor',
    icon: 'heart-outline',
    customIcon: require('../assets/icons/category-relaciones.png'),
    color: '#EC4899',
    communitySlug: 'relaciones-amor',
  },
  {
    id: 'finanzas',
    name: 'Finanzas & Dinero',
    icon: 'cash-outline',
    customIcon: require('../assets/icons/category-trabajo.png'),
    color: '#6366F1',
    communitySlug: 'finanzas-dinero',
  },
  {
    id: 'laboral',
    name: 'Laboral',
    icon: 'briefcase-outline',
    customIcon: require('../assets/icons/category-laboral.png'),
    color: '#F59E0B',
    communitySlug: 'laboral',
  },
  {
    id: 'salud',
    name: 'Salud & Bienestar',
    icon: 'fitness-outline',
    customIcon: require('../assets/icons/category-salud.png'),
    color: '#22C55E',
    communitySlug: 'salud-bienestar',
  },
  {
    id: 'entretenimiento',
    name: 'Entretenimiento',
    icon: 'film-outline',
    customIcon: require('../assets/icons/category-entretenimiento.png'),
    color: '#F59E0B',
    communitySlug: 'entretenimiento',
  },
  {
    id: 'gaming',
    name: 'Gaming & Tech',
    icon: 'game-controller-outline',
    customIcon: require('../assets/icons/category-gaming.png'),
    color: '#8B5CF6',
    communitySlug: 'gaming-tech',
  },
  {
    id: 'educacion',
    name: 'Educacion & Carrera',
    icon: 'school-outline',
    customIcon: require('../assets/icons/category-educacion.png'),
    color: '#0EA5E9',
    communitySlug: 'educacion-carrera',
  },
  {
    id: 'deportes',
    name: 'Deportes',
    icon: 'football-outline',
    customIcon: require('../assets/icons/category-deportes.png'),
    color: '#EF4444',
    communitySlug: 'deportes',
  },
  {
    id: 'confesiones',
    name: 'Confesiones',
    icon: 'eye-off-outline',
    customIcon: require('../assets/icons/category-confesiones.png'),
    color: '#6B7280',
    communitySlug: 'confesiones',
  },
  {
    id: 'debates',
    name: 'Debates Calientes',
    icon: 'flame-outline',
    customIcon: require('../assets/icons/category-debates.png'),
    color: '#F97316',
    communitySlug: 'debates-calientes',
  },
  {
    id: 'viajes',
    name: 'Viajes & Lugares',
    icon: 'airplane-outline',
    customIcon: require('../assets/icons/category-viajes.png'),
    color: '#14B8A6',
    communitySlug: 'viajes-lugares',
  },
  {
    id: 'comida',
    name: 'Comida & Cocina',
    icon: 'restaurant-outline',
    customIcon: require('../assets/icons/category-comida.png'),
    color: '#F472B6',
    communitySlug: 'comida-cocina',
  },
  {
    id: 'moda',
    name: 'Moda & Estilo',
    icon: 'shirt-outline',
    customIcon: require('../assets/icons/category-moda.png'),
    color: '#A855F7',
    communitySlug: 'moda-estilo',
  },
  {
    id: 'espiritualidad',
    name: 'Espiritualidad',
    icon: 'sparkles-outline',
    customIcon: require('../assets/icons/category-espiritualidad.png'),
    color: '#FBBF24',
    communitySlug: 'espiritualidad',
  },
  {
    id: 'anime',
    name: 'Anime & Manga',
    icon: 'sparkles-outline',
    customIcon: require('../assets/icons/category-anime.png'),
    color: '#FF6B9D',
    communitySlug: 'anime-manga',
  },
  {
    id: 'cripto',
    name: 'Criptomonedas',
    icon: 'logo-bitcoin',
    customIcon: require('../assets/icons/category-cripto.png'),
    color: '#F7931A',
    communitySlug: 'criptomonedas',
  },
  {
    id: 'kpop',
    name: 'K-Pop & K-Drama',
    icon: 'musical-notes-outline',
    customIcon: require('../assets/icons/category-kpop.png'),
    color: '#FF2D78',
    communitySlug: 'kpop-kdrama',
  },
  {
    id: 'esoterico',
    name: 'Esoterico',
    icon: 'moon-outline',
    customIcon: require('../assets/icons/category-esoterico.png'),
    color: '#7C3AED',
    communitySlug: 'esoterico',
  },
  {
    id: 'accion-poetica',
    name: 'Accion Poetica',
    icon: 'pencil-outline',
    customIcon: require('../assets/icons/category-accion-poetica.png'),
    color: '#EC4899',
    communitySlug: 'accion-poetica',
  },
  {
    id: 'ai-tecnologia',
    name: 'AI & Tecnologia',
    icon: 'hardware-chip-outline',
    customIcon: require('../assets/icons/category-ai-tecnologia.png'),
    color: '#06B6D4',
    communitySlug: 'ai-tecnologia',
  },
  {
    id: 'eventos',
    name: 'Eventos & Salidas',
    icon: 'calendar-outline',
    customIcon: require('../assets/icons/category-eventos.png'),
    color: '#F43F5E',
    communitySlug: 'eventos-salidas',
  },
  {
    id: 'negocios',
    name: 'Negocios & Inversiones',
    icon: 'trending-up-outline',
    customIcon: require('../assets/icons/category-negocios.png'),
    color: '#059669',
    communitySlug: 'negocios-inversiones',
  },
  {
    id: 'bares',
    name: 'Bares & Restaurantes',
    icon: 'beer-outline',
    customIcon: require('../assets/icons/category-bares.png'),
    color: '#B45309',
    communitySlug: 'bares-restaurantes',
  },
];

type LandingScreenNavigationProp = StackNavigationProp<any>;

// ===================== HidReelItem (inline reel for Hids tab) =====================

interface HidReelItemProps {
  post: Post;
  isActive: boolean;
  height: number;
  onComment: (postId: string) => void;
}

const HidReelItem: React.FC<HidReelItemProps> = React.memo(({ post, isActive, height, onComment }) => {
  const { user } = useAuth();
  const { userProfile: activeProfile } = useUserProfile();
  const { userProfile: postAuthor } = useUserById(post.userId);
  const isFocused = useIsFocused();
  const videoRef = useRef<Video>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

  const { stats: voteStats, voteAgree, voteDisagree } = useVote({
    postId: post.id!,
    userId: activeProfile?.uid || user?.uid,
    initialStats: {
      agreementCount: post.agreementCount || 0,
      disagreementCount: post.disagreementCount || 0,
    },
  });

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive && !isPaused && isFocused) {
      videoRef.current.playAsync();
    } else {
      videoRef.current.pauseAsync();
    }
  }, [isActive, isPaused, isFocused]);

  const handleTapVideo = useCallback(() => {
    if (!videoRef.current) return;
    if (isPaused) {
      videoRef.current.playAsync();
      setIsPaused(false);
    } else {
      videoRef.current.pauseAsync();
      setIsPaused(true);
    }
  }, [isPaused]);

  const handlePlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsBuffering(status.isBuffering);
      if (status.isPlaying && !hasStartedPlaying) {
        setHasStartedPlaying(true);
      }
    }
  }, [hasStartedPlaying]);

  return (
    <View style={{ width: SCREEN_WIDTH, height, backgroundColor: '#000' }}>
      {/* Poster image */}
      {post.imageUrls?.[0] && (
        <Image
          source={{ uri: post.imageUrls[0] }}
          style={[StyleSheet.absoluteFill, { zIndex: hasStartedPlaying ? 0 : 2 }]}
          contentFit="cover"
        />
      )}

      {/* Video */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTapVideo}
        style={[StyleSheet.absoluteFill, { zIndex: hasStartedPlaying ? 1 : 0 }]}
      >
        <Video
          ref={videoRef}
          source={{ uri: post.videoUrl! }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isActive}
          isMuted={false}
          isLooping
          progressUpdateIntervalMillis={500}
          onPlaybackStatusUpdate={handlePlaybackStatus}
        />
      </TouchableOpacity>

      {/* Buffering spinner */}
      {isBuffering && isActive && hasStartedPlaying && (
        <View style={hidReelStyles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color="white" />
        </View>
      )}

      {/* Top gradient for header/tabs readability */}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent']}
        style={hidReelStyles.topGradient}
        pointerEvents="none"
      />

      {/* Bottom gradient + info */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={hidReelStyles.bottomGradient}
        pointerEvents="box-none"
      >
        <View style={hidReelStyles.bottomContent}>
          {/* Left: user info + description */}
          <View style={hidReelStyles.bottomLeft}>
            <View style={hidReelStyles.userRow}>
              {postAuthor && (
                <AvatarDisplay
                  size={scale(32)}
                  avatarType={postAuthor.avatarType || 'predefined'}
                  avatarId={postAuthor.avatarId || 'male'}
                  photoURL={typeof postAuthor.photoURL === 'string' ? postAuthor.photoURL : undefined}
                  photoURLThumbnail={typeof postAuthor.photoURLThumbnail === 'string' ? postAuthor.photoURLThumbnail : undefined}
                  backgroundColor="#8B5CF6"
                  showBorder={false}
                />
              )}
              <Text style={hidReelStyles.username} numberOfLines={1}>
                {postAuthor?.displayName || 'Usuario'}
              </Text>
              <Text style={hidReelStyles.timeAgo}>
                {getRelativeTime(post.createdAt.toDate())}
              </Text>
            </View>
            {post.content ? (
              <Text style={hidReelStyles.description} numberOfLines={2}>
                {post.content}
              </Text>
            ) : null}
          </View>

          {/* Right sidebar: actions */}
          <View style={hidReelStyles.rightSidebar}>
            <TouchableOpacity style={hidReelStyles.sidebarBtn} onPress={voteAgree}>
              <Ionicons
                name={voteStats.userVote === 'agree' ? 'thumbs-up' : 'thumbs-up-outline'}
                size={scale(26)}
                color={voteStats.userVote === 'agree' ? '#22C55E' : 'white'}
              />
              <Text style={hidReelStyles.sidebarCount}>
                {formatNumber(voteStats.agreementCount)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={hidReelStyles.sidebarBtn} onPress={voteDisagree}>
              <Ionicons
                name={voteStats.userVote === 'disagree' ? 'thumbs-down' : 'thumbs-down-outline'}
                size={scale(26)}
                color={voteStats.userVote === 'disagree' ? '#EF4444' : 'white'}
              />
              <Text style={hidReelStyles.sidebarCount}>
                {formatNumber(voteStats.disagreementCount)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={hidReelStyles.sidebarBtn} onPress={() => onComment(post.id!)}>
              <Ionicons name="chatbubble-outline" size={scale(26)} color="white" />
              <Text style={hidReelStyles.sidebarCount}>
                {formatNumber(post.comments)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
});

const hidReelStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: scale(120),
    zIndex: 3,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: scale(60),
    paddingHorizontal: scale(16),
    paddingBottom: scale(16),
    zIndex: 3,
  },
  bottomContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bottomLeft: {
    flex: 1,
    marginRight: scale(12),
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(8),
  },
  username: {
    color: 'white',
    fontSize: scale(15),
    fontWeight: '600',
    flexShrink: 1,
  },
  timeAgo: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: scale(12),
  },
  description: {
    color: 'white',
    fontSize: scale(14),
    lineHeight: scale(20),
  },
  rightSidebar: {
    alignItems: 'center',
    gap: scale(20),
    paddingBottom: scale(8),
  },
  sidebarBtn: {
    alignItems: 'center',
    gap: scale(4),
  },
  sidebarCount: {
    color: 'white',
    fontSize: scale(12),
    fontWeight: '500',
  },
});

const LandingScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { scrollToTopTrigger } = useScroll();
  const navigation = useNavigation<LandingScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const { joinCommunity, leaveCommunity, isMember } = useCommunities(userProfile?.uid);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const [trendingPost, setTrendingPost] = useState<Post | null>(null);
  const [featuredPost, setFeaturedPost] = useState<Post | null>(null);
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visiblePostIds, setVisiblePostIds] = useState<Set<string>>(new Set());
  const visiblePostIdsRef = useRef<Set<string>>(new Set());
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<'flow' | 'hids'>('flow');
  const [containerHeight, setContainerHeight] = useState(0);
  const hidsListRef = useRef<FlatList>(null);
  const [hidsScrollTarget, setHidsScrollTarget] = useState<number | null>(null);
  const [hidsReady, setHidsReady] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Sticky tabs tracking with smooth animation
  const tabsOffsetY = useRef(0);
  const isTabsStickyRef = useRef(false);
  const [isTabsSticky, setIsTabsSticky] = useState(false);
  const stickyAnim = useRef(new Animated.Value(0)).current;
  const prevTabRef = useRef(activeTab);

  const handleFlowScroll = useCallback((event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const shouldStick = y >= tabsOffsetY.current && tabsOffsetY.current > 0;
    if (shouldStick !== isTabsStickyRef.current) {
      isTabsStickyRef.current = shouldStick;
      setIsTabsSticky(shouldStick);
      Animated.timing(stickyAnim, {
        toValue: shouldStick ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [stickyAnim]);

  // Handle tab switches
  useEffect(() => {
    if (activeTab === 'flow') {
      // FlatList stays mounted so scroll position and sticky state are preserved
      if (!isTabsStickyRef.current) {
        Animated.timing(stickyAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    }
    prevTabRef.current = activeTab;
  }, [activeTab]);

  // Scroll Hids FlatList to target video when opening from Flow
  useEffect(() => {
    if (activeTab === 'hids' && hidsScrollTarget != null && containerHeight > 0) {
      const idx = hidsScrollTarget;
      setHidsScrollTarget(null);
      // Wait for layout to complete, then scroll, then reveal
      requestAnimationFrame(() => {
        hidsListRef.current?.scrollToIndex({ index: idx, animated: false });
        requestAnimationFrame(() => {
          setHidsReady(true);
        });
      });
    }
  }, [activeTab, hidsScrollTarget, containerHeight]);

  // Video posts for Hids tab (loaded independently)
  const [videoPosts, setVideoPosts] = useState<Post[]>([]);
  const [videoLastDoc, setVideoLastDoc] = useState<DocumentSnapshot | null>(null);
  const [videosLoading, setVideosLoading] = useState(false);

  const loadVideoPosts = useCallback(async () => {
    setVideosLoading(true);
    try {
      const result = await postsService.getVideoPostsPaginated(15);
      setVideoPosts(result.documents);
      setVideoLastDoc(result.lastDoc);
    } catch (error) {
      console.error('Error loading video posts:', error);
    } finally {
      setVideosLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideoPosts();
  }, []);

  // Hero carousel phrases
  const HERO_PHRASES = useRef([
    { title: 'Crea tu alter ego digital H.I.D.I', subtitle: 'Hidden Identity Digital Interface' },
    { title: 'Exprésate libremente', subtitle: 'Opina. Publica. Conecta.' },
    { title: 'Tu voz importa', subtitle: 'Debate sin filtros. Sé auténtico.' },
  ]).current;

  const [heroIndex, setHeroIndex] = useState(0);
  const HERO_INNER_WIDTH = SCREEN_WIDTH - SPACING.lg * 2;
  const bgDriftX = useRef(new Animated.Value(0)).current;
  const bgDriftY = useRef(new Animated.Value(0)).current;
  const bgScale = useRef(new Animated.Value(1)).current;

  const handleHeroScroll = useCallback((event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / HERO_INNER_WIDTH);
    if (index >= 0 && index < HERO_PHRASES.length) {
      setHeroIndex(index);
    }
  }, [HERO_INNER_WIDTH]);

  // Background constellation drift - slow floating movement
  useEffect(() => {
    const drift = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(bgDriftX, { toValue: 8, duration: 4000, useNativeDriver: true }),
          Animated.timing(bgDriftY, { toValue: -6, duration: 4000, useNativeDriver: true }),
          Animated.timing(bgScale, { toValue: 1.08, duration: 4000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(bgDriftX, { toValue: -6, duration: 5000, useNativeDriver: true }),
          Animated.timing(bgDriftY, { toValue: 5, duration: 5000, useNativeDriver: true }),
          Animated.timing(bgScale, { toValue: 0.96, duration: 5000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(bgDriftX, { toValue: 0, duration: 4000, useNativeDriver: true }),
          Animated.timing(bgDriftY, { toValue: 0, duration: 4000, useNativeDriver: true }),
          Animated.timing(bgScale, { toValue: 1, duration: 4000, useNativeDriver: true }),
        ]),
      ])
    );
    drift.start();
    return () => drift.stop();
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  // Scroll to top cuando se dispara el trigger
  useEffect(() => {
    if (scrollToTopTrigger > 0) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [scrollToTopTrigger]);

  const loadData = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }

      // Cargar comunidades
      const allCommunities = await communityService.getCommunities();
      setCommunities(allCommunities);

      // Cargar posts trending y destacado
      const postsResult = await postsService.getPublicPostsPaginated(20);
      const posts = postsResult?.documents || [];

      // Guardar cursor para paginación
      setLastDoc(postsResult?.lastDoc || null);
      setHasMore((postsResult?.documents || []).length >= 20);

      if (posts.length > 0) {
        // Post con mas engagement como "Tema del dia"
        const sorted = [...posts].sort((a, b) =>
          (b.agreementCount + b.comments) - (a.agreementCount + a.comments)
        );
        setTrendingPost(sorted[0]);
        if (sorted.length > 1) {
          setFeaturedPost(sorted[1]);
        }

        // Feed cronológico (excluir trending y featured)
        const trendingId = sorted[0]?.id;
        const featuredId = sorted[1]?.id;
        const feedFiltered = posts.filter(p => p.id !== trendingId && p.id !== featuredId);
        setFeedPosts(feedFiltered);
      } else {
        setFeedPosts([]);
        setTrendingPost(null);
        setFeaturedPost(null);
      }
    } catch (error) {
      console.error('Error loading landing data:', error);
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
    }
  };

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore || !lastDoc) return;

    setLoadingMore(true);
    try {
      const postsResult = await postsService.getPublicPostsPaginated(20, lastDoc);
      const newPosts = postsResult?.documents || [];

      if (newPosts.length > 0) {
        // Excluir trending y featured que ya se muestran arriba
        const trendingId = trendingPost?.id;
        const featuredId = featuredPost?.id;
        const filtered = newPosts.filter(p => p.id !== trendingId && p.id !== featuredId);

        setFeedPosts(prev => [...prev, ...filtered]);
        setLastDoc(postsResult?.lastDoc || null);
      }

      setHasMore(newPosts.length >= 20);
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, lastDoc, trendingPost, featuredPost]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  }, []);

  // Viewability config for video visibility tracking
  const viewabilityConfig = useRef<ViewabilityConfig>({
    itemVisiblePercentThreshold: 50,
  }).current;

  const visibilityUpdateTimeout = useRef<NodeJS.Timeout | null>(null);
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const ids = new Set<string>();
    viewableItems.forEach((item) => {
      if (item.isViewable && item.item?.id) {
        ids.add(item.item.id);
      }
    });
    visiblePostIdsRef.current = ids;

    // Debounce state update to avoid constant re-renders while scrolling
    if (visibilityUpdateTimeout.current) {
      clearTimeout(visibilityUpdateTimeout.current);
    }
    visibilityUpdateTimeout.current = setTimeout(() => {
      setVisiblePostIds(new Set(ids));
    }, 200);
  }).current;

  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig, onViewableItemsChanged },
  ]).current;

  const handleCategoryPress = (category: typeof LANDING_CATEGORIES[0]) => {
    // Pasar el communitySlug ya que los posts se guardan con este campo
    navigation.navigate('Feed', { communitySlug: category.communitySlug });
  };

  const handleLogin = () => {
    // Navegar a la pantalla de login como modal
    // HomeStack -> TabNavigator -> MainStack
    const tabNavigation = navigation.getParent();
    const mainNavigation = tabNavigation?.getParent();
    if (mainNavigation) {
      (mainNavigation as any).navigate('Login');
    }
  };

  const handleRegister = () => {
    // Navegar a la pantalla de registro como modal
    // HomeStack -> TabNavigator -> MainStack
    const tabNavigation = navigation.getParent();
    const mainNavigation = tabNavigation?.getParent();
    if (mainNavigation) {
      (mainNavigation as any).navigate('Register');
    }
  };

  const handlePostPress = (post: Post) => {
    // HomeStack -> TabNavigator -> MainStack
    const tabNavigation = navigation.getParent();
    const mainNavigation = tabNavigation?.getParent();
    if (mainNavigation) {
      (mainNavigation as any).navigate('PostDetail', { post });
    }
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const handleCreateCategory = () => {
    if (!user) {
      handleRegister();
      return;
    }
    const tabNavigation = navigation.getParent();
    const mainNavigation = tabNavigation?.getParent();
    if (mainNavigation) {
      (mainNavigation as any).navigate('Create');
    }
  };

  const handleVideoPress = useCallback((post: Post) => {
    const index = videoPosts.findIndex(p => p.id === post.id);
    if (index >= 0) {
      setHidsActiveIndex(index);
      setHidsScrollTarget(index);
      setHidsReady(false);
      setActiveTab('hids');
    }
  }, [videoPosts]);

  const handleComment = (postId: string) => {
    const post = feedPosts.find(p => p.id === postId);
    if (post) {
      handlePostPress(post);
    }
  };

  const handlePrivateMessage = (userId: string, userData?: any) => {
    if (!user) {
      handleRegister();
      return;
    }
    (navigation as any).navigate('Inbox', {
      screen: 'Conversation',
      params: {
        otherUserId: userId,
        otherUserData: userData,
      },
    });
  };

  const handleToggleJoin = async (communityId: string) => {
    if (!user || !communityId || joiningId) return;
    setJoiningId(communityId);
    try {
      if (isMember(communityId)) {
        await leaveCommunity(communityId);
      } else {
        await joinCommunity(communityId);
      }
    } catch (error) {
      console.error('Error toggling community membership:', error);
    } finally {
      setJoiningId(null);
    }
  };


  const handleNotificationsPress = () => {
    if (!user) {
      handleRegister();
      return;
    }
    navigation.navigate('Notifications' as any);
  };

  const renderHero = () => {
    const slideHeight = scale(120);
    return (
      <View style={styles.heroWrapper}>
        <LinearGradient
          colors={['#4A1A8A', '#6B21A8', '#3B0D7A', '#1E0A4E']}
          style={styles.heroContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Constellation pattern */}
          <Animated.View style={[styles.constellationLayer, {
            transform: [
              { translateX: bgDriftX },
              { translateY: bgDriftY },
              { scale: bgScale },
            ],
          }]}>
            <View style={[styles.constellationDot, styles.dotLg, { top: '15%', left: '5%', opacity: 0.5 }]} />
            <View style={[styles.constellationDot, styles.dotLg, { bottom: '20%', left: '15%', opacity: 0.35 }]} />
            <View style={[styles.constellationDot, styles.dotMd, { top: '40%', left: '3%', opacity: 0.3 }]} />
            <View style={[styles.constellationDot, styles.dotSm, { top: '20%', left: '20%', opacity: 0.4 }]} />
            <View style={[styles.constellationDot, styles.dotSm, { top: '55%', left: '10%', opacity: 0.3 }]} />
          </Animated.View>

          {/* Native paginated carousel */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleHeroScroll}
            scrollEventThrottle={100}
            nestedScrollEnabled
            style={{ zIndex: 1 }}
          >
            {HERO_PHRASES.map((phrase, i) => (
              <View key={i} style={[styles.heroSlide, { width: HERO_INNER_WIDTH, height: slideHeight }]}>
                {i === 0 ? (
                  <View style={styles.heroSlideRow}>
                    <View style={styles.heroTextArea}>
                      <Text style={styles.heroTitle}>{phrase.title}</Text>
                      <Text style={styles.heroSubtitleFirst}>{phrase.subtitle}</Text>
                    </View>
                    <Image
                      source={{ uri: 'https://res.cloudinary.com/dnrj1guvs/image/upload/w_300,h_300,c_fit,q_auto,f_png/app-assets/fz5k4rjfyjgy3ryfo8v0.png' }}
                      style={styles.heroImage}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                    />
                  </View>
                ) : (
                  <View style={styles.heroSlideCenter}>
                    <Text style={styles.heroTitleCentered}>{phrase.title}</Text>
                    <Text style={styles.heroSubtitleCentered}>{phrase.subtitle}</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Dot indicators */}
          <View style={styles.heroDots}>
            {HERO_PHRASES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.heroDot,
                  index === heroIndex && styles.heroDotActive,
                ]}
              />
            ))}
          </View>
        </LinearGradient>
      </View>
    );
  };

  // Agrupar categorías en columnas de 2 para un solo ScrollView horizontal
  const categoryColumns = useMemo(() => {
    const cols: (typeof LANDING_CATEGORIES[0] | null)[][] = [];
    for (let i = 0; i < LANDING_CATEGORIES.length; i += 2) {
      cols.push([
        LANDING_CATEGORIES[i],
        i + 1 < LANDING_CATEGORIES.length ? LANDING_CATEGORIES[i + 1] : null,
      ]);
    }
    return cols;
  }, []);

  const renderCategoryItem = (category: typeof LANDING_CATEGORIES[0]) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryItem,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border }
      ]}
      onPress={() => handleCategoryPress(category)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.categoryIcon,
        category.customIcon ? {} : {
          backgroundColor: category.color,
          shadowColor: category.color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 6,
        }
      ]}>
        {category.customIcon ? (
          <Image source={category.customIcon} style={styles.customCategoryIcon} />
        ) : (
          <Ionicons name={category.icon as any} size={scale(24)} color="white" />
        )}
      </View>
      <Text
        style={[styles.categoryName, { color: theme.colors.text }]}
        numberOfLines={2}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  const renderCategories = () => (
    <View style={[styles.categoriesContainer, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.categoriesTitle, { color: theme.colors.text }]}>
        Explora por categoria
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScrollContent}
      >
        {categoryColumns.map((col, colIndex) => (
          <View key={colIndex} style={styles.categoryColumn}>
            {renderCategoryItem(col[0]!)}
            {col[1] && renderCategoryItem(col[1])}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const COMMUNITY_CATEGORIES = [
    { id: 'beatles', name: 'Los Beatles', icon: 'musical-notes-outline', color: '#3B82F6', members: 4820, communitySlug: 'los-beatles' },
    { id: 'tarot', name: 'Tarot & Lectura', icon: 'moon-outline', color: '#8B5CF6', members: 3150, communitySlug: 'tarot-lectura' },
    { id: 'recetas-abuela', name: 'Recetas de la Abuela', icon: 'cafe-outline', color: '#F59E0B', members: 2670, communitySlug: 'recetas-abuela' },
    { id: 'memes-arg', name: 'Memes Argentinos', icon: 'happy-outline', color: '#F97316', members: 5420, communitySlug: 'memes-argentinos' },
    { id: 'true-crime', name: 'True Crime Latino', icon: 'skull-outline', color: '#EF4444', members: 1980, communitySlug: 'true-crime-latino' },
    { id: 'plantas', name: 'Plantitas & Jardin', icon: 'leaf-outline', color: '#10B981', members: 1340, communitySlug: 'plantitas-jardin' },
    { id: 'rock-nacional', name: 'Rock Nacional', icon: 'radio-outline', color: '#6366F1', members: 3890, communitySlug: 'rock-nacional' },
    { id: 'cats-lovers', name: 'Cat Lovers', icon: 'paw-outline', color: '#EC4899', members: 4210, communitySlug: 'cat-lovers' },
  ];

  const [userCreatedCommunities, setUserCreatedCommunities] = useState<Community[]>([]);

  useEffect(() => {
    const loadUserCommunities = async () => {
      try {
        const result = await communityService.getUserCommunities();
        setUserCreatedCommunities(result);
      } catch (error) {
        console.error('Error loading user communities:', error);
      }
    };
    loadUserCommunities();
  }, []);

  const renderCommunityCategories = () => (
    <View style={[styles.communityContainer, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.communityHeader}>
        <View>
          <Text style={[styles.categoriesTitle, { color: theme.colors.text }]}>
            Creadas por la comunidad
          </Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('ExploreCommunities' as any)}>
          <Text style={[styles.communityViewAll, { color: theme.colors.accent }]}>Ver todas</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.communityScrollContent}
      >
        {/* Comunidades reales creadas por usuarios */}
        {userCreatedCommunities.map((cat) => {
          const color = '#8B5CF6';
          return (
            <TouchableOpacity
              key={cat.id || cat.slug}
              style={[styles.communityChip, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={() => handleCategoryPress({ communitySlug: cat.slug } as any)}
              activeOpacity={0.7}
            >
              {cat.imageUrl ? (
                <Image
                  source={{ uri: cat.imageThumbnailUrl || cat.imageUrl }}
                  style={styles.communityChipImage}
                />
              ) : (
                <View style={[styles.communityChipIcon, { backgroundColor: color }]}>
                  <Ionicons name={(cat.icon + '-outline') as any} size={scale(16)} color="white" />
                </View>
              )}
              <View style={styles.communityChipText}>
                <Text style={[styles.communityChipName, { color: theme.colors.text }]} numberOfLines={1}>
                  {cat.name}
                </Text>
                <Text style={[styles.communityChipMembers, { color: theme.colors.textSecondary }]}>
                  {cat.memberCount >= 1000 ? (cat.memberCount / 1000).toFixed(1) + 'K' : cat.memberCount} miembros
                </Text>
              </View>
              {user && cat.id && (
                joiningId === cat.id ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <TouchableOpacity
                    style={[styles.communityChipJoin, {
                      backgroundColor: isMember(cat.id) ? theme.colors.surface : theme.colors.accent,
                      borderColor: isMember(cat.id) ? theme.colors.border : theme.colors.accent,
                    }]}
                    onPress={(e) => { e.stopPropagation?.(); handleToggleJoin(cat.id!); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isMember(cat.id) ? 'checkmark' : 'add'}
                      size={scale(14)}
                      color={isMember(cat.id) ? theme.colors.textSecondary : 'white'}
                    />
                  </TouchableOpacity>
                )
              )}
            </TouchableOpacity>
          );
        })}
        {/* Comunidades hardcoded de ejemplo */}
        {COMMUNITY_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.communityChip, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => handleCategoryPress(cat as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.communityChipIcon, { backgroundColor: cat.color }]}>
              <Ionicons name={cat.icon as any} size={scale(16)} color="white" />
            </View>
            <View style={styles.communityChipText}>
              <Text style={[styles.communityChipName, { color: theme.colors.text }]} numberOfLines={1}>
                {cat.name}
              </Text>
              <Text style={[styles.communityChipMembers, { color: theme.colors.textSecondary }]}>
                {cat.members >= 1000 ? (cat.members / 1000).toFixed(1) + 'K' : cat.members} miembros
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTrendingTopic = () => {
    if (!trendingPost) return null;

    return (
      <TouchableOpacity
        style={[styles.trendingContainer, { backgroundColor: theme.colors.card }]}
        onPress={() => handlePostPress(trendingPost)}
        activeOpacity={0.8}
      >
        <View style={styles.trendingHeader}>
          <Text style={styles.trendingEmoji}>🔥</Text>
          <Text style={[styles.trendingLabel, { color: theme.colors.textSecondary }]}>
            Tema del dia
          </Text>
        </View>
        <Text style={[styles.trendingTitle, { color: theme.colors.text }]} numberOfLines={2}>
          {trendingPost.content}
        </Text>
        <View style={styles.trendingStats}>
          <Text style={[styles.trendingStatText, { color: theme.colors.textSecondary }]}>
            {formatNumber(trendingPost.agreementCount + trendingPost.disagreementCount)} Respuestas
          </Text>
          <Text style={[styles.trendingDot, { color: theme.colors.textSecondary }]}>•</Text>
          <Text style={[styles.trendingStatText, { color: theme.colors.accent }]}>
            Debate intenso
          </Text>
        </View>
        <View style={[styles.trendingProgress, { backgroundColor: theme.colors.border }]}>
          <View style={[styles.trendingProgressBar, { backgroundColor: theme.colors.accent, width: '70%' }]} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderFeaturedOpinion = () => {
    if (!featuredPost) return null;

    return (
      <TouchableOpacity
        style={[styles.featuredContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent }]}
        onPress={() => handlePostPress(featuredPost)}
        activeOpacity={0.8}
      >
        <View style={styles.featuredHeader}>
          <Text style={styles.featuredEmoji}>⭐</Text>
          <Text style={[styles.featuredLabel, { color: theme.colors.text }]}>
            Opinion destacada
          </Text>
        </View>
        <Text style={[styles.featuredContent, { color: theme.colors.text }]} numberOfLines={3}>
          {featuredPost.content}
        </Text>
        <View style={styles.featuredStats}>
          <Text style={[styles.featuredStatText, { color: theme.colors.textSecondary }]}>
            {formatNumber(featuredPost.agreementCount)} Likes
          </Text>
          <Text style={[styles.featuredDot, { color: theme.colors.textSecondary }]}>•</Text>
          <Text style={[styles.featuredStatText, { color: theme.colors.textSecondary }]}>
            {formatNumber(featuredPost.comments)} Comentarios
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTabBar = useCallback((transparent = false) => (
    <View style={[
      styles.tabBar,
      {
        borderBottomColor: transparent ? 'rgba(255,255,255,0.2)' : theme.colors.border,
        backgroundColor: transparent ? 'transparent' : theme.colors.background,
      },
    ]}>
      <TouchableOpacity
        style={[
          styles.tabItem,
          activeTab === 'flow' && { borderBottomColor: transparent ? 'white' : theme.colors.accent },
        ]}
        onPress={() => setActiveTab('flow')}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.tabItemText,
          { color: transparent
            ? (activeTab === 'flow' ? 'white' : 'rgba(255,255,255,0.6)')
            : (activeTab === 'flow' ? theme.colors.text : theme.colors.textSecondary) },
          activeTab === 'flow' && styles.tabItemTextActive,
        ]}>
          Flow
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tabItem,
          activeTab === 'hids' && { borderBottomColor: transparent ? 'white' : theme.colors.accent },
        ]}
        onPress={() => setActiveTab('hids')}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.tabItemText,
          { color: transparent
            ? (activeTab === 'hids' ? 'white' : 'rgba(255,255,255,0.6)')
            : (activeTab === 'hids' ? theme.colors.text : theme.colors.textSecondary) },
          activeTab === 'hids' && styles.tabItemTextActive,
        ]}>
          Hids
        </Text>
      </TouchableOpacity>
    </View>
  ), [activeTab, theme]);

  const listHeader = useMemo(() => (
    <>
      {renderHero()}
      {renderCategories()}
      {renderCommunityCategories()}
      {renderTrendingTopic()}
      {renderFeaturedOpinion()}
      {feedPosts.length > 0 && (
        <>
          <View style={[styles.feedSeparator, { backgroundColor: theme.colors.surface }]} />
          <View onLayout={(e) => { tabsOffsetY.current = e.nativeEvent.layout.y; }}>
            {renderTabBar()}
          </View>
        </>
      )}
    </>
  ), [theme, trendingPost, featuredPost, feedPosts.length > 0, userCreatedCommunities, isMember, joiningId, user, heroIndex, renderTabBar]);

  const renderPostItem = useCallback(({ item }: { item: Post }) => (
    <PostCard
      post={item}
      onComment={handleComment}
      onPrivateMessage={handlePrivateMessage}
      onPress={handlePostPress}
      onVideoPress={handleVideoPress}
      isVisible={visiblePostIds.has(item.id || '') && activeTab === 'flow'}
    />
  ), [visiblePostIds, handleVideoPress, activeTab]);

  // ---- Hids reel viewability ----
  const [hidsActiveIndex, setHidsActiveIndex] = useState(0);

  const hidsViewabilityConfig = useRef<ViewabilityConfig>({
    itemVisiblePercentThreshold: 50,
  }).current;

  const onHidsViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setHidsActiveIndex(viewableItems[0].index);
    }
  }).current;

  const hidsViewabilityPairs = useRef([
    { viewabilityConfig: hidsViewabilityConfig, onViewableItemsChanged: onHidsViewableItemsChanged },
  ]).current;

  const renderHidItem = useCallback(({ item, index }: { item: Post; index: number }) => (
    <HidReelItem
      post={item}
      isActive={index === hidsActiveIndex && activeTab === 'hids'}
      height={containerHeight}
      onComment={handleComment}
    />
  ), [hidsActiveIndex, activeTab, containerHeight, handleComment]);

  const hidsGetItemLayout = useCallback((_: any, index: number) => ({
    length: containerHeight,
    offset: containerHeight * index,
    index,
  }), [containerHeight]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  const isHidsMode = activeTab === 'hids';

  return (
    <View
      style={[styles.container, { backgroundColor: isHidsMode ? '#000' : theme.colors.background }]}
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
    >
      {/* Header in normal flow (only for Flow mode) */}
      {!isHidsMode && (
        <Header onNotificationsPress={handleNotificationsPress} onMenuPress={() => setDrawerVisible(true)} />
      )}

      {/* Content area */}
      <View style={{ flex: 1 }}>
        <View style={activeTab === 'flow' ? { flex: 1 } : { height: 0, overflow: 'hidden' }}>
          <FlatList
            ref={flatListRef}
            data={feedPosts}
            renderItem={renderPostItem}
            keyExtractor={(item: Post) => item.id || Math.random().toString()}
            ListHeaderComponent={listHeader}
            ListFooterComponent={loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={theme.colors.accent} />
              </View>
            ) : null}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xl }}
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
            onScroll={handleFlowScroll}
            scrollEventThrottle={16}
            viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
            removeClippedSubviews
          />
        </View>

        <View style={[
          activeTab === 'hids' ? { flex: 1 } : { height: 0, overflow: 'hidden' },
          activeTab === 'hids' && !hidsReady && { opacity: 0 },
        ]}>
          {containerHeight > 0 && videoPosts.length > 0 ? (
            <FlatList
              ref={hidsListRef}
              data={videoPosts}
              renderItem={renderHidItem}
              keyExtractor={(item: Post) => `hid-${item.id}`}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              getItemLayout={hidsGetItemLayout}
              windowSize={3}
              maxToRenderPerBatch={2}
              removeClippedSubviews={Platform.OS !== 'web'}
              viewabilityConfigCallbackPairs={hidsViewabilityPairs}
            />
          ) : (
            <View style={styles.hidsEmptyState}>
              <Ionicons name="videocam-outline" size={scale(48)} color={isHidsMode ? 'rgba(255,255,255,0.5)' : theme.colors.textSecondary} />
              <Text style={[styles.hidsEmptyTitle, { color: isHidsMode ? 'white' : theme.colors.text }]}>No hay hids</Text>
              <Text style={[styles.hidsEmptySubtitle, { color: isHidsMode ? 'rgba(255,255,255,0.6)' : theme.colors.textSecondary }]}>
                Aún no hay videos disponibles
              </Text>
            </View>
          )}
        </View>

        {/* Sticky tab bar — only in Flow mode, slides in when scrolled past inline tabs */}
        {!isHidsMode && (
          <Animated.View
            pointerEvents={isTabsSticky ? 'auto' : 'none'}
            style={[
              styles.tabBarStickyWrapper,
              {
                backgroundColor: theme.colors.background,
                opacity: stickyAnim,
                transform: [{
                  translateY: stickyAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-scale(44), 0],
                  }),
                }],
              },
            ]}
          >
            {renderTabBar()}
          </Animated.View>
        )}
      </View>

      {/* Hids mode: transparent Header + Tabs overlay */}
      {isHidsMode && (
        <View style={styles.hidsOverlay} pointerEvents="box-none">
          <Header onNotificationsPress={handleNotificationsPress} onMenuPress={() => setDrawerVisible(true)} transparent />
          {renderTabBar(true)}
        </View>
      )}

      {/* Drawer menu */}
      <DrawerMenu visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },

  // Hero
  heroWrapper: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    // Shadow
    shadowColor: '#6B21A8',
    shadowOffset: { width: 0, height: scale(8) },
    shadowOpacity: 0.35,
    shadowRadius: scale(20),
    elevation: 12,
  },
  heroContainer: {
    borderRadius: BORDER_RADIUS.xl,
    height: scale(120),
    overflow: 'hidden',
  },
  constellationLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  constellationDot: {
    position: 'absolute',
    backgroundColor: 'rgba(167, 139, 250, 0.8)',
    borderRadius: 999,
  },
  dotLg: {
    width: scale(6),
    height: scale(6),
  },
  dotMd: {
    width: scale(4),
    height: scale(4),
  },
  dotSm: {
    width: scale(2.5),
    height: scale(2.5),
    backgroundColor: 'rgba(196, 181, 253, 0.7)',
  },
  constellationLine: {
    position: 'absolute',
    height: scale(1),
    backgroundColor: 'rgba(167, 139, 250, 0.5)',
  },
  heroSlide: {
    justifyContent: 'center',
  },
  heroSlideRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.lg,
  },
  heroSlideCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  heroTextArea: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  heroImage: {
    position: 'absolute',
    right: -scale(8),
    bottom: 0,
    width: scale(100),
    height: scale(100),
  },
  heroTitle: {
    fontSize: scale(16),
    fontWeight: FONT_WEIGHT.bold,
    color: 'white',
    marginBottom: scale(4),
    letterSpacing: -0.3,
  },
  heroTitleCentered: {
    fontSize: scale(20),
    fontWeight: FONT_WEIGHT.bold,
    color: 'white',
    textAlign: 'center',
    marginBottom: scale(4),
    letterSpacing: -0.3,
  },
  heroSubtitleFirst: {
    fontSize: scale(11),
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: scale(1),
    marginTop: scale(2),
  },
  heroSubtitle: {
    fontSize: scale(10),
    color: 'rgba(255,255,255,0.8)',
    lineHeight: scale(14),
  },
  heroSubtitleCentered: {
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: scale(16),
  },
  heroDots: {
    position: 'absolute',
    bottom: scale(6),
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(5),
    zIndex: 2,
  },
  heroDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  heroDotActive: {
    backgroundColor: 'white',
    width: scale(18),
  },

  // Categories
  categoriesContainer: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  categoriesTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  categoriesScrollContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  categoryColumn: {
    gap: SPACING.sm,
  },
  categoryItem: {
    width: scale(94),
    height: scale(90),
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.sm,
  },
  categoryIcon: {
    width: scale(43),
    height: scale(43),
    borderRadius: scale(13),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  categoryName: {
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.medium,
    textAlign: 'center',
    lineHeight: scale(13),
  },
  customCategoryIcon: {
    width: scale(43),
    height: scale(43),
    borderRadius: scale(13),
  },

  // Community Categories
  communityContainer: {
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  communityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  communitySubtitle: {
    fontSize: scale(12),
    marginTop: 2,
  },
  communityViewAll: {
    fontSize: scale(13),
    fontWeight: FONT_WEIGHT.semiBold,
  },
  communityScrollContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  communityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  communityChipIcon: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityChipImage: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
  },
  communityChipText: {
    marginRight: SPACING.xs,
  },
  communityChipName: {
    fontSize: scale(12),
    fontWeight: FONT_WEIGHT.semiBold,
  },
  communityChipMembers: {
    fontSize: scale(10),
  },
  communityChipJoin: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginLeft: SPACING.xs,
  },

  // Trending Topic
  trendingContainer: {
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  trendingEmoji: {
    fontSize: scale(20),
  },
  trendingLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  trendingTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.md,
    lineHeight: scale(24),
  },
  trendingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  trendingStatText: {
    fontSize: FONT_SIZE.sm,
  },
  trendingDot: {
    fontSize: FONT_SIZE.sm,
  },
  trendingProgress: {
    height: scale(4),
    borderRadius: scale(2),
    overflow: 'hidden',
  },
  trendingProgressBar: {
    height: '100%',
    borderRadius: scale(2),
  },

  // Featured Opinion
  featuredContainer: {
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: scale(4),
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  featuredEmoji: {
    fontSize: scale(20),
  },
  featuredLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
  featuredContent: {
    fontSize: FONT_SIZE.base,
    lineHeight: scale(22),
    marginBottom: SPACING.md,
  },
  featuredStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  featuredStatText: {
    fontSize: FONT_SIZE.sm,
  },
  featuredDot: {
    fontSize: FONT_SIZE.sm,
  },

  // Feed
  feedSeparator: {
    height: scale(8),
    marginTop: SPACING.xl,
  },

  // Tab bar (Flow / Hids) — shared between inline and sticky
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
  },
  tabBarStickyWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
  },
  tabItemTextActive: {
    fontWeight: FONT_WEIGHT.bold,
  },

  // Hids overlay (transparent header + tabs)
  hidsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },

  // Hids empty state
  hidsEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  hidsEmptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  hidsEmptySubtitle: {
    fontSize: FONT_SIZE.base,
    textAlign: 'center',
  },

  loadingMore: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
});

export default LandingScreen;
