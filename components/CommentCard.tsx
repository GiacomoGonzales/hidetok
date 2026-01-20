import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useUserById } from '../hooks/useUserById';
import { Comment } from '../services/firestoreService';
import { getRelativeTime } from '../data/mockData';
import AvatarDisplay from './avatars/AvatarDisplay';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, ICON_SIZE } from '../constants/design';
import { scale } from '../utils/scale';

interface CommentCardProps {
  comment: Comment;
  onProfilePress?: (userId: string) => void;
  onLike?: (commentId: string) => void;
  isLiked?: boolean;
}

const CommentCard: React.FC<CommentCardProps> = ({
  comment,
  onProfilePress,
  onLike,
  isLiked = false,
}) => {
  const { theme } = useTheme();
  const { userProfile: commentAuthor, loading: loadingAuthor } = useUserById(comment.userId);

  const getCommentDate = () => {
    if (!comment.createdAt) return new Date();
    if (typeof comment.createdAt.toDate === 'function') {
      return comment.createdAt.toDate();
    }
    if (comment.createdAt instanceof Date) {
      return comment.createdAt;
    }
    if (typeof comment.createdAt === 'object' && 'seconds' in comment.createdAt) {
      return new Date((comment.createdAt as any).seconds * 1000);
    }
    return new Date();
  };

  return (
    <View style={[styles.container, { borderBottomColor: theme.colors.border }]}>
      <TouchableOpacity
        onPress={() => onProfilePress?.(comment.userId)}
        activeOpacity={0.7}
        disabled={loadingAuthor}
      >
        {loadingAuthor ? (
          <View style={[styles.avatar, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="person" size={scale(16)} color={theme.colors.textSecondary} />
          </View>
        ) : commentAuthor ? (
          <AvatarDisplay
            size={scale(32)}
            avatarType={commentAuthor.avatarType || 'predefined'}
            avatarId={commentAuthor.avatarId || 'male'}
            photoURL={typeof commentAuthor.photoURL === 'string' ? commentAuthor.photoURL : undefined}
            photoURLThumbnail={typeof commentAuthor.photoURLThumbnail === 'string' ? commentAuthor.photoURLThumbnail : undefined}
            backgroundColor={theme.colors.accent}
            showBorder={false}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => onProfilePress?.(comment.userId)}
            activeOpacity={0.7}
          >
            <Text style={[styles.username, { color: theme.colors.text }]}>
              {loadingAuthor ? 'Cargando...' : commentAuthor?.displayName || 'Usuario Anónimo'}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
            {getRelativeTime(getCommentDate())}
          </Text>
        </View>

        <Text style={[styles.commentText, { color: theme.colors.text }]}>
          {comment.content}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onLike?.(comment.id!)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={ICON_SIZE.xs}
              color={isLiked ? theme.colors.like : theme.colors.textSecondary}
            />
            {comment.likes > 0 && (
              <Text style={[styles.likeCount, {
                color: isLiked ? theme.colors.like : theme.colors.textSecondary
              }]}>
                {comment.likes}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    borderBottomWidth: scale(0.5),
  },
  avatar: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZE.sm,
    color: 'white',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: scale(4),
  },
  username: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: scale(-0.1),
  },
  timestamp: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.regular,
  },
  commentText: {
    fontSize: FONT_SIZE.base,
    lineHeight: scale(20),
    fontWeight: FONT_WEIGHT.regular,
    letterSpacing: scale(-0.1),
    marginBottom: scale(6),
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingVertical: scale(2),
  },
  likeCount: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default CommentCard;
