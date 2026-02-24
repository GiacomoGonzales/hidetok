import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DocumentSnapshot } from 'firebase/firestore';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useCommunity } from '../hooks/useCommunities';
import { useCommunities } from '../hooks/useCommunities';
import { postsService, Post } from '../services/firestoreService';
import PostCard from '../components/PostCard';
import { MainStackParamList } from '../navigation/MainStackNavigator';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

type CommunityScreenRouteProp = RouteProp<MainStackParamList, 'Community'>;
type CommunityScreenNavigationProp = StackNavigationProp<MainStackParamList>;

const CommunityScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const navigation = useNavigation<CommunityScreenNavigationProp>();
  const route = useRoute<CommunityScreenRouteProp>();
  const insets = useSafeAreaInsets();

  const { communityId } = route.params;
  const { community, isLoading: communityLoading, error: communityError } = useCommunity(communityId);
  const { joinCommunity, leaveCommunity, isMember } = useCommunities(userProfile?.uid);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [joiningOrLeaving, setJoiningOrLeaving] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const isUserMember = community?.id ? isMember(community.id) : false;

  // Video posts for Hids button
  const videoPosts = useMemo(() => posts.filter(p => !!p.videoUrl), [posts]);

  // Cargar posts de la comunidad
  const loadPosts = useCallback(async () => {
    if (!communityId) return;

    try {
      setLoading(true);
      const result = await postsService.getByCommunityIdPaginated(communityId, 15);
      const documents = result?.documents || [];
      setPosts(documents);
      setLastDoc(result?.lastDoc || null);
      setHasMore(documents.length === 15);
    } catch (err) {
      console.error('Error loading community posts:', err);
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const loadMorePosts = async () => {
    if (loadingMore || !hasMore || loading || !lastDoc || !communityId) return;

    try {
      setLoadingMore(true);
      const result = await postsService.getByCommunityIdPaginated(communityId, 15, lastDoc);
      const documents = result?.documents || [];
      if (documents.length > 0) {
        setPosts(prev => [...prev, ...documents]);
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
    await loadPosts();
    setRefreshing(false);
  }, [loadPosts]);

  const handleJoinOrLeave = async () => {
    if (!community?.id || !user) return;

    setJoiningOrLeaving(true);
    try {
      if (isUserMember) {
        await leaveCommunity(community.id);
      } else {
        await joinCommunity(community.id);
      }
    } catch (err) {
      console.error('Error joining/leaving community:', err);
    } finally {
      setJoiningOrLeaving(false);
    }
  };

  const handleComment = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      navigation.navigate('PostDetail', { post });
    }
  };

  const handlePrivateMessage = (userId: string, userData?: any) => {
    if (!user || user.uid === userId) return;
    navigation.navigate('Main' as never, {
      screen: 'Inbox',
      params: {
        screen: 'Conversation',
        params: { otherUserId: userId, otherUserData: userData },
      },
    } as never);
  };

  const handlePostPress = (post: Post) => {
    navigation.navigate('PostDetail', { post });
  };

  const handleVideoPress = useCallback((post: Post, positionMillis?: number) => {
    const videoPosts = posts.filter(p => !!p.videoUrl);
    navigation.navigate('Reels' as any, {
      initialPost: post,
      initialVideoPosts: videoPosts,
      communitySlug: community?.slug || null,
      initialPositionMillis: positionMillis,
    });
  }, [posts, navigation, community?.slug]);

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postContainer}>
      <PostCard
        post={item}
        onComment={handleComment}
        onPrivateMessage={handlePrivateMessage}
        onPress={handlePostPress}
        onVideoPress={handleVideoPress}
      />
    </View>
  );

  const renderHeader = () => {
    if (!community) return null;

    return (
      <View style={styles.headerContent}>
        {/* Community Info */}
        <View style={[styles.communityInfo, { backgroundColor: theme.colors.card }]}>
          <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.accent}20` }]}>
            <Ionicons
              name={community.icon as any}
              size={scale(40)}
              color={theme.colors.accent}
            />
          </View>

          <Text style={[styles.communityName, { color: theme.colors.text }]}>
            {community.name}
          </Text>

          <Text style={[styles.communityDescription, { color: theme.colors.textSecondary }]}>
            {community.description}
          </Text>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {community.memberCount}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                miembros
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {community.postCount}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                posts
              </Text>
            </View>
          </View>

          {/* Join/Leave Button */}
          <TouchableOpacity
            style={[
              styles.joinButton,
              {
                backgroundColor: isUserMember ? theme.colors.surface : theme.colors.accent,
                borderColor: isUserMember ? theme.colors.border : theme.colors.accent,
                borderWidth: isUserMember ? 1 : 0,
              },
            ]}
            onPress={handleJoinOrLeave}
            disabled={joiningOrLeaving}
          >
            {joiningOrLeaving ? (
              <ActivityIndicator size="small" color={isUserMember ? theme.colors.text : 'white'} />
            ) : (
              <>
                <Ionicons
                  name={isUserMember ? 'checkmark' : 'add'}
                  size={scale(18)}
                  color={isUserMember ? theme.colors.text : 'white'}
                />
                <Text style={[
                  styles.joinButtonText,
                  { color: isUserMember ? theme.colors.text : 'white' }
                ]}>
                  {isUserMember ? 'Miembro' : 'Unirse'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Rules Section */}
        {community.rules && community.rules.length > 0 && (
          <View style={[styles.rulesSection, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity
              style={styles.rulesHeader}
              onPress={() => setShowRules(!showRules)}
              activeOpacity={0.7}
            >
              <View style={styles.rulesHeaderLeft}>
                <Ionicons name="document-text-outline" size={scale(20)} color={theme.colors.accent} />
                <Text style={[styles.rulesTitle, { color: theme.colors.text }]}>
                  Reglas de la comunidad
                </Text>
              </View>
              <Ionicons
                name={showRules ? 'chevron-up' : 'chevron-down'}
                size={scale(20)}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            {showRules && (
              <View style={styles.rulesList}>
                {community.rules.map((rule, index) => (
                  <View key={rule.id} style={styles.ruleItem}>
                    <Text style={[styles.ruleNumber, { color: theme.colors.accent }]}>
                      {index + 1}.
                    </Text>
                    <Text style={[styles.ruleText, { color: theme.colors.text }]}>
                      {rule.text}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Feed Tabs */}
        <View style={[styles.tabsContainer, { borderBottomColor: theme.colors.border }]}>
          <View
            style={[
              styles.tab,
              { borderBottomColor: theme.colors.accent },
            ]}
          >
            <Ionicons
              name="albums-outline"
              size={scale(18)}
              color={theme.colors.accent}
            />
            <Text style={[
              styles.tabText,
              { color: theme.colors.accent },
              styles.tabTextActive,
            ]}>
              Flow
            </Text>
          </View>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => {
              if (videoPosts.length > 0) {
                handleVideoPress(videoPosts[0]);
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="play-outline"
              size={scale(18)}
              color={theme.colors.textSecondary}
            />
            <Text style={[
              styles.tabText,
              { color: theme.colors.textSecondary },
            ]}>
              Hids
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Loading state
  if (communityLoading || (loading && posts.length === 0)) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + SPACING.sm, backgroundColor: theme.colors.card }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Comunidad</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </View>
    );
  }

  // Error state
  if (communityError || !community) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + SPACING.sm, backgroundColor: theme.colors.card }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Comunidad</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={[styles.errorText, { color: theme.colors.text }]}>
            No se pudo cargar la comunidad
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm, backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name={community.icon as any} size={scale(20)} color={theme.colors.accent} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {community.name}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item: Post) => item.id || item.userId}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={posts.length === 0 ? styles.emptyContainer : undefined}
        showsVerticalScrollIndicator={false}
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
        ListFooterComponent={() =>
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
            </View>
          ) : null
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons
              name="document-text-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No hay publicaciones
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Sé el primero en publicar en esta comunidad
            </Text>
            <TouchableOpacity
              style={[styles.createPostButton, { backgroundColor: theme.colors.accent }]}
              onPress={() => navigation.navigate('Create')}
            >
              <Text style={styles.createPostButtonText}>Crear post</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 0.5,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
  },
  headerRight: {
    width: scale(40),
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  headerContent: {
    paddingBottom: SPACING.md,
  },
  communityInfo: {
    alignItems: 'center',
    padding: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  iconContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  communityName: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  communityDescription: {
    fontSize: FONT_SIZE.base,
    textAlign: 'center',
    lineHeight: scale(22),
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  stat: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  statNumber: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
  },
  statLabel: {
    fontSize: FONT_SIZE.sm,
  },
  statDivider: {
    width: 1,
    height: scale(30),
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  joinButtonText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
  rulesSection: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  rulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  rulesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rulesTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
  rulesList: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  ruleItem: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  ruleNumber: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    marginRight: SPACING.sm,
    minWidth: scale(20),
  },
  ruleText: {
    fontSize: FONT_SIZE.sm,
    flex: 1,
    lineHeight: scale(20),
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    marginTop: SPACING.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
  },
  tabTextActive: {
    fontWeight: FONT_WEIGHT.semibold,
  },
  postContainer: {
    paddingHorizontal: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.base,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  createPostButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  createPostButtonText: {
    color: 'white',
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
  loadingMore: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  errorText: {
    fontSize: FONT_SIZE.base,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  retryButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    color: 'white',
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
});

export default CommunityScreen;
