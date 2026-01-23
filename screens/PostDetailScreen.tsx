import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  TextInput,
  NativeSyntheticEvent,
  NativeScrollEvent,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useUserById } from '../hooks/useUserById';
import { useLikes } from '../hooks/useLikes';
import { Post, Comment, commentsService, postsService, PollOption } from '../services/firestoreService';
import { notificationService } from '../services/notificationService';
import { uploadCommentImage } from '../services/storageService';
import { formatNumber, getRelativeTime } from '../data/mockData';
import { Timestamp } from 'firebase/firestore';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import ImageViewer from '../components/ImageViewer';
import CommentCard from '../components/CommentCard';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, ICON_SIZE } from '../constants/design';
import { scale } from '../utils/scale';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../navigation/MainStackNavigator';

type PostDetailScreenNavigationProp = StackNavigationProp<MainStackParamList, 'PostDetail'>;

type PostDetailScreenRouteProp = RouteProp<MainStackParamList, 'PostDetail'>;

const { width: screenWidth } = Dimensions.get('window');
const CARD_MAX_WIDTH = 700;
const MIN_IMAGE_HEIGHT = scale(200);
const MAX_IMAGE_HEIGHT = scale(500);

const getCarouselWidth = () => {
  const availableWidth = Math.min(screenWidth, scale(CARD_MAX_WIDTH));
  return availableWidth;
};

interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

const PostDetailScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const route = useRoute<PostDetailScreenRouteProp>();
  const navigation = useNavigation<PostDetailScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { post } = route.params;
  const { userProfile: postAuthor, loading: loadingAuthor } = useUserById(post.userId);

  // Hook de likes con estado optimista y notificaciones
  const { isLiked, likesCount, toggleLike } = useLikes(
    post.id!,
    post.likes,
    {
      postOwnerId: post.userId,
      postContent: post.content,
    }
  );

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [localPoll, setLocalPoll] = useState(post.poll);
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

  // Cargar comentarios en tiempo real
  useEffect(() => {
    if (!post.id) {
      setLoadingComments(false);
      return;
    }

    setLoadingComments(true);
    console.log('📝 Suscribiéndose a comentarios del post:', post.id);

    const unsubscribe = commentsService.subscribeToPost(post.id, (updatedComments) => {
      console.log('✅ Comentarios recibidos:', updatedComments.length);
      setComments(updatedComments);
      setLoadingComments(false);
    });

    return () => {
      console.log('🔌 Desuscribiéndose de comentarios');
      unsubscribe();
    };
  }, [post.id]);

  // Sincronizar poll local con el post
  useEffect(() => {
    setLocalPoll(post.poll);
  }, [post.poll]);

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

  const getImageHeight = () => {
    if (!imageDimensions) {
      return scale(300); // Altura por defecto mientras carga
    }

    // Calcular altura basada en el aspect ratio
    const calculatedHeight = carouselWidth / imageDimensions.aspectRatio;

    // Limitar entre MIN y MAX
    return Math.max(MIN_IMAGE_HEIGHT, Math.min(MAX_IMAGE_HEIGHT, calculatedHeight));
  };

  const handleLike = async () => {
    await toggleLike();
  };

  const handleProfilePress = () => {
    if (post.userId) {
      navigation.navigate('UserProfile', { userId: post.userId });
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / carouselWidth);
    setCurrentImageIndex(index);
  };

  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
    setImageViewerVisible(true);
  };

  const handleCommentProfilePress = (userId: string) => {
    navigation.navigate('UserProfile', { userId });
  };

  const handleCommentLike = async (commentId: string) => {
    // TODO: Implementar likes de comentarios
    console.log('Like comment:', commentId);
  };

  const handlePickCommentImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permisos necesarios',
          'Necesitamos acceso a tu galería para seleccionar imágenes'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCommentImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const removeCommentImage = () => {
    setCommentImage(null);
  };

  const handleCommentSubmit = async () => {
    if ((!commentText.trim() && !commentImage) || !user || !post.id || submittingComment) return;

    try {
      setSubmittingComment(true);
      console.log('💬 Enviando comentario...');

      const trimmedContent = commentText.trim();

      // Subir imagen si hay una
      let imageUrl: string | undefined;
      if (commentImage) {
        console.log('📤 Subiendo imagen del comentario...');
        try {
          const response = await fetch(commentImage);
          const blob = await response.blob();
          imageUrl = await uploadCommentImage(blob, user.uid);
          console.log('✅ Imagen subida:', imageUrl);
        } catch (uploadError) {
          console.error('Error uploading comment image:', uploadError);
          Alert.alert('Error', 'No se pudo subir la imagen');
          setSubmittingComment(false);
          return;
        }
      }

      const commentData: Omit<Comment, 'id'> = {
        postId: post.id,
        userId: user.uid,
        content: trimmedContent,
        likes: 0,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
        // Solo incluir imageUrl si existe (Firebase no acepta undefined)
        ...(imageUrl && { imageUrl }),
      };

      // Crear comentario en Firestore
      const commentId = await commentsService.create(commentData);

      // Incrementar contador de comentarios en el post
      await postsService.update(post.id, {
        comments: (post.comments || 0) + 1,
      });

      // Crear notificación de comentario
      if (userProfile && post.userId !== user.uid) {
        try {
          await notificationService.createCommentNotification(
            post.userId,
            user.uid,
            userProfile.displayName || 'Usuario',
            {
              type: userProfile.avatarType,
              id: userProfile.avatarId,
              url: userProfile.photoURL,
            },
            post.id,
            post.content,
            commentId,
            trimmedContent
          );
          console.log('🔔 Notificación de comentario creada');
        } catch (notifError) {
          console.error('⚠️ Error creando notificación de comentario:', notifError);
        }
      }

      console.log('✅ Comentario enviado');
      setCommentText('');
      setCommentImage(null);

      // Cerrar el teclado
      Keyboard.dismiss();
    } catch (error) {
      console.error('❌ Error enviando comentario:', error);
    } finally {
      setSubmittingComment(false);
    }
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

  const getPostDate = () => {
    if (!post.createdAt) return new Date();
    if (typeof post.createdAt.toDate === 'function') {
      return post.createdAt.toDate();
    }
    if (post.createdAt instanceof Date) {
      return post.createdAt;
    }
    if (typeof post.createdAt === 'object' && 'seconds' in post.createdAt) {
      return new Date((post.createdAt as any).seconds * 1000);
    }
    return new Date();
  };

  const renderImages = () => {
    if (!post.imageUrls || post.imageUrls.length === 0) return null;

    const imageHeight = getImageHeight();

    if (post.imageUrls.length === 1) {
      return (
        <TouchableOpacity
          style={styles.singleImageContainer}
          onPress={() => handleImagePress(0)}
          activeOpacity={0.98}
        >
          <Image
            source={{ uri: post.imageUrls[0] }}
            style={[
              styles.singleImage,
              {
                backgroundColor: theme.colors.surface,
                height: imageHeight,
              }
            ]}
            resizeMode="cover"
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
          {post.imageUrls.map((imageUrl, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.carouselImageContainer, { width: carouselWidth }]}
              onPress={() => handleImagePress(index)}
              activeOpacity={0.98}
            >
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
            </TouchableOpacity>
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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, {
        backgroundColor: theme.colors.card,
        borderBottomColor: theme.colors.border,
        paddingTop: insets.top + SPACING.sm,
      }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Post</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Author info */}
        <View style={styles.authorSection}>
          <TouchableOpacity
            style={styles.authorInfo}
            onPress={handleProfilePress}
            activeOpacity={0.7}
            disabled={loadingAuthor}
          >
            {loadingAuthor ? (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="person" size={scale(20)} color={theme.colors.textSecondary} />
              </View>
            ) : postAuthor ? (
              <AvatarDisplay
                size={scale(48)}
                avatarType={postAuthor.avatarType || 'predefined'}
                avatarId={postAuthor.avatarId || 'male'}
                photoURL={typeof postAuthor.photoURL === 'string' ? postAuthor.photoURL : undefined}
                photoURLThumbnail={typeof postAuthor.photoURLThumbnail === 'string' ? postAuthor.photoURLThumbnail : undefined}
                backgroundColor={theme.colors.accent}
                showBorder={false}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.accent }]}>
                <Text style={styles.avatarText}>👤</Text>
              </View>
            )}
            <View style={styles.authorText}>
              <Text style={[styles.authorName, { color: theme.colors.text }]}>
                {loadingAuthor ? 'Cargando...' : postAuthor?.displayName || 'Usuario Anónimo'}
              </Text>
              <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
                {getRelativeTime(getPostDate())}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Post content */}
        <View style={styles.contentSection}>
          <Text style={[styles.postContent, { color: theme.colors.text }]}>
            {post.content}
          </Text>
        </View>

        {/* Images */}
        {renderImages()}

        {/* Poll */}
        {renderPoll()}

        {/* Stats */}
        <View style={[styles.stats, {
          borderTopColor: theme.colors.border,
          borderBottomColor: theme.colors.border,
        }]}>
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={ICON_SIZE.sm} color={theme.colors.textSecondary} />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              <Text style={{ fontWeight: FONT_WEIGHT.semibold, color: theme.colors.text }}>
                {formatNumber(post.views || 0)}
              </Text> vistas
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="heart-outline" size={ICON_SIZE.sm} color={theme.colors.textSecondary} />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              <Text style={{ fontWeight: FONT_WEIGHT.semibold, color: theme.colors.text }}>
                {formatNumber(likesCount)}
              </Text> me gusta
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble-outline" size={ICON_SIZE.sm} color={theme.colors.textSecondary} />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              <Text style={{ fontWeight: FONT_WEIGHT.semibold, color: theme.colors.text }}>
                {formatNumber(post.comments)}
              </Text> comentarios
            </Text>
          </View>
        </View>

        {/* Actions */}
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
            <Text style={[styles.actionText, {
              color: isLiked ? theme.colors.like : theme.colors.textSecondary
            }]}>
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

        {/* Comments section */}
        <View style={styles.commentsSection}>
          <Text style={[styles.commentsTitle, { color: theme.colors.text }]}>
            Comentarios {comments.length > 0 && `(${comments.length})`}
          </Text>

          {loadingComments ? (
            <View style={styles.loadingComments}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Cargando comentarios...
              </Text>
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.noComments}>
              <View style={[styles.noCommentsIcon, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.textSecondary} />
              </View>
              <Text style={[styles.noCommentsText, { color: theme.colors.textSecondary }]}>
                Sé el primero en comentar
              </Text>
            </View>
          ) : (
            <View>
              {comments.map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  onProfilePress={handleCommentProfilePress}
                  onLike={handleCommentLike}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Comment image preview */}
      {commentImage && (
        <View style={[styles.commentImagePreview, { backgroundColor: theme.colors.surface }]}>
          <Image source={{ uri: commentImage }} style={styles.commentImageThumbnail} />
          <TouchableOpacity
            style={[styles.removeCommentImageButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
            onPress={removeCommentImage}
          >
            <Ionicons name="close" size={16} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Comment input */}
      <View style={[styles.commentInputContainer, {
        backgroundColor: theme.colors.background,
        paddingBottom: insets.bottom || SPACING.sm,
      }]}>
        <View style={styles.avatarContainer}>
          {userProfile && (
            <AvatarDisplay
              size={scale(40)}
              avatarType={userProfile.avatarType || 'predefined'}
              avatarId={userProfile.avatarId || 'male'}
              photoURL={typeof userProfile.photoURL === 'string' ? userProfile.photoURL : undefined}
              photoURLThumbnail={typeof userProfile.photoURLThumbnail === 'string' ? userProfile.photoURLThumbnail : undefined}
              backgroundColor={theme.colors.accent}
              showBorder={false}
            />
          )}
        </View>
        <View style={[styles.commentInputWrapper, {
          backgroundColor: theme.colors.surface,
        }]}>
          <TextInput
            style={[styles.commentInput, {
              color: theme.colors.text,
            }]}
            placeholder="Escribe un comentario..."
            placeholderTextColor={theme.colors.textSecondary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={styles.imageButton}
            onPress={handlePickCommentImage}
            activeOpacity={0.7}
          >
            <Ionicons
              name="image-outline"
              size={ICON_SIZE.md}
              color={commentImage ? theme.colors.accent : theme.colors.text}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.sendButton, {
            backgroundColor: commentText.trim() && !submittingComment ? theme.colors.accent : theme.colors.surface,
          }]}
          onPress={handleCommentSubmit}
          disabled={!commentText.trim() || submittingComment}
        >
          {submittingComment ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name="send"
              size={ICON_SIZE.sm}
              color={commentText.trim() ? '#FFFFFF' : theme.colors.textSecondary}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Image Viewer Modal */}
      {post.imageUrls && post.imageUrls.length > 0 && (
        <ImageViewer
          visible={imageViewerVisible}
          imageUrls={post.imageUrls}
          initialIndex={selectedImageIndex}
          onClose={() => setImageViewerVisible(false)}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: SPACING.xl,
  },
  authorSection: {
    padding: SPACING.lg,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatarPlaceholder: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZE.xl,
    color: 'white',
  },
  authorText: {
    flex: 1,
  },
  authorName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.3,
  },
  timestamp: {
    fontSize: FONT_SIZE.sm,
    marginTop: scale(2),
  },
  contentSection: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  postContent: {
    fontSize: FONT_SIZE.lg,
    lineHeight: scale(24),
    letterSpacing: -0.2,
  },
  singleImageContainer: {
    position: 'relative',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  singleImage: {
    width: '100%',
  },
  carouselContainer: {
    position: 'relative',
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
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
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: scale(1),
    borderBottomWidth: scale(1),
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  statText: {
    fontSize: FONT_SIZE.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.md,
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
    paddingTop: SPACING.lg,
  },
  commentsTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    letterSpacing: -0.3,
  },
  loadingComments: {
    alignItems: 'center',
    paddingVertical: scale(40),
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.sm,
  },
  noComments: {
    alignItems: 'center',
    paddingVertical: scale(40),
  },
  noCommentsIcon: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  noCommentsText: {
    fontSize: FONT_SIZE.base,
    textAlign: 'center',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
  },
  avatarContainer: {
    height: scale(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    minHeight: scale(44),
    maxHeight: scale(100),
  },
  commentInput: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
    letterSpacing: -0.1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    outlineStyle: 'none',
  },
  imageButton: {
    padding: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  commentImagePreview: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentImageThumbnail: {
    width: scale(60),
    height: scale(60),
    borderRadius: BORDER_RADIUS.sm,
  },
  removeCommentImageButton: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  pollContainer: {
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  pollOption: {
    position: 'relative',
    minHeight: scale(48),
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
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
    fontSize: FONT_SIZE.base,
    marginLeft: SPACING.md,
  },
  pollFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  pollVotes: {
    fontSize: FONT_SIZE.sm,
  },
  pollTimeRemaining: {
    fontSize: FONT_SIZE.sm,
  },
});

export default PostDetailScreen;
