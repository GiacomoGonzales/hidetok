import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import { communityService, Community } from '../services/communityService';
import { searchUsers, searchPosts, Post, UserProfile } from '../services/firestoreService';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import { formatNumber } from '../data/mockData';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../navigation/MainStackNavigator';

type SearchCategory = 'comunidades' | 'usuarios' | 'posts';

const SearchScreen: React.FC = () => {
  const { theme } = useTheme();
  const { isDesktop } = useResponsive();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('comunidades');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [filteredCommunities, setFilteredCommunities] = useState<Community[]>([]);
  const [searchedUsers, setSearchedUsers] = useState<UserProfile[]>([]);
  const [searchedPosts, setSearchedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Manejar el botón de retroceso de Android
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;

      const onBackPress = () => {
        navigation.goBack();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [navigation])
  );

  const handleClose = () => {
    navigation.goBack();
  };

  // Cargar comunidades al inicio
  useEffect(() => {
    const loadCommunities = async () => {
      try {
        setLoading(true);
        const allCommunities = await communityService.getCommunities();
        setCommunities(allCommunities);
        setFilteredCommunities(allCommunities);
      } catch (error) {
        console.error('Error loading communities:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCommunities();
  }, []);

  // Buscar cuando cambia la query
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setSearching(true);
        try {
          // Filtrar comunidades localmente
          const filtered = communities.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.description.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setFilteredCommunities(filtered);

          // Buscar usuarios en Firebase
          const users = await searchUsers(searchQuery, 10);
          setSearchedUsers(users);

          // Buscar posts en Firebase
          const posts = await searchPosts(searchQuery, 10);
          setSearchedPosts(posts);
        } catch (error) {
          console.error('Error searching:', error);
        } finally {
          setSearching(false);
        }
      } else {
        setFilteredCommunities(communities);
        setSearchedUsers([]);
        setSearchedPosts([]);
      }
    }, 300); // Debounce de 300ms

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, communities]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setFilteredCommunities(communities);
    setSearchedUsers([]);
    setSearchedPosts([]);
  };

  const handleCommunityPress = (community: Community) => {
    if (community.id) {
      navigation.navigate('Community', { communityId: community.id });
    }
  };

  const handleUserPress = (userId: string) => {
    navigation.navigate('UserProfile', { userId });
  };

  const handlePostPress = (post: Post) => {
    navigation.navigate('PostDetail', { post });
  };

  const renderContent = () => (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header con botón de cerrar y búsqueda */}
      <View style={[styles.header, {
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.border,
        paddingTop: Platform.OS === 'android' ? insets.top + 8 : 12,
      }]}>
        {/* Fila superior con título y botón cerrar */}
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Buscar</Text>
          <TouchableOpacity
            onPress={handleClose}
            style={[styles.closeButton, { backgroundColor: theme.colors.surface }]}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Campo de búsqueda */}
        <View style={[styles.searchInput, {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.textInput, { color: theme.colors.text }]}
            placeholder="Buscar comunidades, usuarios o posts..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus={false}
          />
          {searching && (
            <ActivityIndicator size="small" color={theme.colors.accent} style={{ marginRight: 8 }} />
          )}
          {searchQuery.length > 0 && !searching && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Categorías */}
        <View style={styles.categories}>
          <TouchableOpacity
            style={[styles.categoryButton, {
              backgroundColor: activeCategory === 'comunidades' ? theme.colors.accent : 'transparent',
              borderColor: theme.colors.border,
            }]}
            onPress={() => setActiveCategory('comunidades')}
          >
            <Ionicons
              name="people"
              size={14}
              color={activeCategory === 'comunidades' ? 'white' : theme.colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.categoryText, {
              color: activeCategory === 'comunidades' ? 'white' : theme.colors.textSecondary,
              fontWeight: activeCategory === 'comunidades' ? '600' : '400',
            }]}>
              Comunidades
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.categoryButton, {
              backgroundColor: activeCategory === 'usuarios' ? theme.colors.accent : 'transparent',
              borderColor: theme.colors.border,
            }]}
            onPress={() => setActiveCategory('usuarios')}
          >
            <Ionicons
              name="person"
              size={14}
              color={activeCategory === 'usuarios' ? 'white' : theme.colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.categoryText, {
              color: activeCategory === 'usuarios' ? 'white' : theme.colors.textSecondary,
              fontWeight: activeCategory === 'usuarios' ? '600' : '400',
            }]}>
              Usuarios
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.categoryButton, {
              backgroundColor: activeCategory === 'posts' ? theme.colors.accent : 'transparent',
              borderColor: theme.colors.border,
            }]}
            onPress={() => setActiveCategory('posts')}
          >
            <Ionicons
              name="document-text"
              size={14}
              color={activeCategory === 'posts' ? 'white' : theme.colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.categoryText, {
              color: activeCategory === 'posts' ? 'white' : theme.colors.textSecondary,
              fontWeight: activeCategory === 'posts' ? '600' : '400',
            }]}>
              Posts
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contenido scrolleable */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        bounces={true}
        nestedScrollEnabled={true}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Cargando...
            </Text>
          </View>
        ) : (
          <View style={styles.categoryContent}>
            {/* Comunidades */}
            {activeCategory === 'comunidades' && (
              <View>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  {searchQuery.trim() ? 'Resultados' : 'Todas las Comunidades'}
                </Text>
                {filteredCommunities.length === 0 ? (
                  <View style={styles.noResults}>
                    <Ionicons name="people-outline" size={48} color={theme.colors.textSecondary} />
                    <Text style={[styles.noResultsText, { color: theme.colors.textSecondary }]}>
                      No se encontraron comunidades
                    </Text>
                  </View>
                ) : (
                  filteredCommunities.map((community) => (
                    <TouchableOpacity
                      key={community.id}
                      style={[styles.communityItem, { backgroundColor: theme.colors.surface }]}
                      onPress={() => handleCommunityPress(community)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.communityIcon, { backgroundColor: theme.colors.accent + '20' }]}>
                        <Ionicons
                          name={community.icon as any}
                          size={24}
                          color={theme.colors.accent}
                        />
                      </View>
                      <View style={styles.communityInfo}>
                        <Text style={[styles.communityName, { color: theme.colors.text }]}>
                          {community.name}
                        </Text>
                        <Text style={[styles.communityDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                          {community.description}
                        </Text>
                        <View style={styles.communityStats}>
                          <Ionicons name="people" size={12} color={theme.colors.textSecondary} />
                          <Text style={[styles.communityStat, { color: theme.colors.textSecondary }]}>
                            {formatNumber(community.memberCount)} miembros
                          </Text>
                          <Ionicons name="document-text" size={12} color={theme.colors.textSecondary} style={{ marginLeft: 12 }} />
                          <Text style={[styles.communityStat, { color: theme.colors.textSecondary }]}>
                            {formatNumber(community.postCount)} posts
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* Usuarios */}
            {activeCategory === 'usuarios' && (
              <View>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  {searchQuery.trim().length >= 2 ? 'Usuarios encontrados' : 'Busca usuarios'}
                </Text>
                {searchQuery.trim().length < 2 ? (
                  <View style={styles.noResults}>
                    <Ionicons name="search-outline" size={48} color={theme.colors.textSecondary} />
                    <Text style={[styles.noResultsText, { color: theme.colors.textSecondary }]}>
                      Escribe al menos 2 caracteres para buscar usuarios
                    </Text>
                  </View>
                ) : searchedUsers.length === 0 ? (
                  <View style={styles.noResults}>
                    <Ionicons name="person-outline" size={48} color={theme.colors.textSecondary} />
                    <Text style={[styles.noResultsText, { color: theme.colors.textSecondary }]}>
                      No se encontraron usuarios para "{searchQuery}"
                    </Text>
                  </View>
                ) : (
                  searchedUsers.map((user) => (
                    <TouchableOpacity
                      key={user.uid}
                      style={[styles.userItem, { borderBottomColor: theme.colors.border }]}
                      onPress={() => handleUserPress(user.uid)}
                      activeOpacity={0.8}
                    >
                      <AvatarDisplay
                        size={48}
                        avatarType={user.avatarType || 'predefined'}
                        avatarId={user.avatarId || 'male'}
                        photoURL={typeof user.photoURL === 'string' ? user.photoURL : undefined}
                        photoURLThumbnail={typeof user.photoURLThumbnail === 'string' ? user.photoURLThumbnail : undefined}
                        backgroundColor={theme.colors.accent}
                        showBorder={false}
                      />
                      <View style={styles.userInfo}>
                        <Text style={[styles.userName, { color: theme.colors.text }]}>
                          {user.displayName || 'Usuario Anónimo'}
                        </Text>
                        {user.bio && (
                          <Text style={[styles.userBio, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                            {user.bio}
                          </Text>
                        )}
                        <View style={styles.userStats}>
                          <Text style={[styles.userStat, { color: theme.colors.textSecondary }]}>
                            {formatNumber(user.posts || 0)} posts
                          </Text>
                          <Text style={[styles.userStat, { color: theme.colors.textSecondary }]}>
                            {formatNumber(user.followers || 0)} seguidores
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* Posts */}
            {activeCategory === 'posts' && (
              <View>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  {searchQuery.trim().length >= 2 ? 'Posts encontrados' : 'Busca posts'}
                </Text>
                {searchQuery.trim().length < 2 ? (
                  <View style={styles.noResults}>
                    <Ionicons name="search-outline" size={48} color={theme.colors.textSecondary} />
                    <Text style={[styles.noResultsText, { color: theme.colors.textSecondary }]}>
                      Escribe al menos 2 caracteres para buscar posts
                    </Text>
                  </View>
                ) : searchedPosts.length === 0 ? (
                  <View style={styles.noResults}>
                    <Ionicons name="document-text-outline" size={48} color={theme.colors.textSecondary} />
                    <Text style={[styles.noResultsText, { color: theme.colors.textSecondary }]}>
                      No se encontraron posts para "{searchQuery}"
                    </Text>
                  </View>
                ) : (
                  searchedPosts.map((post) => (
                    <TouchableOpacity
                      key={post.id}
                      style={[styles.postItem, {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                      }]}
                      onPress={() => handlePostPress(post)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.postContent, { color: theme.colors.text }]} numberOfLines={3}>
                        {post.content}
                      </Text>

                      {post.imageUrls && post.imageUrls.length > 0 && (
                        <Image
                          source={{ uri: post.imageUrlsThumbnails?.[0] || post.imageUrls[0] }}
                          style={[styles.postImage, { backgroundColor: theme.colors.surface }]}
                          resizeMode="cover"
                        />
                      )}

                      <View style={styles.postStats}>
                        <View style={styles.postStat}>
                          <Ionicons name="heart" size={14} color={theme.colors.like} />
                          <Text style={[styles.postStatText, { color: theme.colors.textSecondary }]}>
                            {formatNumber(post.likes || 0)}
                          </Text>
                        </View>
                        <View style={styles.postStat}>
                          <Ionicons name="chatbubble" size={14} color={theme.colors.textSecondary} />
                          <Text style={[styles.postStatText, { color: theme.colors.textSecondary }]}>
                            {formatNumber(post.comments || 0)}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );

  return renderContent();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  categories: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  categoryContent: {
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  // Community styles
  communityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  communityIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  communityInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  communityDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  communityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  communityStat: {
    fontSize: 12,
    marginLeft: 4,
  },
  // User styles
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
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
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default SearchScreen;
