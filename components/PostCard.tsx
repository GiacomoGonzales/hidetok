import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Share,
  Alert,
  Linking,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useUserById } from '../hooks/useUserById';
import { Post } from '../services/firestoreService';
import { formatNumber, getRelativeTime } from '../data/mockData';
import AvatarDisplay from './avatars/AvatarDisplay';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, ICON_SIZE } from '../constants/design';
import { scale } from '../utils/scale';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onPrivateMessage: (userId: string, userData?: { displayName: string; avatarType?: string; avatarId?: string; photoURL?: string }) => void;
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
  onLike,
  onComment,
  onPrivateMessage,
  onPress
}) => {
  const { theme } = useTheme();
  const { userProfile: postAuthor, loading: loadingAuthor } = useUserById(post.userId);
  // Para posts reales, no tenemos info de si el usuario le dio like (por ahora)
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const carouselWidth = getCarouselWidth();

  // Cargar dimensiones de la primera imagen
  useEffect(() => {
    if (post.imageUrls && post.imageUrls.length > 0) {
      Image.getSize(
        post.imageUrls[0],
        (width, height) => {
          const aspectRatio = width / height;
          setImageDimensions({ width, height, aspectRatio });
        },
        (error) => {
          console.error('Error loading image dimensions:', error);
          // Usar dimensiones por defecto si falla
          setImageDimensions({ width: 1, height: 1, aspectRatio: 1 });
        }
      );
    }
  }, [post.imageUrls]);

  const getImageHeight = () => {
    if (!imageDimensions) {
      return scale(280); // Altura por defecto mientras carga
    }

    // Calcular altura basada en el aspect ratio
    const calculatedHeight = carouselWidth / imageDimensions.aspectRatio;

    // Limitar entre MIN y MAX
    return Math.max(MIN_IMAGE_HEIGHT, Math.min(MAX_IMAGE_HEIGHT, calculatedHeight));
  };

  const handleLike = () => {
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikesCount(prev => newIsLiked ? prev + 1 : prev - 1);
    onLike(post.id!);
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
    if (!post.imageUrls || post.imageUrls.length === 0) return null;

    const imageHeight = getImageHeight();

    if (post.imageUrls.length === 1) {
      return (
        <View style={styles.singleMediaContainer}>
          <Image
            source={{ uri: post.imageUrls[0] }}
            style={[
              styles.singleMedia,
              {
                backgroundColor: theme.colors.surface,
                height: imageHeight,
              }
            ]}
            resizeMode="cover"
          />
        </View>
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
          style={styles.carousel}
        >
          {post.imageUrls.map((imageUrl, index) => (
            <View key={index} style={[styles.carouselImageContainer, { width: carouselWidth }]}>
              <Image
                source={{ uri: imageUrl }}
                style={[
                  styles.carouselImage,
                  {
                    backgroundColor: theme.colors.surface,
                    height: imageHeight,
                  }
                ]}
                resizeMode="cover"
              />
            </View>
          ))}
        </ScrollView>

        {/* Indicadores de página */}
        <View style={styles.pageIndicatorContainer}>
          {post.imageUrls.map((_, index) => (
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
            {currentImageIndex + 1}/{post.imageUrls.length}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, {
        backgroundColor: theme.colors.card,
        shadowColor: theme.dark ? theme.colors.glow : '#000',
        shadowOffset: { width: 0, height: scale(2) },
        shadowOpacity: theme.dark ? 0.2 : 0.08,
        shadowRadius: theme.dark ? scale(12) : scale(8),
      }]}
      onPress={() => onPress?.(post)}
      activeOpacity={0.98}
    >
      {/* Header del post */}
      <View style={styles.header}>
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
              photoURL={postAuthor.photoURL}
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
          <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
            {getRelativeTime(post.createdAt.toDate())}
          </Text>
        </View>
      </View>

      {/* Contenido del post */}
      <View style={styles.content}>
        {renderTextWithLinks(post.content)}
        {renderMedia()}
      </View>

      {/* Acciones */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            isLiked && {
              shadowColor: theme.colors.like,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.2,
              shadowRadius: scale(4),
            }
          ]}
          onPress={handleLike}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={ICON_SIZE.sm}
            color={isLiked ? theme.colors.like : theme.colors.textSecondary}
          />
          <Text style={[styles.actionText, {
            color: isLiked ? theme.colors.like : theme.colors.textSecondary
          }]}>
            {formatNumber(likesCount)}
          </Text>
        </TouchableOpacity>

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

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onPrivateMessage(post.userId, postAuthor ? {
            displayName: postAuthor.displayName,
            avatarType: postAuthor.avatarType,
            avatarId: postAuthor.avatarId,
            photoURL: postAuthor.photoURL,
          } : undefined)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="mail-outline"
            size={ICON_SIZE.sm}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
            Privado
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Ionicons
            name="share-outline"
            size={ICON_SIZE.sm}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
            {formatNumber(post.shares)}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 0,
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.1,
    shadowRadius: scale(8),
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: SPACING.sm,
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
    maxWidth: scale(425),
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
});

export default PostCard;
