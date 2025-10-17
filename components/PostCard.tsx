import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Share,
  Alert,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useUserById } from '../hooks/useUserById';
import { Post } from '../services/firestoreService';
import { formatNumber, getRelativeTime } from '../data/mockData';
import AvatarDisplay from './avatars/AvatarDisplay';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, ICON_SIZE } from '../constants/design';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onPrivateMessage: (postId: string) => void;
  onPress?: (post: Post) => void;
}

const { width: screenWidth } = Dimensions.get('window');
const mediaSize = (screenWidth - 48) / 2; // Para grilla 2x2

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

  const renderMedia = () => {
    if (!post.imageUrls || post.imageUrls.length === 0) return null;

    if (post.imageUrls.length === 1) {
      return (
        <View style={styles.singleMediaContainer}>
          <Image
            source={{ uri: post.imageUrls[0] }}
            style={[styles.singleMedia, { backgroundColor: theme.colors.surface }]}
            resizeMode="cover"
          />
        </View>
      );
    }

    // Grilla para múltiples imágenes
    return (
      <View style={styles.mediaGrid}>
        {post.imageUrls.slice(0, 4).map((imageUrl, index) => (
          <View key={index} style={styles.mediaGridItem}>
            <Image
              source={{ uri: imageUrl }}
              style={[styles.gridMedia, { backgroundColor: theme.colors.surface }]}
              resizeMode="cover"
            />
            {index === 3 && post.imageUrls!.length > 4 && (
              <View style={styles.moreMediaOverlay}>
                <Text style={styles.moreMediaText}>
                  +{post.imageUrls!.length - 4}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, {
        backgroundColor: theme.colors.card,
        shadowColor: theme.dark ? theme.colors.glow : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.dark ? 0.2 : 0.08,
        shadowRadius: theme.dark ? 12 : 8,
      }]}
      onPress={() => onPress?.(post)}
      activeOpacity={0.98}
    >
      {/* Header del post */}
      <View style={styles.header}>
        {loadingAuthor ? (
          // Placeholder mientras carga el autor
          <View style={[styles.avatar, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
          </View>
        ) : postAuthor ? (
          // Avatar real del autor con indicador de anonimato
          <View style={styles.avatarContainer}>
            <AvatarDisplay
              size={40}
              avatarType={postAuthor.avatarType || 'predefined'}
              avatarId={postAuthor.avatarId || 'male'}
              photoURL={postAuthor.photoURL}
              backgroundColor={theme.colors.accent}
              showBorder={false}
            />
            <View style={[styles.anonymousBadge, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="eye-off" size={10} color={theme.colors.accent} />
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
              shadowRadius: 4,
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
          onPress={() => onPrivateMessage(post.id!)}
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
            {formatNumber(post.sharesCount)}
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginBottom: 2,
    letterSpacing: -0.2,
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
    lineHeight: 21,
    marginBottom: SPACING.md,
    fontWeight: FONT_WEIGHT.regular,
    letterSpacing: -0.1,
  },
  singleMediaContainer: {
    position: 'relative',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  singleMedia: {
    width: '100%',
    height: 280,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  mediaGridItem: {
    position: 'relative',
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  gridMedia: {
    width: mediaSize,
    height: mediaSize,
  },
  moreMediaOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreMediaText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.xs,
    justifyContent: 'space-between',
    maxWidth: 425,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: FONT_SIZE.sm,
    marginLeft: 4,
    fontWeight: FONT_WEIGHT.regular,
    letterSpacing: -0.1,
  },
});

export default PostCard;
