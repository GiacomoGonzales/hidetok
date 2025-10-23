import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Platform,
  TextInput,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useUserById } from '../hooks/useUserById';
import { Post } from '../services/firestoreService';
import { formatNumber, getRelativeTime } from '../data/mockData';
import AvatarDisplay from './avatars/AvatarDisplay';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, ICON_SIZE } from '../constants/design';
import { scale } from '../utils/scale';

interface PostDetailModalProps {
  visible: boolean;
  post: Post;
  onClose: () => void;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const PostDetailModal: React.FC<PostDetailModalProps> = ({
  visible,
  post,
  onClose,
  onLike,
  onComment,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { userProfile: postAuthor, loading: loadingAuthor } = useUserById(post.userId);

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const isDesktop = screenWidth > 768;

  const handleLike = () => {
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikesCount(prev => newIsLiked ? prev + 1 : prev - 1);
    onLike(post.id!);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    setCurrentImageIndex(index);
  };

  const handleCommentSubmit = () => {
    if (commentText.trim()) {
      // TODO: Implementar envío de comentario
      setCommentText('');
    }
  };

  const renderImages = () => {
    if (!post.imageUrls || post.imageUrls.length === 0) return null;

    if (post.imageUrls.length === 1) {
      return (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: post.imageUrls[0] }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
      );
    }

    // Carrusel para múltiples imágenes
    return (
      <View style={styles.imageContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {post.imageUrls.map((imageUrl, index) => (
            <View key={index} style={[styles.carouselImageContainer, { width: isDesktop ? screenWidth * 0.6 : screenWidth }]}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>

        {/* Indicadores de página */}
        {post.imageUrls.length > 1 && (
          <>
            <View style={styles.pageIndicatorContainer}>
              {post.imageUrls.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.pageIndicator,
                    {
                      backgroundColor: index === currentImageIndex
                        ? theme.colors.accent
                        : 'rgba(255,255,255,0.5)',
                    }
                  ]}
                />
              ))}
            </View>

            {/* Contador */}
            <View style={[styles.imageCounter, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
              <Text style={styles.imageCounterText}>
                {currentImageIndex + 1}/{post.imageUrls.length}
              </Text>
            </View>
          </>
        )}
      </View>
    );
  };

  const renderPostInfo = () => (
    <View style={[styles.infoContainer, { backgroundColor: theme.colors.background }]}>
      {/* Header del post */}
      <View style={[styles.postHeader, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.authorInfo}>
          {postAuthor && (
            <AvatarDisplay
              size={scale(40)}
              avatarType={postAuthor.avatarType || 'predefined'}
              avatarId={postAuthor.avatarId || 'male'}
              photoURL={postAuthor.photoURL}
              backgroundColor={theme.colors.accent}
              showBorder={false}
            />
          )}
          <View style={styles.authorText}>
            <Text style={[styles.authorName, { color: theme.colors.text }]}>
              {postAuthor?.displayName || 'Usuario Anónimo'}
            </Text>
            <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
              {getRelativeTime(post.createdAt.toDate())}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={ICON_SIZE.lg} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Contenido del post */}
      <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.postContent, { color: theme.colors.text }]}>
          {post.content}
        </Text>

        {/* Estadísticas */}
        <View style={[styles.stats, { borderTopColor: theme.colors.border, borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
            <Text style={{ fontWeight: FONT_WEIGHT.semibold, color: theme.colors.text }}>
              {formatNumber(likesCount)}
            </Text> Me gusta
          </Text>
          <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
            <Text style={{ fontWeight: FONT_WEIGHT.semibold, color: theme.colors.text }}>
              {formatNumber(post.comments)}
            </Text> Comentarios
          </Text>
        </View>

        {/* Acciones */}
        <View style={[styles.actions, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLike}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={ICON_SIZE.md}
              color={isLiked ? theme.colors.like : theme.colors.textSecondary}
            />
            <Text style={[styles.actionText, { color: isLiked ? theme.colors.like : theme.colors.textSecondary }]}>
              Me gusta
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons
              name="chatbubble-outline"
              size={ICON_SIZE.md}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
              Comentar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons
              name="share-outline"
              size={ICON_SIZE.md}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
              Compartir
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sección de comentarios */}
        <View style={styles.commentsSection}>
          <Text style={[styles.commentsTitle, { color: theme.colors.text }]}>
            Comentarios
          </Text>

          {/* Placeholder - No hay comentarios aún */}
          <View style={styles.noComments}>
            <Ionicons name="chatbubbles-outline" size={scale(48)} color={theme.colors.textSecondary} />
            <Text style={[styles.noCommentsText, { color: theme.colors.textSecondary }]}>
              Sé el primero en comentar
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Input de comentario */}
      <View style={[styles.commentInputContainer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
        {userProfile && (
          <AvatarDisplay
            size={scale(32)}
            avatarType={userProfile.avatarType || 'predefined'}
            avatarId={userProfile.avatarId || 'male'}
            photoURL={userProfile.photoURL}
            backgroundColor={theme.colors.accent}
            showBorder={false}
          />
        )}
        <TextInput
          style={[styles.commentInput, {
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderColor: theme.colors.border,
          }]}
          placeholder="Escribe un comentario..."
          placeholderTextColor={theme.colors.textSecondary}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, {
            backgroundColor: commentText.trim() ? theme.colors.accent : theme.colors.surface,
            opacity: commentText.trim() ? 1 : 0.5,
          }]}
          onPress={handleCommentSubmit}
          disabled={!commentText.trim()}
        >
          <Ionicons name="send" size={ICON_SIZE.sm} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
          {isDesktop ? (
            // Layout Desktop: Imagen a la izquierda, Info a la derecha
            <>
              <View style={styles.leftColumn}>
                {renderImages()}
              </View>
              <View style={styles.rightColumn}>
                {renderPostInfo()}
              </View>
            </>
          ) : (
            // Layout Mobile: Todo vertical
            <View style={styles.mobileLayout}>
              <TouchableOpacity onPress={onClose} style={styles.mobileCloseButton}>
                <Ionicons name="close" size={ICON_SIZE.xl} color="white" />
              </TouchableOpacity>
              {renderImages()}
              {renderPostInfo()}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '100%',
    height: '100%',
  },
  modalContentDesktop: {
    flexDirection: 'row',
    maxWidth: screenWidth * 0.9,
    maxHeight: screenHeight * 0.9,
    width: scale(1200),
    height: '90%',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  leftColumn: {
    flex: 1.2,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightColumn: {
    flex: 1,
    minWidth: scale(400),
    maxWidth: scale(500),
  },
  mobileLayout: {
    flex: 1,
  },
  mobileCloseButton: {
    position: 'absolute',
    top: scale(40),
    right: SPACING.lg,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: BORDER_RADIUS.full,
    padding: SPACING.sm,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  carouselImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageIndicatorContainer: {
    position: 'absolute',
    bottom: SPACING.lg,
    flexDirection: 'row',
    gap: scale(6),
  },
  pageIndicator: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },
  imageCounter: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(4),
    borderRadius: BORDER_RADIUS.sm,
  },
  imageCounterText: {
    color: 'white',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  infoContainer: {
    flex: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: scale(1),
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  authorText: {
    flex: 1,
  },
  authorName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },
  timestamp: {
    fontSize: FONT_SIZE.sm,
    marginTop: scale(2),
  },
  closeButton: {
    padding: SPACING.xs,
  },
  contentScroll: {
    flex: 1,
  },
  postContent: {
    fontSize: FONT_SIZE.md,
    lineHeight: scale(22),
    padding: SPACING.lg,
  },
  stats: {
    flexDirection: 'row',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: scale(1),
    borderBottomWidth: scale(1),
  },
  statText: {
    fontSize: FONT_SIZE.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.sm,
    borderBottomWidth: scale(1),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  actionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  commentsSection: {
    padding: SPACING.lg,
  },
  commentsTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: SPACING.md,
  },
  noComments: {
    alignItems: 'center',
    paddingVertical: scale(40),
  },
  noCommentsText: {
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.md,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.lg,
    borderTopWidth: scale(1),
  },
  commentInput: {
    flex: 1,
    borderWidth: scale(1),
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.sm,
    maxHeight: scale(100),
  },
  sendButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PostDetailModal;
