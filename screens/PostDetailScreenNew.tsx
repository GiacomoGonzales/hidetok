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

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
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
    console.log('Comment on post:', postId);
    textInputRef.current?.focus();
  };

  const handlePrivateMessage = (postId: string) => {
    console.log('Private message about post:', postId);
  };

  const handlePostPress = (pressedPost: Post) => {
    console.log('Post pressed:', pressedPost.id);
  };

  const handleSubmitComment = () => {
    if (commentText.trim()) {
      const newComment: Comment = {
        id: `comment_${Date.now()}`,
        postId: post.id,
        user: {
          id: 'current_user',
          username: 'anon_999',
          avatar: 'https://picsum.photos/200/200?random=999',
        },
        text: commentText.trim(),
        timestamp: new Date().toISOString(),
        likes: 0,
      };

      setComments(prev => [...prev, newComment]);
      setCommentText('');
      Alert.alert('Comentario publicado', 'Tu comentario se ha agregado correctamente');
    }
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={[styles.commentItem, { borderBottomColor: theme.colors.border }]}>
      <Image
        source={{ uri: item.user.avatar }}
        style={[styles.commentAvatar, { backgroundColor: theme.colors.surface }]}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={[styles.commentUsername, { color: theme.colors.text }]}>
            {item.user.username}
          </Text>
          <Text style={[styles.commentTime, { color: theme.colors.textSecondary }]}>
            {getRelativeTime(item.timestamp)}
          </Text>
        </View>
        <Text style={[styles.commentText, { color: theme.colors.text }]}>
          {item.text}
        </Text>
        <View style={styles.commentActions}>
          <TouchableOpacity style={styles.commentAction}>
            <Ionicons name="heart-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.commentActionText, { color: theme.colors.textSecondary }]}>
              {formatNumber(item.likes)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.modalContainer}>
      {/* Modal Background */}
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={navigation.goBack}
      />
      
      {/* Modal Content */}
      <View style={[styles.modalContent, { 
        backgroundColor: theme.colors.background,
        paddingTop: insets.top,
        paddingBottom: Math.max(insets.bottom, 16) + (keyboardHeight > 0 ? keyboardHeight : 0),
      }]}>
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={navigation.goBack}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            Publicación
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Post Content */}
        <View style={styles.postContainer}>
          <PostCard
            post={post}
            onLike={handleLike}
            onComment={handleComment}
            onPrivateMessage={handlePrivateMessage}
            onPress={handlePostPress}
          />
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <View style={[styles.commentsSectionHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.commentsTitle, { color: theme.colors.text }]}>
              Comentarios ({comments.length})
            </Text>
          </View>
          
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={item => item.id}
            style={styles.commentsList}
            contentContainerStyle={styles.commentsContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyComments}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No hay comentarios aún. ¡Sé el primero en comentar!
                </Text>
              </View>
            }
          />
        </View>

        {/* Comment Input */}
        <View style={[styles.inputSection, { 
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.background,
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
              multiline={false}
              maxLength={200}
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '95%',
    minHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  postContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  commentsSection: {
    flex: 1,
  },
  commentsSectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  commentsList: {
    flex: 1,
  },
  commentsContent: {
    paddingHorizontal: 20,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 12,
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
  },
  commentActionText: {
    fontSize: 12,
    marginLeft: 4,
  },
  emptyComments: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  inputSection: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    paddingRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  charCounter: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
});

export default PostDetailScreen;
