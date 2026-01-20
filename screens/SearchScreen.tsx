import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import ResponsiveLayout from '../components/ResponsiveLayout';
import {
  mockPosts,
  mockUsers,
  trendingHashtags,
  Post,
  User,
  formatNumber
} from '../data/mockData';

type SearchCategory = 'trending' | 'users' | 'recent';

const SearchScreen: React.FC = () => {
  const { theme } = useTheme();
  const { isDesktop } = useResponsive();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('trending');
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  // Simular búsqueda en tiempo real
  useEffect(() => {
    if (searchQuery.trim()) {
      const postResults = mockPosts.filter(post =>
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.hashtags.some(tag =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
      setSearchResults(postResults);

      const userResults = mockUsers.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.bio.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(userResults);
    } else {
      setSearchResults([]);
      setFilteredUsers([]);
    }
  }, [searchQuery]);

  const handleHashtagPress = (hashtag: string) => {
    setSearchQuery(hashtag);
    setActiveCategory('recent');
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveCategory('trending');
  };

  const renderContent = () => (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Handle del modal - indicador visual para deslizar hacia abajo */}
      <View style={styles.modalHandleContainer}>
        <View style={[styles.modalHandle, { backgroundColor: theme.colors.border }]} />
      </View>

      {/* Header con búsqueda */}
      <View style={[styles.header, {
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.border,
      }]}>
        <View style={[styles.searchInput, {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.textInput, { color: theme.colors.text }]}
            placeholder="Buscar en HideTok..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Categorías */}
        {!searchQuery.trim() && (
          <View style={styles.categories}>
            <TouchableOpacity
              style={[styles.categoryButton, {
                backgroundColor: activeCategory === 'trending' ? theme.colors.accent : 'transparent',
                borderColor: theme.colors.border,
              }]}
              onPress={() => setActiveCategory('trending')}
            >
              <Text style={[styles.categoryText, {
                color: activeCategory === 'trending' ? 'white' : theme.colors.textSecondary,
                fontWeight: activeCategory === 'trending' ? '600' : '400',
              }]}>
                Tendencias
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.categoryButton, {
                backgroundColor: activeCategory === 'users' ? theme.colors.accent : 'transparent',
                borderColor: theme.colors.border,
              }]}
              onPress={() => setActiveCategory('users')}
            >
              <Text style={[styles.categoryText, {
                color: activeCategory === 'users' ? 'white' : theme.colors.textSecondary,
                fontWeight: activeCategory === 'users' ? '600' : '400',
              }]}>
                Usuarios
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.categoryButton, {
                backgroundColor: activeCategory === 'recent' ? theme.colors.accent : 'transparent',
                borderColor: theme.colors.border,
              }]}
              onPress={() => setActiveCategory('recent')}
            >
              <Text style={[styles.categoryText, {
                color: activeCategory === 'recent' ? 'white' : theme.colors.textSecondary,
                fontWeight: activeCategory === 'recent' ? '600' : '400',
              }]}>
                Recientes
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Contenido scrolleable */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Resultados de búsqueda */}
        {searchQuery.trim() ? (
          <View style={styles.searchResults}>
            {/* Usuarios encontrados */}
            {filteredUsers.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Usuarios
                </Text>
                {filteredUsers.slice(0, 3).map(user => (
                  <TouchableOpacity
                    key={user.id}
                    style={[styles.userItem, { borderBottomColor: theme.colors.border }]}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: user.avatar }}
                      style={[styles.userAvatar, { backgroundColor: theme.colors.surface }]}
                    />
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, { color: theme.colors.text }]}>
                        {user.username}
                      </Text>
                      <Text style={[styles.userBio, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {user.bio}
                      </Text>
                      <View style={styles.userStats}>
                        <Text style={[styles.userStat, { color: theme.colors.textSecondary }]}>
                          {formatNumber(user.postsCount)} posts
                        </Text>
                        <Text style={[styles.userStat, { color: theme.colors.textSecondary }]}>
                          {formatNumber(user.likesCount)} likes
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Posts encontrados */}
            {searchResults.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Publicaciones
                </Text>
                {searchResults.map(post => (
                  <TouchableOpacity
                    key={post.id}
                    style={[styles.postItem, {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                    }]}
                    activeOpacity={0.8}
                  >
                    <View style={styles.postHeader}>
                      <Image
                        source={{ uri: post.avatar }}
                        style={[styles.postAvatar, { backgroundColor: theme.colors.surface }]}
                      />
                      <View style={styles.postInfo}>
                        <Text style={[styles.postUsername, { color: theme.colors.text }]}>
                          {post.username}
                        </Text>
                        <Text style={[styles.postTime, { color: theme.colors.textSecondary }]}>
                          hace 2h
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.postContent, { color: theme.colors.text }]} numberOfLines={3}>
                      {post.content}
                    </Text>

                    {post.media && post.media.length > 0 && (
                      <Image
                        source={{ uri: post.media[0].uri }}
                        style={[styles.postImage, { backgroundColor: theme.colors.surface }]}
                        resizeMode="cover"
                      />
                    )}

                    <View style={styles.postStats}>
                      <View style={styles.postStat}>
                        <Ionicons name="heart" size={14} color={theme.colors.like} />
                        <Text style={[styles.postStatText, { color: theme.colors.textSecondary }]}>
                          {formatNumber(post.likesCount)}
                        </Text>
                      </View>
                      <View style={styles.postStat}>
                        <Ionicons name="chatbubble" size={14} color={theme.colors.textSecondary} />
                        <Text style={[styles.postStatText, { color: theme.colors.textSecondary }]}>
                          {formatNumber(post.commentsCount)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Sin resultados */}
            {filteredUsers.length === 0 && searchResults.length === 0 && (
              <View style={styles.noResults}>
                <Ionicons name="search" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.noResultsText, { color: theme.colors.textSecondary }]}>
                  No se encontraron resultados para "{searchQuery}"
                </Text>
                <Text style={[styles.noResultsSubtext, { color: theme.colors.textSecondary }]}>
                  Intenta con otras palabras clave
                </Text>
              </View>
            )}
          </View>
        ) : (
          /* Contenido por categorías */
          <View style={styles.categoryContent}>
            {/* Tendencias */}
            {activeCategory === 'trending' && (
              <View>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Tendencias en HideTok
                </Text>
                {trendingHashtags.map((hashtag, index) => (
                  <TouchableOpacity
                    key={hashtag}
                    style={[styles.hashtagItem, { backgroundColor: theme.colors.surface }]}
                    onPress={() => handleHashtagPress(hashtag)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.hashtagContent}>
                      <Text style={[styles.hashtagText, { color: theme.colors.accent }]}>
                        {hashtag}
                      </Text>
                      <Text style={[styles.hashtagStats, { color: theme.colors.textSecondary }]}>
                        {formatNumber(Math.floor(Math.random() * 10000) + 1000)} publicaciones
                      </Text>
                    </View>
                    <View style={[styles.hashtagRank, { backgroundColor: theme.colors.accent }]}>
                      <Text style={styles.hashtagRankText}>#{index + 1}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Usuarios */}
            {activeCategory === 'users' && (
              <View>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Usuarios sugeridos
                </Text>
                {mockUsers.map(user => (
                  <TouchableOpacity
                    key={user.id}
                    style={[styles.userItem, { borderBottomColor: theme.colors.border }]}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: user.avatar }}
                      style={[styles.userAvatar, { backgroundColor: theme.colors.surface }]}
                    />
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, { color: theme.colors.text }]}>
                        {user.username}
                      </Text>
                      <Text style={[styles.userBio, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {user.bio}
                      </Text>
                      <View style={styles.userStats}>
                        <Text style={[styles.userStat, { color: theme.colors.textSecondary }]}>
                          {formatNumber(user.postsCount)} posts
                        </Text>
                        <Text style={[styles.userStat, { color: theme.colors.textSecondary }]}>
                          {formatNumber(user.likesCount)} likes
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Recientes */}
            {activeCategory === 'recent' && (
              <View>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Publicaciones recientes
                </Text>
                {mockPosts.slice(0, 10).map(post => (
                  <TouchableOpacity
                    key={post.id}
                    style={[styles.postItem, {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                    }]}
                    activeOpacity={0.8}
                  >
                    <View style={styles.postHeader}>
                      <Image
                        source={{ uri: post.avatar }}
                        style={[styles.postAvatar, { backgroundColor: theme.colors.surface }]}
                      />
                      <View style={styles.postInfo}>
                        <Text style={[styles.postUsername, { color: theme.colors.text }]}>
                          {post.username}
                        </Text>
                        <Text style={[styles.postTime, { color: theme.colors.textSecondary }]}>
                          hace 2h
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.postContent, { color: theme.colors.text }]} numberOfLines={3}>
                      {post.content}
                    </Text>

                    {post.media && post.media.length > 0 && (
                      <Image
                        source={{ uri: post.media[0].uri }}
                        style={[styles.postImage, { backgroundColor: theme.colors.surface }]}
                        resizeMode="cover"
                      />
                    )}

                    <View style={styles.postStats}>
                      <View style={styles.postStat}>
                        <Ionicons name="heart" size={14} color={theme.colors.like} />
                        <Text style={[styles.postStatText, { color: theme.colors.textSecondary }]}>
                          {formatNumber(post.likesCount)}
                        </Text>
                      </View>
                      <View style={styles.postStat}>
                        <Ionicons name="chatbubble" size={14} color={theme.colors.textSecondary} />
                        <Text style={[styles.postStatText, { color: theme.colors.textSecondary }]}>
                          {formatNumber(post.commentsCount)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );

  // No usar ResponsiveLayout - el layout ahora está en MainStackNavigator
  return renderContent();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalHandleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    paddingBottom: 12,
  },
  modalHandle: {
    width: 50,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.4,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    outlineStyle: 'none',
  },
  categories: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  searchResults: {
    paddingVertical: 16,
  },
  categoryContent: {
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  // Hashtag styles
  hashtagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  hashtagContent: {
    flex: 1,
  },
  hashtagText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  hashtagStats: {
    fontSize: 14,
  },
  hashtagRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hashtagRankText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // User styles
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userBio: {
    fontSize: 14,
    marginBottom: 4,
  },
  userStats: {
    flexDirection: 'row',
    gap: 12,
  },
  userStat: {
    fontSize: 12,
  },
  // Post styles
  postItem: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  postAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  postInfo: {
    flex: 1,
  },
  postUsername: {
    fontSize: 14,
    fontWeight: '600',
  },
  postTime: {
    fontSize: 12,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  postImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  postStats: {
    flexDirection: 'row',
    gap: 16,
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postStatText: {
    fontSize: 12,
  },
  // No results
  noResults: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default SearchScreen;
