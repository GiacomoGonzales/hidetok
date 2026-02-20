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
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
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

  // Hero carousel phrases
  const HERO_PHRASES = useRef([
    { title: 'Tu voz importa', subtitle: 'Opina sin miedo. Comparte ideas.\nConecta con personas reales.' },
    { title: 'Exprésate libremente', subtitle: 'Di lo que piensas. Sin filtros.\nTu opinión tiene valor.' },
    { title: 'Sé auténtico', subtitle: 'Muestra quién eres realmente.\nAquí no hay máscaras.' },
    { title: 'Debate sin límites', subtitle: 'Defiende tus ideas. Escucha otras.\nCrece en cada conversación.' },
    { title: 'Tu opinión cuenta', subtitle: 'Cada voto cambia la conversación.\nHaz que tu voz se escuche.' },
  ]).current;

  const [heroIndex, setHeroIndex] = useState(0);
  const heroFadeAnim = useRef(new Animated.Value(1)).current;
  const heroSlideAnim = useRef(new Animated.Value(0)).current;
  const bgDriftX = useRef(new Animated.Value(0)).current;
  const bgDriftY = useRef(new Animated.Value(0)).current;
  const bgScale = useRef(new Animated.Value(1)).current;

  // Text carousel - horizontal slide, faster
  // Fix: wait for React to re-render with new text (at opacity 0) before fading in
  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out + slide left
      Animated.parallel([
        Animated.timing(heroFadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(heroSlideAnim, { toValue: -30, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        // Update index & reset position while invisible
        setHeroIndex(prev => (prev + 1) % HERO_PHRASES.length);
        heroSlideAnim.setValue(30);
        // Wait for React render to flush the new text before fading in
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(heroFadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(heroSlideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start();
        }, 60);
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
    const videoPosts = feedPosts.filter(p => !!p.videoUrl);
    const tabNavigation = navigation.getParent();
    const mainNavigation = tabNavigation?.getParent();
    if (mainNavigation) {
      (mainNavigation as any).navigate('Reels', {
        initialPost: post,
        initialVideoPosts: videoPosts,
        communitySlug: null,
      });
    }
  }, [feedPosts, navigation]);

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

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const handleNotificationsPress = () => {
    if (!user) {
      handleRegister();
      return;
    }
    navigation.navigate('Notifications' as any);
  };

  const renderHero = () => {
    const currentPhrase = HERO_PHRASES[heroIndex];
    return (
      <View style={styles.heroWrapper}>
        <LinearGradient
          colors={['#4A1A8A', '#6B21A8', '#3B0D7A', '#1E0A4E']}
          style={styles.heroContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Constellation pattern - animated background */}
          <Animated.View style={[styles.constellationLayer, {
            transform: [
              { translateX: bgDriftX },
              { translateY: bgDriftY },
              { scale: bgScale },
            ],
          }]}>
            {/* Large glowing dots */}
            <View style={[styles.constellationDot, styles.dotLg, { top: '15%', left: '10%', opacity: 0.5 }]} />
            <View style={[styles.constellationDot, styles.dotLg, { top: '25%', right: '15%', opacity: 0.4 }]} />
            <View style={[styles.constellationDot, styles.dotLg, { bottom: '20%', left: '25%', opacity: 0.35 }]} />
            <View style={[styles.constellationDot, styles.dotLg, { bottom: '30%', right: '10%', opacity: 0.45 }]} />
            {/* Medium dots */}
            <View style={[styles.constellationDot, styles.dotMd, { top: '40%', left: '5%', opacity: 0.3 }]} />
            <View style={[styles.constellationDot, styles.dotMd, { top: '10%', left: '45%', opacity: 0.35 }]} />
            <View style={[styles.constellationDot, styles.dotMd, { top: '55%', right: '25%', opacity: 0.25 }]} />
            <View style={[styles.constellationDot, styles.dotMd, { bottom: '10%', right: '40%', opacity: 0.3 }]} />
            <View style={[styles.constellationDot, styles.dotMd, { top: '30%', left: '35%', opacity: 0.2 }]} />
            {/* Small dots */}
            <View style={[styles.constellationDot, styles.dotSm, { top: '20%', left: '30%', opacity: 0.4 }]} />
            <View style={[styles.constellationDot, styles.dotSm, { top: '50%', left: '15%', opacity: 0.3 }]} />
            <View style={[styles.constellationDot, styles.dotSm, { top: '35%', right: '30%', opacity: 0.35 }]} />
            <View style={[styles.constellationDot, styles.dotSm, { bottom: '15%', left: '50%', opacity: 0.25 }]} />
            <View style={[styles.constellationDot, styles.dotSm, { top: '60%', right: '8%', opacity: 0.3 }]} />
            <View style={[styles.constellationDot, styles.dotSm, { top: '8%', right: '35%', opacity: 0.2 }]} />
            <View style={[styles.constellationDot, styles.dotSm, { bottom: '35%', left: '8%', opacity: 0.3 }]} />
            {/* Connecting lines */}
            <View style={[styles.constellationLine, { top: '18%', left: '12%', width: scale(60), transform: [{ rotate: '25deg' }], opacity: 0.15 }]} />
            <View style={[styles.constellationLine, { top: '30%', right: '18%', width: scale(45), transform: [{ rotate: '-15deg' }], opacity: 0.12 }]} />
            <View style={[styles.constellationLine, { bottom: '25%', left: '28%', width: scale(70), transform: [{ rotate: '40deg' }], opacity: 0.1 }]} />
            <View style={[styles.constellationLine, { top: '45%', left: '8%', width: scale(35), transform: [{ rotate: '-30deg' }], opacity: 0.12 }]} />
            <View style={[styles.constellationLine, { top: '12%', left: '46%', width: scale(50), transform: [{ rotate: '60deg' }], opacity: 0.1 }]} />
          </Animated.View>

          {/* Content */}
          <View style={styles.heroContent}>
            {/* Chat icon */}
            <View style={styles.heroChatIcon}>
              <Ionicons name="chatbubbles" size={scale(22)} color="white" />
            </View>

            {/* Animated title - horizontal slide */}
            <Animated.Text
              style={[
                styles.heroTitle,
                { opacity: heroFadeAnim, transform: [{ translateX: heroSlideAnim }] },
              ]}
            >
              {currentPhrase.title}
            </Animated.Text>

            {/* Animated subtitle - horizontal slide */}
            <Animated.Text
              style={[
                styles.heroSubtitle,
                { opacity: heroFadeAnim, transform: [{ translateX: heroSlideAnim }] },
              ]}
            >
              {currentPhrase.subtitle}
            </Animated.Text>
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
          <View style={styles.feedContainer}>
            <View style={styles.feedHeader}>
              <Text style={[styles.feedTitle, { color: theme.colors.text }]}>
                Publicaciones recientes
              </Text>
            </View>
          </View>
        </>
      )}
    </>
  ), [theme, trendingPost, featuredPost, feedPosts.length > 0, userCreatedCommunities, isMember, joiningId, user, heroIndex]);

  const renderPostItem = useCallback(({ item }: { item: Post }) => (
    <PostCard
      post={item}
      onComment={handleComment}
      onPrivateMessage={handlePrivateMessage}
      onPress={handlePostPress}
      onVideoPress={handleVideoPress}
      isVisible={visiblePostIds.has(item.id || '')}
    />
  ), [visiblePostIds, handleVideoPress]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header onNotificationsPress={handleNotificationsPress} />
      <FlatList
        ref={flatListRef}
        data={feedPosts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item.id || Math.random().toString()}
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
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
        removeClippedSubviews={true}
      />
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
    paddingHorizontal: SPACING.xl,
    paddingTop: scale(15),
    paddingBottom: scale(14),
    borderRadius: BORDER_RADIUS.xl,
    minHeight: scale(112),
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
  heroContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  heroChatIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  heroTitle: {
    fontSize: scale(26),
    fontWeight: FONT_WEIGHT.bold,
    color: 'white',
    textAlign: 'center',
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: scale(14),
    fontWeight: FONT_WEIGHT.regular,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: scale(20),
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
  feedContainer: {
    paddingTop: SPACING.lg,
  },
  feedHeader: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  feedTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  loadingMore: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
});

export default LandingScreen;
