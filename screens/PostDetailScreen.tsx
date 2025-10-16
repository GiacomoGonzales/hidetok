import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { Post, Comment, mockComments, getRelativeTime, formatNumber } from '../data/mockData';
import PostCard from '../components/PostCard';

interface PostDetailScreenProps {
  route: {
    params: {
      post: Post;
    };
  };
  navigation: {
    goBack: () => void;
  };
}

const PostDetailScreen: React.FC<PostDetailScreenProps> = ({ route, navigation }) => {
  const { post } = route.params;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>(mockComments[post.id] || []);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const textInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const handleLike = (postId: string) => {
    console.log('Like post:', postId);
  };

  const handleComment = (postId: string) => {
    textInputRef.current?.focus();
  };

  const handlePrivateMessage = (postId: string) => {
    console.log('Private message about post:', postId);
  };

  const handlePostPress = (pressedPost: Post) => {
    // Evitar navegación recursiva
    console.log('Post pressed in detail view:', pressedPost.id);
  };

  const handleSubmitComment = () => {
    if (commentText.trim()) {
      const newComment: Comment = {
        id: `comment_${Date.now()}`,
        postId: post.id,
        userId: 'current_user',
        username: 'anon_999',
        avatar: 'https://picsum.photos/200/200?random=999',
        content: commentText.trim(),
        createdAt: new Date(),
        likesCount: 0,
        isLiked: false,
      };

      setComments(prev => [...prev, newComment]);
      setCommentText('');
      
      // Scroll to new comment
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      Alert.alert('¡Comentario publicado!', 'Tu comentario se ha agregado correctamente');
    }
  };

  const handleInputFocus = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  const handleCommentLike = (commentId: string) => {
    setComments(prev =>
      prev.map(comment =>
        comment.id === commentId
          ? {
              ...comment,
              isLiked: !comment.isLiked,
              likesCount: comment.isLiked ? comment.likesCount - 1 : comment.likesCount + 1,
            }
          : comment
      )
    );
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={[styles.commentItem, { borderBottomColor: theme.colors.border }]}>
      <Image
        source={{ uri: item.avatar }}
        style={[styles.commentAvatar, { backgroundColor: theme.colors.surface }]}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={[styles.commentUsername, { color: theme.colors.text }]}>
            {item.username}
          </Text>
          <Text style={[styles.commentTime, { color: theme.colors.textSecondary }]}>
            {getRelativeTime(item.createdAt)}
          </Text>
        </View>
        <Text style={[styles.commentText, { color: theme.colors.text }]}>
          {item.content}
        </Text>
        <View style={styles.commentActions}>
          <TouchableOpacity 
            style={styles.commentAction}
            onPress={() => handleCommentLike(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={item.isLiked ? 'heart' : 'heart-outline'} 
              size={16} 
              color={item.isLiked ? theme.colors.accent : theme.colors.textSecondary} 
            />
            {item.likesCount > 0 && (
              <Text style={[styles.commentActionText, { 
                color: item.isLiked ? theme.colors.accent : theme.colors.textSecondary 
              }]}>
                {formatNumber(item.likesCount)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.postSection}>
      <PostCard
        post={post}
        onLike={handleLike}
        onComment={handleComment}
        onPrivateMessage={handlePrivateMessage}
        onPress={handlePostPress}
      />
      <View style={[styles.commentsHeader, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.commentsTitle, { color: theme.colors.text }]}>
          Comentarios ({comments.length})
        </Text>
      </View>
    </View>
  );

  const renderEmptyComments = () => (
    <View style={styles.emptyComments}>
      <Ionicons name="chatbubble-outline" size={48} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        No hay comentarios aún
      </Text>
      <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
        ¡Sé el primero en comentar!
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={[styles.fullscreenContainer, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { 
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.border,
        paddingTop: insets.top,
      }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={navigation.goBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Publicación
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content with Comments */}
      <FlatList
        ref={flatListRef}
        data={comments}
        renderItem={renderComment}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyComments}
        style={styles.contentList}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      />

      {/* Comment Input */}
      <View style={[styles.inputSection, { 
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.background,
        paddingBottom: Math.max(insets.bottom, 16),
      }]}>
        <View style={[styles.inputWrapper, { 
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        }]}>
          <TextInput
            ref={textInputRef}
            style={[styles.textInput, { color: theme.colors.text }]}
            placeholder="Escribe un comentario..."
            placeholderTextColor={theme.colors.textSecondary}
            value={commentText}
            onChangeText={setCommentText}
            multiline={true}
            maxLength={200}
            returnKeyType="send"
            onSubmitEditing={handleSubmitComment}
            onFocus={handleInputFocus}
            blurOnSubmit={false}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.sendButton, { 
              backgroundColor: commentText.trim() ? theme.colors.accent : 'transparent',
            }]}
            onPress={handleSubmitComment}
            disabled={!commentText.trim()}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="send" 
              size={18} 
              color={commentText.trim() ? 'white' : theme.colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>
        {commentText.length > 150 && (
          <Text style={[styles.charCounter, { color: theme.colors.textSecondary }]}>
            {commentText.length}/200
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  contentList: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  postSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  commentsHeader: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginTop: 12,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 4,
  },
  commentActionText: {
    fontSize: 12,
    marginLeft: 4,
  },
  emptyComments: {
    paddingVertical: 60,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  inputSection: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 2,
    paddingRight: 8,
    maxHeight: 80,
    minHeight: 20,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  charCounter: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
});

export default PostDetailScreen;
