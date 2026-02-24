import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ViewToken,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DocumentSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useUserById } from '../hooks/useUserById';
import { useVote } from '../hooks/useVote';
import { Post, postsService } from '../services/firestoreService';
import { MainStackParamList } from '../navigation/MainStackNavigator';
import { formatNumber, getRelativeTime } from '../data/mockData';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import { scale } from '../utils/scale';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ReelsRouteProp = RouteProp<MainStackParamList, 'Reels'>;

// ===================== ReelItem =====================

interface ReelItemProps {
  post: Post;
  isActive: boolean;
  onBack: () => void;
  onComment: (postId: string) => void;
  initialPositionMillis?: number;
}

const ReelItem: React.FC<ReelItemProps> = React.memo(({ post, isActive, onBack, onComment, initialPositionMillis }) => {
  const { user } = useAuth();
  const { userProfile: activeProfile } = useUserProfile();
  const { userProfile: postAuthor } = useUserById(post.userId);
  const videoRef = useRef<Video>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const insets = useSafeAreaInsets();

  const { stats: voteStats, voteAgree, voteDisagree } = useVote({
    postId: post.id!,
    userId: activeProfile?.uid || user?.uid,
    initialStats: {
      agreementCount: post.agreementCount || 0,
      disagreementCount: post.disagreementCount || 0,
    },
  });

  const hasSeekedRef = useRef(false);

  // Set audio mode once on mount
  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  }, []);

  // Auto-play/pause based on visibility
  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive && !isPaused) {
      videoRef.current.playAsync();
    } else {
      videoRef.current.pauseAsync();
    }
  }, [isActive, isPaused]);

  const handleTapVideo = useCallback(() => {
    if (!videoRef.current) return;
    if (isPaused) {
      videoRef.current.playAsync();
      setIsPaused(false);
    } else {
      videoRef.current.pauseAsync();
      setIsPaused(true);
    }
  }, [isPaused]);

  const handlePlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsBuffering(status.isBuffering);
      // Mark as started once the video actually plays a frame
      if (status.isPlaying && !hasStartedPlaying) {
        setHasStartedPlaying(true);
      }
      // Seek to initial position once when video first loads
      if (initialPositionMillis && !hasSeekedRef.current) {
        hasSeekedRef.current = true;
        videoRef.current?.setPositionAsync(initialPositionMillis).catch(() => {});
      }
    }
  }, [initialPositionMillis, hasStartedPlaying]);

  return (
    <View style={[styles.reelContainer, { height: SCREEN_HEIGHT }]}>
      {/* Poster image — visible immediately, stays until video plays */}
      {post.imageUrls?.[0] && (
        <Image
          source={{ uri: post.imageUrls[0] }}
          style={[StyleSheet.absoluteFill, { zIndex: hasStartedPlaying ? 0 : 2 }]}
          resizeMode="cover"
        />
      )}

      {/* Full-screen video — renders underneath poster until ready */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTapVideo}
        style={[StyleSheet.absoluteFill, { zIndex: hasStartedPlaying ? 1 : 0 }]}
      >
        <Video
          ref={videoRef}
          source={{ uri: post.videoUrl! }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isActive}
          isMuted={false}
          isLooping
          progressUpdateIntervalMillis={500}
          onPlaybackStatusUpdate={handlePlaybackStatus}
        />
      </TouchableOpacity>

      {/* Spinner only when rebuffering mid-playback, not on initial load */}
      {isBuffering && isActive && hasStartedPlaying && (
        <View style={styles.pauseOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="white" />
        </View>
      )}

      {/* Pause icon overlay */}
      {isPaused && !isBuffering && (
        <View style={styles.pauseOverlay} pointerEvents="none">
          <View style={styles.pauseIcon}>
            <Ionicons name="play" size={scale(50)} color="white" />
          </View>
        </View>
      )}

      {/* Top gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent']}
        style={[styles.topGradient, { paddingTop: insets.top }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={scale(26)} color="white" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Reels</Text>
        <View style={{ width: scale(26) }} />
      </LinearGradient>

      {/* Bottom gradient + info */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={[styles.bottomGradient, { paddingBottom: insets.bottom + scale(16) }]}
        pointerEvents="box-none"
      >
        <View style={styles.bottomContent}>
          {/* Left: user info + description */}
          <View style={styles.bottomLeft}>
            {/* Username row */}
            <View style={styles.userRow}>
              {postAuthor && (
                <AvatarDisplay
                  size={scale(32)}
                  avatarType={postAuthor.avatarType || 'predefined'}
                  avatarId={postAuthor.avatarId || 'male'}
                  photoURL={typeof postAuthor.photoURL === 'string' ? postAuthor.photoURL : undefined}
                  photoURLThumbnail={typeof postAuthor.photoURLThumbnail === 'string' ? postAuthor.photoURLThumbnail : undefined}
                  backgroundColor="#8B5CF6"
                  showBorder={false}
                />
              )}
              <Text style={styles.username} numberOfLines={1}>
                {postAuthor?.displayName || 'Usuario'}
              </Text>
              <Text style={styles.timeAgo}>
                {getRelativeTime(post.createdAt.toDate())}
              </Text>
            </View>

            {/* Description */}
            {post.content ? (
              <Text style={styles.description} numberOfLines={2}>
                {post.content}
              </Text>
            ) : null}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <Text style={styles.tags} numberOfLines={1}>
                {post.tags.map(t => `#${t}`).join(' ')}
              </Text>
            )}
          </View>

          {/* Right sidebar: actions */}
          <View style={styles.rightSidebar}>
            {/* Agree */}
            <TouchableOpacity style={styles.sidebarBtn} onPress={voteAgree}>
              <Ionicons
                name={voteStats.userVote === 'agree' ? 'thumbs-up' : 'thumbs-up-outline'}
                size={scale(26)}
                color={voteStats.userVote === 'agree' ? '#22C55E' : 'white'}
              />
              <Text style={styles.sidebarCount}>
                {formatNumber(voteStats.agreementCount)}
              </Text>
            </TouchableOpacity>

            {/* Disagree */}
            <TouchableOpacity style={styles.sidebarBtn} onPress={voteDisagree}>
              <Ionicons
                name={voteStats.userVote === 'disagree' ? 'thumbs-down' : 'thumbs-down-outline'}
                size={scale(26)}
                color={voteStats.userVote === 'disagree' ? '#EF4444' : 'white'}
              />
              <Text style={styles.sidebarCount}>
                {formatNumber(voteStats.disagreementCount)}
              </Text>
            </TouchableOpacity>

            {/* Comment */}
            <TouchableOpacity style={styles.sidebarBtn} onPress={() => onComment(post.id!)}>
              <Ionicons name="chatbubble-outline" size={scale(26)} color="white" />
              <Text style={styles.sidebarCount}>
                {formatNumber(post.comments)}
              </Text>
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity style={styles.sidebarBtn}>
              <Ionicons name="share-social-outline" size={scale(26)} color="white" />
              <Text style={styles.sidebarCount}>
                {formatNumber(post.shares)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
});

// ===================== ReelsScreen =====================

const ReelsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<ReelsRouteProp>();
  const { initialPost, initialVideoPosts, communitySlug, initialPositionMillis } = route.params;

  const [videoPosts, setVideoPosts] = useState<Post[]>(initialVideoPosts);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const loadedIds = useRef(new Set<string>(initialVideoPosts.map(p => p.id!)));

  // Calculate initial scroll index
  const initialIndex = useMemo(() => {
    const idx = initialVideoPosts.findIndex(p => p.id === initialPost.id);
    return idx >= 0 ? idx : 0;
  }, []);

  // Set initial active index
  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleComment = useCallback((postId: string) => {
    const post = videoPosts.find(p => p.id === postId);
    if (post) {
      (navigation as any).navigate('PostDetail', { post });
    }
  }, [videoPosts, navigation]);

  // Viewability tracking
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const visibleIndex = viewableItems[0].index;
      if (visibleIndex != null) {
        setActiveIndex(visibleIndex);
      }
    }
  }).current;

  // Load more videos
  const handleEndReached = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const result = await postsService.getVideoPostsPaginated(15, lastDoc || undefined, communitySlug);
      const newPosts = result.documents.filter(p => !loadedIds.current.has(p.id!));

      if (newPosts.length > 0) {
        newPosts.forEach(p => loadedIds.current.add(p.id!));
        setVideoPosts(prev => [...prev, ...newPosts]);
        setLastDoc(result.lastDoc);
        setHasMore(newPosts.length > 0);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more reels:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, lastDoc, communitySlug]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: SCREEN_HEIGHT,
    offset: SCREEN_HEIGHT * index,
    index,
  }), []);

  const renderItem = useCallback(({ item, index }: { item: Post; index: number }) => (
    <ReelItem
      post={item}
      isActive={index === activeIndex}
      onBack={handleBack}
      onComment={handleComment}
      initialPositionMillis={index === initialIndex ? initialPositionMillis : undefined}
    />
  ), [activeIndex, handleBack, handleComment, initialIndex, initialPositionMillis]);

  const keyExtractor = useCallback((item: Post) => item.id!, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <FlatList
        data={videoPosts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        getItemLayout={getItemLayout}
        initialScrollIndex={initialIndex}
        windowSize={3}
        maxToRenderPerBatch={2}
        removeClippedSubviews={Platform.OS !== 'web'}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        onEndReached={handleEndReached}
        onEndReachedThreshold={1}
        ListFooterComponent={
          loadingMore ? (
            <View style={[styles.loadingFooter, { height: SCREEN_HEIGHT * 0.3 }]}>
              <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  reelContainer: {
    width: SCREEN_WIDTH,
    backgroundColor: '#000',
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseIcon: {
    width: scale(70),
    height: scale(70),
    borderRadius: scale(35),
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: scale(4),
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingBottom: scale(16),
  },
  backButton: {
    padding: scale(4),
  },
  topTitle: {
    flex: 1,
    color: 'white',
    fontSize: scale(18),
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: scale(60),
    paddingHorizontal: scale(16),
  },
  bottomContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bottomLeft: {
    flex: 1,
    marginRight: scale(12),
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(8),
  },
  username: {
    color: 'white',
    fontSize: scale(15),
    fontWeight: '600',
    flexShrink: 1,
  },
  timeAgo: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: scale(12),
  },
  description: {
    color: 'white',
    fontSize: scale(14),
    lineHeight: scale(20),
    marginBottom: scale(4),
  },
  tags: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: scale(13),
  },
  rightSidebar: {
    alignItems: 'center',
    gap: scale(20),
    paddingBottom: scale(8),
  },
  sidebarBtn: {
    alignItems: 'center',
    gap: scale(4),
  },
  sidebarCount: {
    color: 'white',
    fontSize: scale(12),
    fontWeight: '500',
  },
  loadingFooter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReelsScreen;
