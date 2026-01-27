import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
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
import { postsService, Post } from '../services/firestoreService';
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
    color: '#F472B6',
    communitySlug: 'comida-cocina',
  },
  {
    id: 'moda',
    name: 'Moda & Estilo',
    icon: 'shirt-outline',
    color: '#A855F7',
    communitySlug: 'moda-estilo',
  },
  {
    id: 'espiritualidad',
    name: 'Espiritualidad',
    icon: 'sparkles-outline',
    color: '#FBBF24',
    communitySlug: 'espiritualidad',
  },
  {
    id: 'anime',
    name: 'Anime & Manga',
    icon: 'sparkles-outline',
    color: '#FF6B9D',
    communitySlug: 'anime-manga',
  },
  {
    id: 'cripto',
    name: 'Criptomonedas',
    icon: 'logo-bitcoin',
    color: '#F7931A',
    communitySlug: 'criptomonedas',
  },
  {
    id: 'kpop',
    name: 'K-Pop & K-Drama',
    icon: 'musical-notes-outline',
    color: '#FF2D78',
    communitySlug: 'kpop-kdrama',
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
  const scrollViewRef = useRef<ScrollView>(null);

  const [trendingPost, setTrendingPost] = useState<Post | null>(null);
  const [featuredPost, setFeaturedPost] = useState<Post | null>(null);
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // Scroll to top cuando se dispara el trigger
  useEffect(() => {
    if (scrollToTopTrigger > 0) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [scrollToTopTrigger]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar comunidades
      const allCommunities = await communityService.getCommunities();
      setCommunities(allCommunities);

      // Cargar posts trending y destacado
      const postsResult = await postsService.getPublicPostsPaginated(20);
      const posts = postsResult?.documents || [];

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
      }
    } catch (error) {
      console.error('Error loading landing data:', error);
    } finally {
      setLoading(false);
    }
  };

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
    const tabNavigation = navigation.getParent();
    const mainNavigation = tabNavigation?.getParent();
    if (mainNavigation) {
      (mainNavigation as any).navigate('Chat', { recipientId: userId, recipientData: userData });
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
    const tabNavigation = navigation.getParent();
    if (tabNavigation) {
      (tabNavigation as any).navigate('Notifications');
    }
  };

  const renderHero = () => (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.heroContainer}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={styles.heroTitle}>
        Exprésate <Text style={styles.heroHighlight}>libremente.</Text>
      </Text>
      <Text style={styles.heroSubtitle}>
        Opina. Publica. Conecta.
      </Text>
      <Text style={styles.heroTagline}>
        Be free to express
      </Text>
    </LinearGradient>
  );

  const renderCategories = () => (
    <View style={[styles.categoriesContainer, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.categoriesTitle, { color: theme.colors.text }]}>
        Explora por categoria
      </Text>
      {/* Fila 1: categorías 1-9 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScrollContent}
      >
        {LANDING_CATEGORIES.slice(0, 9).map((category) => (
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
        ))}
      </ScrollView>
      {/* Fila 2: categorías 10-17 + crear nueva */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScrollContent}
        style={styles.categoriesSecondRow}
      >
        {LANDING_CATEGORIES.slice(9).map((category) => (
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
        ))}
        {/* Crear nueva categoría */}
        <TouchableOpacity
          style={[
            styles.categoryItem,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.accent, borderWidth: 1.5 }
          ]}
          onPress={handleCreateCategory}
          activeOpacity={0.7}
        >
          <View style={[
            styles.categoryIcon,
            {
              backgroundColor: theme.colors.accent + '20',
              borderWidth: 2,
              borderColor: theme.colors.accent,
            }
          ]}>
            <Ionicons name="add" size={scale(24)} color={theme.colors.accent} />
          </View>
          <Text
            style={[styles.categoryName, { color: theme.colors.accent }]}
            numberOfLines={2}
          >
            Crear nueva
          </Text>
        </TouchableOpacity>
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

  const renderFeed = () => {
    if (feedPosts.length === 0) return null;

    return (
      <>
        {/* Separador visual */}
        <View style={[styles.feedSeparator, { backgroundColor: theme.colors.surface }]} />

        <View style={styles.feedContainer}>
          <View style={styles.feedHeader}>
            <Text style={[styles.feedTitle, { color: theme.colors.text }]}>
              Publicaciones recientes
            </Text>
          </View>
          {feedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onComment={handleComment}
              onPrivateMessage={handlePrivateMessage}
              onPress={handlePostPress}
            />
          ))}
        </View>
      </>
    );
  };

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
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xl }}
      >
        {renderHero()}
        {renderCategories()}
        {renderTrendingTopic()}
        {renderFeaturedOpinion()}
        {renderFeed()}
      </ScrollView>
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
  heroContainer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxxl,
    paddingBottom: SPACING.xxl,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  heroTitle: {
    fontSize: scale(28),
    fontWeight: FONT_WEIGHT.bold,
    color: 'white',
    textAlign: 'center',
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
  },
  heroHighlight: {
    color: '#A78BFA',
  },
  heroSubtitle: {
    fontSize: scale(16),
    fontWeight: FONT_WEIGHT.medium,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  heroTagline: {
    fontSize: scale(13),
    fontWeight: FONT_WEIGHT.regular,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    width: scale(52),
    height: scale(52),
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  featureTitle: {
    color: 'white',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    textAlign: 'center',
  },
  featureSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.regular,
    textAlign: 'center',
    marginTop: scale(2),
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
  categoriesSecondRow: {
    marginTop: SPACING.sm,
  },
  categoryItem: {
    width: scale(95),
    height: scale(100),
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.sm,
  },
  categoryIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  categoryName: {
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.medium,
    textAlign: 'center',
    lineHeight: scale(14),
  },
  customCategoryIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(14),
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
});

export default LandingScreen;
