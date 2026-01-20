import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image as RNImage,
  Dimensions,
  Share,
  Alert,
  Linking,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserById } from '../hooks/useUserById';
import { useVote } from '../hooks/useVote';
import { useReposts } from '../hooks/useReposts';
import { useCommunityById } from '../hooks/useCommunityById';
import { Post, postsService, PollOption } from '../services/firestoreService';
import { Timestamp } from 'firebase/firestore';
import { MainStackParamList } from '../navigation/MainStackNavigator';
import { formatNumber, getRelativeTime } from '../data/mockData';
import AvatarDisplay from './avatars/AvatarDisplay';
import ImageViewer from './ImageViewer';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, ICON_SIZE } from '../constants/design';
import { scale } from '../utils/scale';

type PostCardNavigationProp = StackNavigationProp<MainStackParamList>;

interface PostCardProps {
  post: Post;
  onComment: (postId: string) => void;
  onPrivateMessage: (userId: string, userData?: { displayName: string; avatarType?: string; avatarId?: string; photoURL?: string; photoURLThumbnail?: string }) => void;
  onPress?: (post: Post) => void;
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_HORIZONTAL_PADDING = SPACING.lg; // 16px cada lado
const CARD_MAX_WIDTH = 700; // Ancho máximo del feed en desktop
const MIN_IMAGE_HEIGHT = scale(200);
const MAX_IMAGE_HEIGHT = scale(500);

const getCarouselWidth = () => {
  const availableWidth = Math.min(screenWidth, scale(CARD_MAX_WIDTH));
  return availableWidth - (CARD_HORIZONTAL_PADDING * 2);
};

interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  onComment,
  onPrivateMessage,
  onPress
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<PostCardNavigationProp>();

  // Si es un repost, cargar el post original y el autor del repost
  // Si no es un repost, usar el post actual
  const isRepost = post.isRepost === true;
  const [originalPost, setOriginalPost] = useState<Post | null>(null);
  const [loadingOriginal, setLoadingOriginal] = useState(isRepost);

  // Autor del repost (quien reposteó)
  const { userProfile: repostAuthor, loading: loadingRepostAuthor } = useUserById(isRepost ? post.userId : '');

  // Autor del post original
  const { userProfile: postAuthor, loading: loadingAuthor } = useUserById(
    isRepost ? (originalPost?.userId || '') : post.userId
  );

  // Hook de votación con estado optimista
  const { stats: voteStats, voteAgree, voteDisagree, isLoading: isVoting } = useVote({
    postId: post.id!,
    userId: user?.uid,
    initialStats: {
      agreementCount: post.agreementCount || 0,
      disagreementCount: post.disagreementCount || 0,
    },
  });

  // Hook de reposts con estado optimista (del post original si es repost)
  const targetPostId = isRepost && originalPost ? originalPost.id! : post.id!;
  const targetRepostsCount = isRepost && originalPost ? (originalPost.reposts || 0) : (post.reposts || 0);
  const { hasReposted, repostsCount, toggleRepost, loading: isReposting } = useReposts(targetPostId, targetRepostsCount);

  // Hook para obtener info de la comunidad
  const { community } = useCommunityById(post.communityId);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [localPoll, setLocalPoll] = useState(post.poll);
  const [localViews, setLocalViews] = useState(post.views || 0);
  const scrollViewRef = useRef<ScrollView>(null);
  const carouselWidth = getCarouselWidth();

  // Animaciones para el menú
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const menuScale = useRef(new Animated.Value(0.9)).current;

  // Cargar post original si es un repost
  useEffect(() => {
    const loadOriginalPost = async () => {
      if (!isRepost || !post.originalPostId) {
        setLoadingOriginal(false);
        return;
      }

      try {
        setLoadingOriginal(true);
        const original = await postsService.getById(post.originalPostId);
        setOriginalPost(original);
      } catch (error) {
        console.error('Error loading original post:', error);
        setOriginalPost(null);
      } finally {
        setLoadingOriginal(false);
      }
    };

    loadOriginalPost();
  }, [isRepost, post.originalPostId]);

  // Verificar si el post pertenece al usuario actual
  const isOwnPost = user?.uid === post.userId;

  // Sincronizar poll local con el post (usar original si es repost)
  useEffect(() => {
    const pollToUse = isRepost && originalPost ? originalPost.poll : post.poll;
    setLocalPoll(pollToUse);
  }, [post.poll, originalPost, isRepost]);

  // Sincronizar vistas locales con el post
  useEffect(() => {
    setLocalViews(post.views || 0);
  }, [post.views]);

  // Verificar si el usuario ya votó en la encuesta
  useEffect(() => {
    if (post.poll && user?.uid) {
      const voteIndex = post.poll.options.findIndex(opt =>
        opt.votedBy.includes(user.uid)
      );
      if (voteIndex !== -1) {
        setUserVote(voteIndex);
      }
    }
  }, [post.poll, user?.uid]);

  // Animar menú cuando se abre/cierra
  useEffect(() => {
    if (menuVisible) {
      Animated.parallel([
        Animated.timing(menuOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(menuScale, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(menuOpacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(menuScale, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [menuVisible]);

  // Incrementar vistas cuando el post se monta
  useEffect(() => {
    if (post.id) {
      // Incrementar vista después de un pequeño delay para asegurar que se vea
      const timer = setTimeout(() => {
        // Actualizar localmente primero (optimistic update)
        setLocalViews(prev => prev + 1);
        // Luego actualizar en Firestore
        postsService.incrementViews(post.id!);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [post.id]);

  // Cargar dimensiones de la primera imagen con mejor manejo de errores
  useEffect(() => {
    // Si es repost y no ha cargado el original, no hacer nada
    if (isRepost && !originalPost) return;

    const postToUse = isRepost && originalPost ? originalPost : post;
    const imageUrls = postToUse?.imageUrls;

    if (imageUrls && imageUrls.length > 0) {
      // Usar dimensiones por defecto inmediatamente
      setImageDimensions({ width: 16, height: 9, aspectRatio: 16/9 });

      // Intentar obtener dimensiones reales
      RNImage.getSize(
        imageUrls[0],
        (width, height) => {
          const aspectRatio = width / height;
          setImageDimensions({ width, height, aspectRatio });
        },
        (error) => {
          // Si falla, mantener las dimensiones por defecto
          console.log('Using default image dimensions (16:9)');
        }
      );
    }
  }, [isRepost, originalPost, post.imageUrls]);

  const getImageHeight = () => {
    if (!imageDimensions) {
      return scale(300); // Altura por defecto mientras carga
    }

    // Calcular altura basada en el aspect ratio
    const calculatedHeight = carouselWidth / imageDimensions.aspectRatio;

    // Limitar entre MIN y MAX
    return Math.max(MIN_IMAGE_HEIGHT, Math.min(MAX_IMAGE_HEIGHT, calculatedHeight));
  };

  // Manejar voto de acuerdo
  const handleVoteAgree = async () => {
    if (!user) return;
    await voteAgree();
  };

  // Manejar voto en desacuerdo
  const handleVoteDisagree = async () => {
    if (!user) return;
    await voteDisagree();
  };

  // Calcular porcentaje de acuerdo para mostrar
  const getAgreementDisplay = () => {
    const total = voteStats.agreementCount + voteStats.disagreementCount;
    if (total === 0) return null;
    return `${voteStats.agreementPercentage}%`;
  };

  // Navegar al perfil del autor original del post
  const handleProfilePress = () => {
    const authorId = isRepost && originalPost ? originalPost.userId : post.userId;
    if (authorId) {
      navigation.navigate('UserProfile', { userId: authorId });
    }
  };

  // Navegar al perfil del reposteador
  const handleRepostAuthorPress = () => {
    if (isRepost && post.userId) {
      navigation.navigate('UserProfile', { userId: post.userId });
    }
  };

  // Navegar a la comunidad
  const handleCommunityPress = () => {
    if (community?.id) {
      navigation.navigate('Community', { communityId: community.id });
    }
  };

  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
    setImageViewerVisible(true);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${post.content}\n\n- Usuario en HideTok`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDeletePost = () => {
    setMenuVisible(false);
    Alert.alert(
      'Eliminar post',
      '¿Estás seguro de que quieres eliminar este post?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (post.id) {
                await postsService.delete(post.id);
                console.log('✅ Post eliminado exitosamente');
              }
            } catch (error) {
              console.error('❌ Error eliminando post:', error);
              Alert.alert('Error', 'No se pudo eliminar el post. Intenta de nuevo.');
            }
          },
        },
      ]
    );
  };

  const handleReportPost = () => {
    setMenuVisible(false);
    Alert.alert(
      'Reportar publicación',
      '¿Por qué quieres reportar esta publicación?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Contenido ofensivo',
          onPress: () => {
            console.log('📝 Post reportado: Contenido ofensivo');
            Alert.alert('Reporte enviado', 'Gracias por tu reporte. Lo revisaremos pronto.');
          },
        },
        {
          text: 'Spam',
          onPress: () => {
            console.log('📝 Post reportado: Spam');
            Alert.alert('Reporte enviado', 'Gracias por tu reporte. Lo revisaremos pronto.');
          },
        },
        {
          text: 'Otro motivo',
          onPress: () => {
            console.log('📝 Post reportado: Otro motivo');
            Alert.alert('Reporte enviado', 'Gracias por tu reporte. Lo revisaremos pronto.');
          },
        },
      ]
    );
  };

  const handleVote = async (optionIndex: number) => {
    if (!user || !localPoll || userVote !== null || !post.id) return;

    try {
      // Actualizar localmente de inmediato (optimistic update)
      setUserVote(optionIndex);

      // Actualizar la encuesta local
      const updatedPoll = {
        ...localPoll,
        totalVotes: localPoll.totalVotes + 1,
        options: localPoll.options.map((opt, idx) => {
          if (idx === optionIndex) {
            return {
              ...opt,
              votes: opt.votes + 1,
              votedBy: [...opt.votedBy, user.uid],
            };
          }
          return opt;
        }),
      };
      setLocalPoll(updatedPoll);

      console.log('🗳️ Votando en encuesta:', {
        postId: post.id,
        optionIndex,
        userId: user.uid,
      });

      // Guardar el voto en Firestore
      await postsService.voteInPoll(post.id, optionIndex, user.uid);
      console.log('✅ Voto guardado exitosamente en Firestore');

    } catch (error) {
      console.error('❌ Error al votar:', error);
      // Revertir el voto si hay error
      setUserVote(null);
      setLocalPoll(post.poll);

      const errorMessage = error instanceof Error ? error.message : 'No se pudo registrar tu voto';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleTextPress = (text: string) => {
    if (text.startsWith('#')) {
      // TODO: Navegar a búsqueda con hashtag
      console.log('Navigate to hashtag:', text);
    } else if (text.startsWith('http')) {
      Linking.openURL(text);
    }
  };

  const renderTextWithLinks = (content: string) => {
    const words = content.split(' ');
    return (
      <Text style={[styles.postContent, { color: theme.colors.text }]}>
        {words.map((word, index) => {
          const isHashtag = word.startsWith('#');
          const isLink = word.startsWith('http');
          
          if (isHashtag || isLink) {
            return (
              <Text
                key={index}
                style={{ color: theme.colors.accent }}
                onPress={() => handleTextPress(word)}
              >
                {word}{index < words.length - 1 ? ' ' : ''}
              </Text>
            );
          }
          
          return word + (index < words.length - 1 ? ' ' : '');
        })}
      </Text>
    );
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / carouselWidth);
    setCurrentImageIndex(index);
  };

  const renderMedia = () => {
    if (!displayPost.imageUrls || displayPost.imageUrls.length === 0) return null;

    const imageHeight = getImageHeight();
    const thumbnails = displayPost.imageUrlsThumbnails || [];

    if (displayPost.imageUrls.length === 1) {
      // Validar que el thumbnail sea un string válido
      const thumbnail = typeof thumbnails[0] === 'string' ? thumbnails[0] : undefined;

      return (
        <TouchableOpacity
          style={styles.singleMediaContainer}
          onPress={() => handleImagePress(0)}
          activeOpacity={0.98}
        >
          <Image
            source={{ uri: displayPost.imageUrls[0] }}
            placeholder={thumbnail ? { uri: thumbnail } : undefined}
            placeholderContentFit="cover"
            style={[
              styles.singleMedia,
              {
                backgroundColor: theme.colors.surface,
                height: imageHeight,
              }
            ]}
            contentFit="cover"
            transition={200}
            priority="high"
            cachePolicy="disk"
            allowDownscaling={false}
            onError={(error) => {
              console.log('Error loading single image:', displayPost.imageUrls[0]);
            }}
          />
        </TouchableOpacity>
      );
    }

    // Carrusel para múltiples imágenes
    return (
      <View style={styles.carouselContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          snapToInterval={carouselWidth}
          snapToAlignment="center"
          decelerationRate="fast"
          style={styles.carousel}
        >
          {displayPost.imageUrls.map((imageUrl, index) => {
            // Validar que el thumbnail sea un string válido
            const thumbnail = typeof thumbnails[index] === 'string' ? thumbnails[index] : undefined;

            return (
              <TouchableOpacity
                key={index}
                style={[styles.carouselImageContainer, { width: carouselWidth }]}
                onPress={() => handleImagePress(index)}
                activeOpacity={0.98}
              >
                <Image
                  source={{ uri: imageUrl }}
                  placeholder={thumbnail ? { uri: thumbnail } : undefined}
                placeholderContentFit="cover"
                style={[
                  styles.carouselImage,
                  {
                    backgroundColor: theme.colors.surface,
                    height: imageHeight,
                  }
                ]}
                contentFit="cover"
                transition={200}
                priority="high"
                cachePolicy="disk"
                allowDownscaling={false}
                onError={(error) => {
                  console.log('Error loading image in carousel:', imageUrl);
                }}
              />
            </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Indicadores de página */}
        <View style={styles.pageIndicatorContainer}>
          {displayPost.imageUrls.map((_, index) => (
            <View
              key={index}
              style={[
                styles.pageIndicator,
                {
                  backgroundColor: index === currentImageIndex
                    ? theme.colors.accent
                    : theme.colors.surface,
                  opacity: index === currentImageIndex ? 1 : 0.5,
                }
              ]}
            />
          ))}
        </View>

        {/* Contador de imágenes */}
        <View style={[styles.imageCounter, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <Text style={styles.imageCounterText}>
            {currentImageIndex + 1}/{displayPost.imageUrls.length}
          </Text>
        </View>
      </View>
    );
  };

  const renderPoll = () => {
    if (!localPoll) return null;

    const poll = localPoll;
    const now = new Date();
    const endsAt = poll.endsAt.toDate();
    const hasEnded = now > endsAt;
    const hasVoted = userVote !== null;
    const totalVotes = poll.totalVotes || 0;

    // Calcular tiempo restante
    const getTimeRemaining = () => {
      if (hasEnded) return 'Encuesta finalizada';

      const diff = endsAt.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) return `${days} día${days > 1 ? 's' : ''} restante${days > 1 ? 's' : ''}`;
      if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''} restante${hours > 1 ? 's' : ''}`;
      return 'Menos de 1 hora';
    };

    return (
      <View style={[styles.pollContainer, {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
      }]}>
        {poll.options.map((option, index) => {
          const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
          const isSelected = userVote === index;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.pollOption,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                  borderWidth: isSelected ? 2 : 1,
                },
                hasEnded && styles.pollOptionDisabled,
              ]}
              onPress={() => !hasVoted && !hasEnded && handleVote(index)}
              disabled={hasVoted || hasEnded}
              activeOpacity={0.7}
            >
              {/* Barra de progreso de fondo */}
              {(hasVoted || hasEnded) && (
                <View
                  style={[
                    styles.pollProgress,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.accent + '30'
                        : theme.colors.surface,
                      width: `${percentage}%`,
                    },
                  ]}
                />
              )}

              {/* Contenido de la opción */}
              <View style={styles.pollOptionContent}>
                <Text
                  style={[
                    styles.pollOptionText,
                    {
                      color: isSelected ? theme.colors.accent : theme.colors.text,
                      fontWeight: isSelected ? '600' : '400',
                    },
                  ]}
                >
                  {option.text}
                </Text>

                {(hasVoted || hasEnded) && (
                  <Text
                    style={[
                      styles.pollPercentage,
                      {
                        color: isSelected ? theme.colors.accent : theme.colors.textSecondary,
                        fontWeight: isSelected ? '600' : '400',
                      },
                    ]}
                  >
                    {percentage.toFixed(0)}%
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Footer de la encuesta */}
        <View style={styles.pollFooter}>
          <Text style={[styles.pollVotes, { color: theme.colors.textSecondary }]}>
            {totalVotes} voto{totalVotes !== 1 ? 's' : ''}
          </Text>
          <Text style={[styles.pollTimeRemaining, { color: theme.colors.textSecondary }]}>
            • {getTimeRemaining()}
          </Text>
        </View>
      </View>
    );
  };

  // Datos del post a mostrar (original si es repost)
  const displayPost = isRepost && originalPost ? originalPost : post;
  const displayAuthor = isRepost && originalPost ? postAuthor : postAuthor;

  // Si es un repost y todavía está cargando el original, mostrar loading
  if (isRepost && (loadingOriginal || !originalPost)) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.card, padding: SPACING.lg }]}>
        <TouchableOpacity
          style={[styles.repostHeader, { borderBottomColor: theme.colors.border }]}
          onPress={handleRepostAuthorPress}
          activeOpacity={0.7}
        >
          <Ionicons name="repeat" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.repostText, { color: theme.colors.textSecondary }]}>
            {repostAuthor?.displayName || 'Usuario'} reposteó
          </Text>
        </TouchableOpacity>
        <View style={[styles.centered, { paddingVertical: SPACING.xl }]}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Cargando post...
          </Text>
        </View>
      </View>
    );
  }

  // Validar que displayPost existe antes de continuar
  if (!displayPost) {
    return null;
  }

  return (
    <View
      style={[styles.container, {
        backgroundColor: theme.colors.card,
        shadowColor: theme.dark ? theme.colors.glow : '#000',
        shadowOffset: { width: 0, height: scale(2) },
        shadowOpacity: theme.dark ? 0.2 : 0.08,
        shadowRadius: theme.dark ? scale(12) : scale(8),
      }]}
    >
      {/* Header de repost (si es repost) */}
      {isRepost && repostAuthor && (
        <TouchableOpacity
          style={[styles.repostHeader, { borderBottomColor: theme.colors.border }]}
          onPress={handleRepostAuthorPress}
          activeOpacity={0.7}
        >
          <Ionicons name="repeat" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.repostText, { color: theme.colors.textSecondary }]}>
            {repostAuthor.displayName} reposteó
          </Text>
        </TouchableOpacity>
      )}

      {/* Comentario del repost (si existe) */}
      {isRepost && post.repostComment && (
        <View style={styles.repostCommentContainer}>
          <Text style={[styles.repostComment, { color: theme.colors.text }]}>
            {post.repostComment}
          </Text>
        </View>
      )}

      {/* Post original (o contenedor del repost) */}
      <View style={isRepost ? [styles.originalPostContainer, { borderColor: theme.colors.border }] : undefined}>
        {/* Header del post */}
        <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerContent}
          onPress={handleProfilePress}
          activeOpacity={0.7}
          disabled={loadingAuthor}
        >
          {loadingAuthor ? (
            // Placeholder mientras carga el autor
            <View style={[styles.avatar, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="person" size={scale(20)} color={theme.colors.textSecondary} />
            </View>
          ) : postAuthor ? (
            // Avatar real del autor con indicador de anonimato
            <View style={styles.avatarContainer}>
              <AvatarDisplay
                size={scale(40)}
                avatarType={postAuthor.avatarType || 'predefined'}
                avatarId={postAuthor.avatarId || 'male'}
                photoURL={typeof postAuthor.photoURL === 'string' ? postAuthor.photoURL : undefined}
                photoURLThumbnail={typeof postAuthor.photoURLThumbnail === 'string' ? postAuthor.photoURLThumbnail : undefined}
                backgroundColor={theme.colors.accent}
                showBorder={false}
              />
              <View style={[styles.anonymousBadge, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="eye-off" size={scale(10)} color={theme.colors.accent} />
              </View>
            </View>
          ) : (
            // Fallback si no se encuentra el autor
            <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
          )}

          <View style={styles.userInfo}>
            <Text style={[styles.username, { color: theme.colors.text }]}>
              {loadingAuthor
                ? 'Cargando...'
                : postAuthor?.displayName || 'Usuario Anónimo'
              }
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
                {getRelativeTime(post.createdAt.toDate())}
              </Text>
              {community && (
                <>
                  <Text style={[styles.metaSeparator, { color: theme.colors.textSecondary }]}>•</Text>
                  <TouchableOpacity
                    style={[styles.communityBadge, { backgroundColor: `${theme.colors.accent}15` }]}
                    onPress={handleCommunityPress}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={community.icon as any}
                      size={scale(12)}
                      color={theme.colors.accent}
                    />
                    <Text style={[styles.communityBadgeText, { color: theme.colors.accent }]}>
                      {community.name}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Menú de opciones */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

        {/* Contenido del post */}
        <View style={styles.content}>
          <TouchableOpacity onPress={() => onPress?.(displayPost)} activeOpacity={0.98}>
            {renderTextWithLinks(displayPost.content)}
          </TouchableOpacity>
          {renderMedia()}
          {renderPoll()}
        </View>
      </View>

      {/* Acciones */}
      <View style={styles.actions}>
        {/* Vistas */}
        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.7}
        >
          <Ionicons
            name="eye-outline"
            size={ICON_SIZE.sm}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
            {formatNumber(localViews)}
          </Text>
        </TouchableOpacity>

        {/* Votación: De acuerdo */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleVoteAgree}
          disabled={isVoting}
          activeOpacity={0.7}
        >
          <Ionicons
            name={voteStats.userVote === 'agree' ? "thumbs-up" : "thumbs-up-outline"}
            size={ICON_SIZE.sm}
            color={voteStats.userVote === 'agree' ? '#22C55E' : theme.colors.textSecondary}
          />
          <Text style={[styles.actionText, {
            color: voteStats.userVote === 'agree' ? '#22C55E' : theme.colors.textSecondary
          }]}>
            {formatNumber(voteStats.agreementCount)}
          </Text>
        </TouchableOpacity>

        {/* Votación: En desacuerdo */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleVoteDisagree}
          disabled={isVoting}
          activeOpacity={0.7}
        >
          <Ionicons
            name={voteStats.userVote === 'disagree' ? "thumbs-down" : "thumbs-down-outline"}
            size={ICON_SIZE.sm}
            color={voteStats.userVote === 'disagree' ? '#EF4444' : theme.colors.textSecondary}
          />
          <Text style={[styles.actionText, {
            color: voteStats.userVote === 'disagree' ? '#EF4444' : theme.colors.textSecondary
          }]}>
            {formatNumber(voteStats.disagreementCount)}
          </Text>
        </TouchableOpacity>

        {/* Porcentaje de acuerdo */}
        {getAgreementDisplay() && (
          <View style={styles.agreementBadge}>
            <Text style={[styles.agreementText, { color: theme.colors.accent }]}>
              {getAgreementDisplay()}
            </Text>
          </View>
        )}

        {/* Comentarios */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onComment(post.id!)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chatbubble-outline"
            size={ICON_SIZE.sm}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
            {formatNumber(post.comments)}
          </Text>
        </TouchableOpacity>

        {/* Privados */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            const authorId = isRepost && originalPost ? originalPost.userId : post.userId;
            onPrivateMessage(authorId, postAuthor ? {
              displayName: postAuthor.displayName,
              avatarType: postAuthor.avatarType,
              avatarId: postAuthor.avatarId,
              photoURL: postAuthor.photoURL,
              photoURLThumbnail: postAuthor.photoURLThumbnail,
            } : undefined);
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name="mail-outline"
            size={ICON_SIZE.sm}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Repostear */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={toggleRepost}
          disabled={isReposting}
          activeOpacity={0.7}
        >
          <Ionicons
            name={hasReposted ? "repeat" : "repeat-outline"}
            size={ICON_SIZE.sm}
            color={hasReposted ? theme.colors.accent : theme.colors.textSecondary}
          />
          <Text style={[
            styles.actionText,
            { color: hasReposted ? theme.colors.accent : theme.colors.textSecondary }
          ]}>
            {formatNumber(repostsCount)}
          </Text>
        </TouchableOpacity>

        {/* Guardar */}
        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.7}
        >
          <Ionicons
            name="bookmark-outline"
            size={ICON_SIZE.sm}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Image Viewer Modal */}
      {displayPost.imageUrls && displayPost.imageUrls.length > 0 && (
        <ImageViewer
          visible={imageViewerVisible}
          imageUrls={displayPost.imageUrls}
          initialIndex={selectedImageIndex}
          onClose={() => setImageViewerVisible(false)}
        />
      )}

      {/* Post Menu Dropdown */}
      {menuVisible && (
        <>
          <View style={styles.menuOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setMenuVisible(false)}
            />
          </View>
          <Animated.View style={[
            styles.menuDropdown,
            {
              backgroundColor: theme.colors.card,
              opacity: menuOpacity,
              transform: [
                { scale: menuScale },
                { translateY: Animated.multiply(menuScale.interpolate({
                  inputRange: [0.9, 1],
                  outputRange: [-10, 0],
                }), 1) }
              ],
            }
          ]}>
            {/* Eliminar - solo para posts propios */}
            {isOwnPost && (
              <TouchableOpacity
                style={[
                  styles.menuOption,
                  {
                    borderBottomColor: theme.colors.border,
                    borderBottomWidth: 0.5,
                  }
                ]}
                onPress={handleDeletePost}
              >
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                <Text style={[styles.menuOptionText, { color: '#FF3B30' }]}>
                  Eliminar post
                </Text>
              </TouchableOpacity>
            )}

            {/* Reportar - disponible para todos los posts */}
            <TouchableOpacity
              style={styles.menuOption}
              onPress={handleReportPost}
            >
              <Ionicons name="flag-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={[styles.menuOptionText, { color: theme.colors.text }]}>
                Reportar publicación
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 0,
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.1,
    shadowRadius: scale(8),
    elevation: 2,
  },
  repostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.sm,
    borderBottomWidth: 0.5,
  },
  repostText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  repostCommentContainer: {
    paddingBottom: SPACING.md,
  },
  repostComment: {
    fontSize: FONT_SIZE.base,
    lineHeight: scale(20),
    fontWeight: FONT_WEIGHT.regular,
  },
  originalPostContainer: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACING.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  anonymousBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: scale(1.5),
    borderColor: 'transparent',
  },
  avatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    marginRight: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZE.xl,
    color: 'white',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: scale(2),
    letterSpacing: scale(-0.2),
  },
  timestamp: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: scale(4),
  },
  metaSeparator: {
    fontSize: FONT_SIZE.sm,
  },
  communityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: BORDER_RADIUS.sm,
    gap: scale(3),
  },
  communityBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  content: {
    paddingBottom: SPACING.sm,
  },
  postContent: {
    fontSize: FONT_SIZE.base,
    lineHeight: scale(21),
    marginBottom: SPACING.md,
    fontWeight: FONT_WEIGHT.regular,
    letterSpacing: scale(-0.1),
  },
  singleMediaContainer: {
    position: 'relative',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  singleMedia: {
    width: '100%',
  },
  imagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    pointerEvents: 'none',
  },
  carouselContainer: {
    position: 'relative',
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  carousel: {
    borderRadius: BORDER_RADIUS.lg,
  },
  carouselImageContainer: {
    position: 'relative',
  },
  carouselImage: {
    width: '100%',
  },
  pageIndicatorContainer: {
    position: 'absolute',
    bottom: SPACING.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(6),
  },
  pageIndicator: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },
  imageCounter: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(4),
    borderRadius: BORDER_RADIUS.sm,
  },
  imageCounterText: {
    color: 'white',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.xs,
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  actionText: {
    fontSize: FONT_SIZE.sm,
    marginLeft: scale(4),
    fontWeight: FONT_WEIGHT.regular,
    letterSpacing: scale(-0.1),
  },
  agreementBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(10),
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  agreementText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  menuDropdown: {
    position: 'absolute',
    top: scale(50),
    right: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    minWidth: scale(200),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    overflow: 'hidden',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  menuOptionText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
  },
  pollContainer: {
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
  },
  pollOption: {
    position: 'relative',
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    minHeight: scale(48),
    justifyContent: 'center',
  },
  pollOptionDisabled: {
    opacity: 0.8,
  },
  pollProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: BORDER_RADIUS.md,
  },
  pollOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    zIndex: 1,
  },
  pollOptionText: {
    fontSize: FONT_SIZE.base,
    flex: 1,
  },
  pollPercentage: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    marginLeft: SPACING.sm,
  },
  pollFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  pollVotes: {
    fontSize: FONT_SIZE.sm,
  },
  pollTimeRemaining: {
    fontSize: FONT_SIZE.sm,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.sm,
  },
});

export default PostCard;
