import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
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
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Hero data for each community category
// Custom icons for categories (same as landing carousel)
const CATEGORY_CUSTOM_ICONS: Record<string, any> = {
  'noticias': require('../assets/icons/category-noticias.png'),
  'marketplace': require('../assets/icons/category-marketplace.png'),
  'relaciones-amor': require('../assets/icons/category-relaciones.png'),
  'finanzas-dinero': require('../assets/icons/category-trabajo.png'),
  'laboral': require('../assets/icons/category-laboral.png'),
  'salud-bienestar': require('../assets/icons/category-salud.png'),
  'entretenimiento': require('../assets/icons/category-entretenimiento.png'),
  'gaming-tech': require('../assets/icons/category-gaming.png'),
  'educacion-carrera': require('../assets/icons/category-educacion.png'),
  'deportes': require('../assets/icons/category-deportes.png'),
  'confesiones': require('../assets/icons/category-confesiones.png'),
  'debates-calientes': require('../assets/icons/category-debates.png'),
  'viajes-lugares': require('../assets/icons/category-viajes.png'),
  'comida-cocina': require('../assets/icons/category-comida.png'),
  'moda-estilo': require('../assets/icons/category-moda.png'),
  'espiritualidad': require('../assets/icons/category-espiritualidad.png'),
  'anime-manga': require('../assets/icons/category-anime.png'),
  'criptomonedas': require('../assets/icons/category-cripto.png'),
  'kpop-kdrama': require('../assets/icons/category-kpop.png'),
  'esoterico': require('../assets/icons/category-esoterico.png'),
  'accion-poetica': require('../assets/icons/category-accion-poetica.png'),
  'ai-tecnologia': require('../assets/icons/category-ai-tecnologia.png'),
  'eventos-salidas': require('../assets/icons/category-eventos.png'),
  'negocios-inversiones': require('../assets/icons/category-negocios.png'),
  'bares-restaurantes': require('../assets/icons/category-bares.png'),
};

const COMMUNITY_HERO_DATA: Record<string, { description: string; image: string; color: string; icon: string }> = {
  'noticias': {
    description: 'Lo que está pasando en el mundo, contado por la comunidad. Debates, análisis y opiniones en tiempo real.',
    image: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=400&fit=crop&q=80',
    color: '#10B981',
    icon: 'newspaper-outline',
  },
  'marketplace': {
    description: 'Compra, vende e intercambia productos y servicios con la comunidad.',
    image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&h=400&fit=crop&q=80',
    color: '#D97706',
    icon: 'storefront-outline',
  },
  'relaciones-amor': {
    description: 'Historias, consejos y experiencias sobre relaciones, citas y todo lo que tiene que ver con el amor.',
    image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&h=400&fit=crop&q=80',
    color: '#EC4899',
    icon: 'heart-outline',
  },
  'finanzas-dinero': {
    description: 'Tips de ahorro, inversiones, y todo sobre cómo manejar tu dinero de forma inteligente.',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop&q=80',
    color: '#6366F1',
    icon: 'cash-outline',
  },
  'laboral': {
    description: 'Experiencias laborales, consejos de carrera, búsqueda de empleo y vida en la oficina.',
    image: 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=800&h=400&fit=crop&q=80',
    color: '#F59E0B',
    icon: 'briefcase-outline',
  },
  'salud-bienestar': {
    description: 'Consejos de salud, fitness, nutrición y bienestar mental para una vida mejor.',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=400&fit=crop&q=80',
    color: '#22C55E',
    icon: 'fitness-outline',
  },
  'entretenimiento': {
    description: 'Películas, series, música, memes y todo lo que te entretiene en el día a día.',
    image: 'https://images.unsplash.com/photo-1603190287605-e6ade32fa852?w=800&h=400&fit=crop&q=80',
    color: '#F59E0B',
    icon: 'film-outline',
  },
  'gaming-tech': {
    description: 'Videojuegos, gadgets, reviews y todo sobre el mundo gamer y tecnológico.',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=400&fit=crop&q=80',
    color: '#8B5CF6',
    icon: 'game-controller-outline',
  },
  'educacion-carrera': {
    description: 'Universidades, cursos, becas y todo para impulsar tu educación y carrera profesional.',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=400&fit=crop&q=80',
    color: '#0EA5E9',
    icon: 'school-outline',
  },
  'deportes': {
    description: 'Fútbol, básquet, tenis y todos los deportes. Resultados, opiniones y pasión.',
    image: 'https://images.unsplash.com/photo-1461896836934-bd45ba055e6a?w=800&h=400&fit=crop&q=80',
    color: '#EF4444',
    icon: 'football-outline',
  },
  'confesiones': {
    description: 'Un espacio seguro para compartir lo que no le contarías a nadie. Sin juicios.',
    image: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800&h=400&fit=crop&q=80',
    color: '#6B7280',
    icon: 'eye-off-outline',
  },
  'debates-calientes': {
    description: 'Temas polémicos, opiniones divididas y debates intensos. ¿De qué lado estás?',
    image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&h=400&fit=crop&q=80',
    color: '#F97316',
    icon: 'flame-outline',
  },
  'viajes-lugares': {
    description: 'Destinos increíbles, tips de viaje, experiencias y recomendaciones de la comunidad.',
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=400&fit=crop&q=80',
    color: '#14B8A6',
    icon: 'airplane-outline',
  },
  'comida-cocina': {
    description: 'Recetas, restaurantes, street food y todo para los amantes de la buena comida.',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=400&fit=crop&q=80',
    color: '#F472B6',
    icon: 'restaurant-outline',
  },
  'moda-estilo': {
    description: 'Tendencias, outfits, tips de estilo y todo sobre el mundo de la moda.',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=400&fit=crop&q=80',
    color: '#A855F7',
    icon: 'shirt-outline',
  },
  'espiritualidad': {
    description: 'Meditación, mindfulness, crecimiento personal y conexión espiritual.',
    image: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&h=400&fit=crop&q=80',
    color: '#FBBF24',
    icon: 'sparkles-outline',
  },
  'anime-manga': {
    description: 'Anime, manga, cosplay y toda la cultura otaku. ¿Cuál es tu anime favorito?',
    image: 'https://images.unsplash.com/photo-1578632767115-351597cf9d7b?w=800&h=400&fit=crop&q=80',
    color: '#FF6B9D',
    icon: 'sparkles-outline',
  },
  'criptomonedas': {
    description: 'Bitcoin, altcoins, DeFi, NFTs y todo el ecosistema cripto. DYOR.',
    image: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800&h=400&fit=crop&q=80',
    color: '#F7931A',
    icon: 'logo-bitcoin',
  },
  'kpop-kdrama': {
    description: 'Idols, dramas, comebacks y todo sobre la cultura pop coreana.',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop&q=80',
    color: '#FF2D78',
    icon: 'musical-notes-outline',
  },
  'esoterico': {
    description: 'Astrología, tarot, energías y misterios del universo. ¿En qué crees?',
    image: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800&h=400&fit=crop&q=80',
    color: '#7C3AED',
    icon: 'moon-outline',
  },
  'accion-poetica': {
    description: 'Poesía, frases, letras y arte urbano. Expresa lo que sientes con palabras.',
    image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&h=400&fit=crop&q=80',
    color: '#EC4899',
    icon: 'pencil-outline',
  },
  'ai-tecnologia': {
    description: 'Inteligencia artificial, innovación, startups y el futuro de la tecnología.',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop&q=80',
    color: '#06B6D4',
    icon: 'hardware-chip-outline',
  },
  'eventos-salidas': {
    description: 'Fiestas, conciertos, meetups y eventos. ¿A dónde salimos hoy?',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=400&fit=crop&q=80',
    color: '#F43F5E',
    icon: 'calendar-outline',
  },
  'negocios-inversiones': {
    description: 'Emprendimiento, inversiones, estrategias de negocio y oportunidades.',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop&q=80',
    color: '#059669',
    icon: 'trending-up-outline',
  },
  'bares-restaurantes': {
    description: 'Los mejores bares, restaurantes, cervecerías y spots para salir a comer.',
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&h=400&fit=crop&q=80',
    color: '#B45309',
    icon: 'beer-outline',
  },
  // Comunidades hardcoded de la landing
  'los-beatles': {
    description: 'Todo sobre la banda más grande de la historia. Discografía, historia y legado.',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=400&fit=crop&q=80',
    color: '#3B82F6',
    icon: 'musical-notes-outline',
  },
  'tarot-lectura': {
    description: 'Lecturas de tarot, interpretaciones, arcanos y guía espiritual para tu camino.',
    image: 'https://images.unsplash.com/photo-1600429991827-5224817554f2?w=800&h=400&fit=crop&q=80',
    color: '#8B5CF6',
    icon: 'moon-outline',
  },
  'recetas-abuela': {
    description: 'Las recetas caseras que pasan de generación en generación. Cocina con alma.',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=400&fit=crop&q=80',
    color: '#F59E0B',
    icon: 'cafe-outline',
  },
  'memes-argentinos': {
    description: 'Los mejores memes argentinos. Humor criollo, actualidad y cultura popular.',
    image: 'https://images.unsplash.com/photo-1531259683007-016a7b628fc3?w=800&h=400&fit=crop&q=80',
    color: '#F97316',
    icon: 'happy-outline',
  },
  'true-crime-latino': {
    description: 'Casos reales, misterios sin resolver y crónicas policiales de Latinoamérica.',
    image: 'https://images.unsplash.com/photo-1453873531674-2151bcd01707?w=800&h=400&fit=crop&q=80',
    color: '#EF4444',
    icon: 'skull-outline',
  },
  'plantitas-jardin': {
    description: 'Tips de jardinería, cuidado de plantas, suculentas y todo para tu jardín.',
    image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=400&fit=crop&q=80',
    color: '#10B981',
    icon: 'leaf-outline',
  },
  'rock-nacional': {
    description: 'El rock argentino y latinoamericano. Bandas, discos, recitales y nostalgia.',
    image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800&h=400&fit=crop&q=80',
    color: '#6366F1',
    icon: 'radio-outline',
  },
  'cat-lovers': {
    description: 'Fotos, videos, consejos y todo sobre nuestros amigos felinos.',
    image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&h=400&fit=crop&q=80',
    color: '#EC4899',
    icon: 'paw-outline',
  },
};

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

  const handleVideoPress = useCallback((post: Post, positionMillis?: number) => {
    // Filter current feed posts to only videos
    const videoPosts = posts.filter(p => !!p.videoUrl);
    const parentNavigation = navigation.getParent();
    if (parentNavigation) {
      (parentNavigation as any).navigate('Reels', {
        initialPost: post,
        initialVideoPosts: videoPosts,
        communitySlug: selectedCommunitySlug,
        initialPositionMillis: positionMillis,
      });
    }
  }, [posts, navigation, selectedCommunitySlug]);

  // Obtener las comunidades del usuario para el filtro
  const getUserCommunities = useCallback(() => {
    if (!userProfile?.joinedCommunities) return [];
    return officialCommunities.filter(c => c.id && userProfile.joinedCommunities.includes(c.id));
  }, [officialCommunities, userProfile?.joinedCommunities]);

  // Calcular posts destacados por engagement (sin fetch extra)
  const highlightedPosts = useMemo(() => {
    if (posts.length < 3) return [];
    const sorted = [...posts].sort((a, b) => {
      const engA = (a.agreementCount || 0) + (a.comments || 0);
      const engB = (b.agreementCount || 0) + (b.comments || 0);
      return engB - engA;
    });
    return sorted.slice(0, 5);
  }, [posts]);

  const HIGHLIGHT_CARD_WIDTH = scale(260);
  const HIGHLIGHT_CARD_GAP = SPACING.md;

  const getHighlightLabel = (index: number): { emoji: string; label: string } => {
    if (index === 0) return { emoji: '\uD83D\uDD25', label: 'Tema del día' };
    if (index === 1) return { emoji: '\u2B50', label: 'Opinión destacada' };
    return { emoji: '\uD83D\uDCCC', label: 'Destacado' };
  };

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
        onVideoPress={handleVideoPress}
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

  const hasImmersiveHero = !!(selectedCommunitySlug && isFromLanding);

  const getHeroData = () => {
    if (!selectedCommunitySlug) return null;
    const predefined = COMMUNITY_HERO_DATA[selectedCommunitySlug];
    if (predefined) return predefined;

    // Fallback for user-created communities
    const community = getSelectedCommunity();
    return {
      description: community?.description || 'Un espacio para compartir, debatir y conectar con la comunidad.',
      image: community?.imageUrl || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=400&fit=crop&q=80',
      color: '#8B5CF6',
      icon: community?.icon ? community.icon + '-outline' : 'people-outline',
    };
  };

  const renderCommunityHero = () => {
    if (!hasImmersiveHero) return null;
    const heroData = getHeroData();
    if (!heroData) return null;
    const communityName = getSelectedCommunityName();
    const community = getSelectedCommunity();
    const memberCount = community?.memberCount || 0;

    return (
      <View style={styles.heroContainer}>
        {/* Background image */}
        <Image
          source={{ uri: heroData.image }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        {/* Dark overlay for readability */}
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.1)', heroData.color + 'BB']}
          locations={[0, 0.3, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Bottom fade into page background */}
        <LinearGradient
          colors={['transparent', theme.colors.background]}
          locations={[0.7, 1]}
          style={styles.heroBottomFade}
        />

        {/* Back button floating top-left */}
        <View style={[styles.heroNav, { paddingTop: insets.top + SPACING.sm }]}>
          <TouchableOpacity
            style={styles.heroBackButton}
            onPress={handleBackToLanding}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={scale(22)} color="white" />
          </TouchableOpacity>
        </View>

        {/* Content at bottom */}
        <View style={styles.heroContent}>
          {/* Icon badge */}
          {CATEGORY_CUSTOM_ICONS[selectedCommunitySlug || ''] ? (
            <Image
              source={CATEGORY_CUSTOM_ICONS[selectedCommunitySlug || '']}
              style={styles.heroCustomIcon}
              contentFit="contain"
            />
          ) : (
            <View style={[styles.heroIconBadge, { backgroundColor: heroData.color }]}>
              <Ionicons
                name={(heroData.icon || community?.icon || 'reader-outline') as any}
                size={scale(20)}
                color="white"
              />
            </View>
          )}

          <Text style={styles.heroTitle}>{communityName}</Text>
          <Text style={styles.heroDescription}>{heroData.description}</Text>

          {/* Stats row */}
          <View style={styles.heroStatsRow}>
            {memberCount > 0 && (
              <View style={styles.heroStat}>
                <Ionicons name="people" size={scale(13)} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroStatText}>
                  {memberCount >= 1000 ? (memberCount / 1000).toFixed(1) + 'K' : memberCount} miembros
                </Text>
              </View>
            )}
            <View style={styles.heroStat}>
              <Ionicons name="document-text" size={scale(13)} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroStatText}>{posts.length} posts</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderListHeader = () => (
    <View>
      {/* Community hero banner */}
      {renderCommunityHero()}
      {/* Community tabs dentro del FlatList */}
      {!isDesktop && !isUserCommunityFeed && (
        <View style={[styles.communityTabContainer, { borderBottomColor: theme.colors.border }]}>
          {renderCommunitySelector()}
        </View>
      )}
      {/* Carrusel de destacados */}
      {highlightedPosts.length > 0 && (
        <View style={styles.highlightsSection}>
          <Text style={[styles.highlightsSectionTitle, { color: theme.colors.text }]}>
            Destacados
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={HIGHLIGHT_CARD_WIDTH + HIGHLIGHT_CARD_GAP}
            decelerationRate="fast"
            contentContainerStyle={styles.highlightsContainer}
          >
            {highlightedPosts.map((post, index) => {
              const { emoji, label } = getHighlightLabel(index);
              const totalVotes = (post.agreementCount || 0) + (post.disagreementCount || 0);
              return (
                <TouchableOpacity
                  key={post.id || index}
                  style={[
                    styles.highlightCard,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                      width: HIGHLIGHT_CARD_WIDTH,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handlePostPress(post)}
                >
                  <Text style={styles.highlightLabel}>
                    {emoji} {label}
                  </Text>
                  <Text
                    style={[styles.highlightContent, { color: theme.colors.text }]}
                    numberOfLines={2}
                  >
                    {post.content}
                  </Text>
                  <View style={styles.highlightStats}>
                    <View style={styles.highlightStat}>
                      <Ionicons name="thumbs-up-outline" size={scale(13)} color={theme.colors.textSecondary} />
                      <Text style={[styles.highlightStatText, { color: theme.colors.textSecondary }]}>
                        {totalVotes}
                      </Text>
                    </View>
                    <View style={styles.highlightStat}>
                      <Ionicons name="chatbubble-outline" size={scale(13)} color={theme.colors.textSecondary} />
                      <Text style={[styles.highlightStatText, { color: theme.colors.textSecondary }]}>
                        {post.comments || 0}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
      {/* Translucent status bar for immersive hero */}
      {hasImmersiveHero && (
        <StatusBar
          backgroundColor="transparent"
          barStyle="light-content"
          translucent
        />
      )}
      {/* Header fijo arriba — hidden when immersive hero is active */}
      {!isDesktop && !hasImmersiveHero && (
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
          posts.length === 0 && !hasImmersiveHero && styles.emptyContainer
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
  heroContainer: {
    width: SCREEN_WIDTH,
    height: scale(280),
    overflow: 'hidden',
  },
  heroBottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: scale(80),
  },
  heroNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  heroBackButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  heroIconBadge: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  heroCustomIcon: {
    width: scale(44),
    height: scale(44),
    marginBottom: SPACING.sm,
  },
  heroTitle: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.bold,
    color: 'white',
    marginBottom: SPACING.xs,
    letterSpacing: -0.8,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  heroDescription: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: scale(19),
    marginBottom: SPACING.sm,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  heroStatText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: 'rgba(255,255,255,0.8)',
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
  highlightsSection: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  highlightsSectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    letterSpacing: -0.3,
  },
  highlightsContainer: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  highlightCard: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: SPACING.lg,
    justifyContent: 'space-between',
  },
  highlightLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: SPACING.sm,
    letterSpacing: 0.3,
  },
  highlightContent: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: scale(18),
    marginBottom: SPACING.md,
  },
  highlightStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  highlightStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  highlightStatText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
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
