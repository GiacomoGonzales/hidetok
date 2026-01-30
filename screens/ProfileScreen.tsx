import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Keyboard,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { uploadProfileImageFromUri } from '../services/storageService';
import { postsService, Post, repostsService } from '../services/firestoreService';
import { likesService } from '../services/likesService';
import { formatNumber } from '../data/mockData';
import { ProfileStackParamList } from '../navigation/ProfileStackNavigator';
import Header from '../components/Header';
import AvatarPicker, { isDiceBearUrl } from '../components/avatars/AvatarPicker';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import PostCard from '../components/PostCard';
import ImageViewer from '../components/ImageViewer';
import { useResponsive } from '../hooks/useResponsive';

type ProfileScreenNavigationProp = StackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

const ProfileScreen: React.FC = () => {
  const { theme, setThemeMode } = useTheme();
  const { user, logout } = useAuth();
  const { userProfile, loading: profileLoading, error: profileError, updateProfile, hasHidiProfile, activeProfileType, switchIdentity } = useUserProfile();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
  const [showEditModal, setShowEditModal] = useState(false);
  const [tempDisplayName, setTempDisplayName] = useState('');
  const [tempBio, setTempBio] = useState('');
  const [tempWebsite, setTempWebsite] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userReposts, setUserReposts] = useState<Post[]>([]);
  const [userLikedPosts, setUserLikedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'reposts' | 'photos' | 'polls' | 'likes'>('posts');
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const currentScrollPosition = useRef(0);

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

  // Actualizar campos temporales cuando cambie el perfil
  useEffect(() => {
    if (userProfile) {
      setTempDisplayName(userProfile.displayName);
      setTempBio(userProfile.bio || '');
      setTempWebsite(userProfile.website || '');
    }
  }, [userProfile]);

  // Cargar posts del usuario (usando uid del perfil activo)
  useEffect(() => {
    const loadUserPosts = async () => {
      if (!user || !userProfile) return;

      const activeUid = userProfile.uid;

      try {
        setLoadingPosts(true);
        setPostsError(null);
        console.log('🔍 Cargando posts del usuario:', activeUid);

        // Cargar posts, reposts y liked posts en paralelo
        const [posts, reposts, likedPosts] = await Promise.all([
          postsService.getByUserId(activeUid),
          repostsService.getUserReposts(activeUid),
          likesService.getUserLikedPostsWithData(activeUid)
        ]);

        console.log('📋 Posts encontrados:', posts.length);
        console.log('🔄 Reposts encontrados:', reposts.length);
        console.log('❤️ Liked posts encontrados:', likedPosts.length);

        setUserPosts(posts);
        setUserReposts(reposts);
        setUserLikedPosts(likedPosts);

        // Actualizar contador de posts en el perfil si es diferente
        if (userProfile && userProfile.posts !== posts.length) {
          await updateProfile({ posts: posts.length });
        }
      } catch (error) {
        console.error('Error loading user posts:', error);
        setPostsError('Error al cargar las publicaciones');
      } finally {
        setLoadingPosts(false);
      }
    };

    loadUserPosts();
  }, [user, userProfile?.id, userProfile?.uid]); // Recargar cuando cambie el usuario, perfil o identidad activa

  // Scroll to top cuando se toca el tab de Profile estando ya en Profile
  // Si ya está arriba, refrescar la página
  useEffect(() => {
    const parentNavigation = navigation.getParent();
    if (!parentNavigation) return;

    const unsubscribe = parentNavigation.addListener('tabPress', (e: any) => {
      // Solo hacer scroll si el tab presionado es Profile
      if (e.target?.includes('Profile')) {
        // Si ya estamos arriba (menos de 50px), refrescar
        if (currentScrollPosition.current < 50) {
          refreshPosts();
        } else {
          // Si no, hacer scroll arriba
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: 0, animated: true });
          }
        }
      }
    });

    return unsubscribe;
  }, [navigation]);

  // Función de navegación para el header
  const handleNotificationsPress = () => {
    // Navegar desde ProfileStack → TabNavigator → Home → Notifications
    const tabNavigation = navigation.getParent();
    if (tabNavigation) {
      (tabNavigation as any).navigate('Home', {
        screen: 'Notifications',
      });
    }
  };

  // Función para recargar posts (útil después de crear un nuevo post)
  const refreshPosts = async () => {
    if (!user || !userProfile) return;

    const activeUid = userProfile.uid;

    try {
      setLoadingPosts(true);

      // Cargar posts, reposts y liked posts en paralelo
      const [posts, reposts, likedPosts] = await Promise.all([
        postsService.getByUserId(activeUid),
        repostsService.getUserReposts(activeUid),
        likesService.getUserLikedPostsWithData(activeUid)
      ]);

      setUserPosts(posts);
      setUserReposts(reposts);
      setUserLikedPosts(likedPosts);

      // Actualizar contador en el perfil
      if (userProfile && userProfile.posts !== posts.length) {
        await updateProfile({ posts: posts.length });
      }
    } catch (error) {
      console.error('Error refreshing posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  if (profileLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Cargando perfil...
        </Text>
      </View>
    );
  }

  if (profileError || !userProfile) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textSecondary} />
        <Text style={[styles.errorText, { color: theme.colors.text }]}>
          Error al cargar el perfil
        </Text>
        <Text style={[styles.errorSubtext, { color: theme.colors.textSecondary }]}>
          {profileError || 'No se pudo cargar la información del usuario'}
        </Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}
          onPress={handleLogout}
        >
          <Text style={styles.retryButtonText}>Volver al Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleEditProfile = () => {
    setTempDisplayName(userProfile.displayName);
    setTempBio(userProfile.bio || '');
    setTempWebsite(userProfile.website || '');
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!tempDisplayName.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }

    setUpdating(true);
    try {
      await updateProfile({
        displayName: tempDisplayName.trim(),
        bio: tempBio.trim(),
        website: tempWebsite.trim(),
      });
      setShowEditModal(false);
      // No mostrar Alert para evitar interferencias con la navegación
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    } finally {
      setUpdating(false);
    }
  };

  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'No se pudo cerrar sesión');
    }
  };

  // Función para manejar selección de avatar
  const handleAvatarSelect = async (avatarData: {
    type: 'predefined' | 'custom';
    uri?: string;
    avatarId?: string;
  }) => {
    console.log('🎭 handleAvatarSelect llamado con:', {
      type: avatarData.type,
      uri: avatarData.uri?.substring(0, 50),
      avatarId: avatarData.avatarId,
    });

    if (!user || !userProfile?.id) {
      console.error('❌ No hay usuario o perfil:', { user: !!user, profileId: userProfile?.id });
      Alert.alert('Error', 'No hay sesión activa');
      return;
    }

    setUploadingAvatar(true);
    try {
      let updateData: any = {
        avatarType: avatarData.type,
      };

      if (avatarData.type === 'predefined') {
        console.log('📝 Seleccionado avatar predefinido:', avatarData.avatarId);
        updateData.avatarId = avatarData.avatarId;
        // Limpiar photoURL si cambiamos a predefinido
        updateData.photoURL = null;
        updateData.photoURLThumbnail = null;
      } else if (avatarData.type === 'custom' && avatarData.uri) {
        if (isDiceBearUrl(avatarData.uri)) {
          // DiceBear URL - guardar directo sin subir
          updateData.photoURL = avatarData.uri;
          updateData.photoURLThumbnail = null;
          updateData.avatarId = null;
        } else {
          console.log('📤 Subiendo imagen personalizada...');
          console.log('📍 URI:', avatarData.uri);

          // Subir la imagen a Firebase Storage (ahora retorna fullSize y thumbnail)
          const { fullSize, thumbnail } = await uploadProfileImageFromUri(avatarData.uri, user.uid);

          console.log('✅ Imagen subida exitosamente');
          console.log('📎 Full size URL:', fullSize?.substring(0, 50));
          console.log('📎 Thumbnail URL:', thumbnail?.substring(0, 50));

          if (!fullSize) {
            throw new Error('No se recibió URL de imagen');
          }

          updateData.photoURL = fullSize;
          updateData.photoURLThumbnail = thumbnail;
          updateData.avatarId = null;
        }
      }

      console.log('💾 Guardando en perfil:', Object.keys(updateData));
      await updateProfile(updateData);
      console.log('✅ Avatar actualizado exitosamente');
      // No mostrar Alert para evitar interferencias
    } catch (error: any) {
      console.error('❌ Error updating avatar:', error);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      Alert.alert('Error', `No se pudo actualizar el avatar: ${error?.message || 'Error desconocido'}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleComment = (postId: string) => {
    const post = userPosts.find(p => p.id === postId);
    if (post) {
      (navigation as any).navigate('PostDetail', { post });
    }
  };

  const handlePrivateMessage = (userId: string, userData?: { displayName: string; avatarType?: string; avatarId?: string; photoURL?: string; photoURLThumbnail?: string }) => {
    const activeUid = userProfile?.uid || user?.uid;
    if (!user || activeUid === userId) return; // No enviar mensaje a sí mismo

    // Navegar a la pantalla de conversación
    (navigation as any).navigate('Inbox', {
      screen: 'Conversation',
      params: {
        otherUserId: userId,
        otherUserData: userData,
      },
    });
  };

  const handlePostPress = (post: Post) => {
    // Navegar al detalle del post
    (navigation as any).navigate('PostDetail', { post });
  };

  // Abrir visor de foto de perfil
  const handleAvatarLongPress = () => {
    // Solo abrir si hay una foto personalizada
    if (userProfile?.avatarType === 'custom' && userProfile?.photoURL) {
      setShowAvatarViewer(true);
    }
  };

  // Función para filtrar posts según la pestaña activa
  const getFilteredPosts = () => {
    switch (activeTab) {
      case 'posts':
        return userPosts;
      case 'reposts':
        return userReposts;
      case 'photos':
        return userPosts.filter(post => (post.imageUrls && post.imageUrls.length > 0) || post.videoUrl);
      case 'polls':
        return userPosts.filter(post => post.poll);
      case 'likes':
        return userLikedPosts;
      default:
        return userPosts;
    }
  };

  const renderTabButton = (
    tab: 'posts' | 'reposts' | 'photos' | 'polls' | 'likes',
    icon: string,
    label: string
  ) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === tab && { borderBottomColor: theme.colors.accent, borderBottomWidth: 2 }
      ]}
      onPress={() => setActiveTab(tab)}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={activeTab === tab ? theme.colors.accent : theme.colors.textSecondary}
      />
      <Text
        style={[
          styles.tabLabel,
          {
            color: activeTab === tab ? theme.colors.accent : theme.colors.textSecondary,
            fontWeight: activeTab === tab ? '600' : '400',
          }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postContainer}>
      <PostCard
        post={item}
        onComment={handleComment}
        onPrivateMessage={handlePrivateMessage}
        onPress={handlePostPress}
      />
    </View>
  );

  const renderEditModal = () => (
    <Modal
      visible={showEditModal}
      animationType="slide"
      onRequestClose={() => setShowEditModal(false)}
      presentationStyle="fullScreen"
    >
      <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.modalHeader, {
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
          paddingTop: insets.top + 8,
        }]}>
          <TouchableOpacity
            onPress={() => setShowEditModal(false)}
            style={styles.modalHeaderButton}
          >
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            Editar Perfil
          </Text>
          <TouchableOpacity
            onPress={handleSaveProfile}
            disabled={updating}
            style={styles.modalHeaderButton}
          >
            {updating ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <Text style={[styles.modalSave, { color: theme.colors.accent }]}>
                Guardar
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.modalBody}
          contentContainerStyle={styles.modalBodyContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Nombre de usuario
            </Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }]}
              value={tempDisplayName}
              onChangeText={setTempDisplayName}
              placeholder="Tu nombre de usuario"
              placeholderTextColor={theme.colors.textSecondary}
              maxLength={30}
            />
            <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>
              {tempDisplayName.length}/30 caracteres
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Biografía
            </Text>
            <TextInput
              style={[styles.input, styles.bioInput, {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }]}
              value={tempBio}
              onChangeText={setTempBio}
              placeholder="Cuéntanos sobre ti..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              maxLength={100}
            />
            <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>
              {tempBio.length}/100 caracteres
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Sitio web
            </Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }]}
              value={tempWebsite}
              onChangeText={setTempWebsite}
              placeholder="https://tusitio.com"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={100}
            />
            <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>
              {tempWebsite.length}/100 caracteres
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          currentScrollPosition.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
          {/* Header principal - solo en móvil */}
          {!isDesktop && (
            <Header
              onNotificationsPress={handleNotificationsPress}
            />
          )}

        {/* Información del perfil */}
        <View style={styles.profileInfo}>
          {/* Avatar centrado */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onLongPress={handleAvatarLongPress}
              delayLongPress={300}
              activeOpacity={0.9}
            >
              {uploadingAvatar ? (
                <View style={[styles.avatarLoadingContainer, { backgroundColor: theme.colors.surface }]}>
                  <ActivityIndicator size="large" color={theme.colors.accent} />
                </View>
              ) : (
                <AvatarPicker
                  currentAvatar={typeof userProfile.photoURL === 'string' ? userProfile.photoURL : undefined}
                  currentAvatarType={userProfile.avatarType}
                  currentAvatarId={userProfile.avatarId}
                  onAvatarSelect={handleAvatarSelect}
                  size={100}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Nombre */}
          <Text style={[styles.displayName, { color: theme.colors.text }]}>
            {userProfile.displayName}
          </Text>

          {/* Badge de tipo de perfil - toca para cambiar */}
          {hasHidiProfile && (
            <TouchableOpacity
              style={[styles.profileTypeBadge, {
                backgroundColor: activeProfileType === 'hidi' ? theme.colors.accent + '20' : theme.colors.surface,
                borderColor: activeProfileType === 'hidi' ? theme.colors.accent : theme.colors.border,
              }]}
              onPress={() => {
                switchIdentity();
                const nextType = activeProfileType === 'real' ? 'hidi' : 'real';
                setThemeMode(nextType === 'hidi' ? 'dark' : 'light');
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={activeProfileType === 'hidi' ? 'eye-off' : 'eye'}
                size={14}
                color={activeProfileType === 'hidi' ? theme.colors.accent : theme.colors.textSecondary}
              />
              <Text style={[styles.profileTypeBadgeText, {
                color: activeProfileType === 'hidi' ? theme.colors.accent : theme.colors.textSecondary,
              }]}>
                Perfil {activeProfileType === 'hidi' ? 'HIDI' : 'Real'}
              </Text>
              <Ionicons
                name="swap-horizontal"
                size={12}
                color={activeProfileType === 'hidi' ? theme.colors.accent : theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {/* Badge anónimo */}
          {user?.isAnonymous && (
            <Text style={[styles.anonymousBadge, { color: theme.colors.textSecondary }]}>
              👤 Usuario Anónimo
            </Text>
          )}

          {/* Bio */}
          {userProfile.bio ? (
            <Text style={[styles.bio, { color: theme.colors.text }]}>
              {userProfile.bio}
            </Text>
          ) : null}

          {/* Info adicional inline */}
          <View style={styles.infoSection}>
            {userProfile.website && (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => {
                  let url = userProfile.website!.trim();
                  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
                  Linking.openURL(url).catch(() =>
                    Alert.alert('Error', 'No se pudo abrir el enlace')
                  );
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="link-outline" size={14} color={theme.colors.accent} />
                <Text style={[styles.infoText, { color: theme.colors.accent }]} numberOfLines={1}>
                  {userProfile.website}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                {userProfile.createdAt.toDate().toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>

          {/* Estadísticas */}
          <View style={styles.statsSection}>
            <TouchableOpacity style={styles.stat} activeOpacity={0.7}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {formatNumber(userProfile.posts)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stat} activeOpacity={0.7}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {formatNumber(userProfile.followers)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Seguidores</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stat} activeOpacity={0.7}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {formatNumber(userProfile.following)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Siguiendo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stat}
              activeOpacity={0.7}
              onPress={() => (navigation as any).navigate('CommunitiesManagement')}
            >
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {formatNumber(userProfile.joinedCommunities?.length || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Comunidades</Text>
            </TouchableOpacity>
          </View>

          {/* Botones de acción */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: theme.colors.accent }]}
              onPress={handleEditProfile}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={18} color="white" />
              <Text style={styles.editButtonText}>Editar perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingsButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={handleSettingsPress}
              activeOpacity={0.8}
            >
              <Ionicons name="settings-outline" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Botón Crear perfil HIDI - solo si no existe */}
          {!hasHidiProfile && activeProfileType === 'real' && (
            <View style={styles.hidiButtonContainer}>
              <TouchableOpacity
                style={[styles.hidiButton, { borderColor: theme.colors.accent }]}
                onPress={() => (navigation as any).navigate('HidiCreation')}
                activeOpacity={0.8}
              >
                <Ionicons name="eye-off-outline" size={18} color={theme.colors.accent} />
                <Text style={[styles.hidiButtonText, { color: theme.colors.accent }]}>
                  Crear perfil HIDI
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tabs de filtros */}
        <View style={[styles.tabsContainer, { borderBottomColor: theme.colors.border }]}>
          {renderTabButton('posts', 'document-text-outline', 'Posts')}
          {renderTabButton('reposts', 'repeat-outline', 'Repost')}
          {renderTabButton('photos', 'image-outline', 'Multimedia')}
          {renderTabButton('polls', 'stats-chart-outline', 'Encuestas')}
          {renderTabButton('likes', 'heart-outline', 'Me gusta')}
        </View>

        {/* Posts filtrados */}
        <View style={styles.postsSection}>
          {loadingPosts ? (
            <View style={styles.loadingPosts}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={[styles.loadingPostsText, { color: theme.colors.textSecondary }]}>
                Cargando publicaciones...
              </Text>
            </View>
          ) : postsError ? (
            <View style={styles.errorPosts}>
              <Ionicons name="alert-circle-outline" size={32} color={theme.colors.textSecondary} />
              <Text style={[styles.errorPostsText, { color: theme.colors.text }]}>
                {postsError}
              </Text>
              <TouchableOpacity 
                style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}
                onPress={() => {
                  // Recargar posts
                  const loadUserPosts = async () => {
                    if (!user) return;
                    
                    try {
                      setLoadingPosts(true);
                      setPostsError(null);
                      const posts = await postsService.getByUserId(user.uid);
                      setUserPosts(posts);
                    } catch (error) {
                      console.error('Error loading user posts:', error);
                      setPostsError('Error al cargar las publicaciones');
                    } finally {
                      setLoadingPosts(false);
                    }
                  };
                  loadUserPosts();
                }}
              >
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : getFilteredPosts().length > 0 ? (
            <FlatList
              data={getFilteredPosts()}
              renderItem={renderPost}
              keyExtractor={item => item.id || `post-${item.userId}-${Date.now()}`}
              contentContainerStyle={styles.postsContainer}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name={
                  activeTab === 'posts' ? 'document-text-outline' :
                  activeTab === 'reposts' ? 'repeat-outline' :
                  activeTab === 'photos' ? 'image-outline' :
                  activeTab === 'polls' ? 'stats-chart-outline' :
                  'heart-outline'
                }
                size={48}
                color={theme.colors.textSecondary}
              />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {
                  activeTab === 'posts' ? 'Aún no tienes publicaciones' :
                  activeTab === 'reposts' ? 'No has reposteado nada' :
                  activeTab === 'photos' ? 'No tienes publicaciones con multimedia' :
                  activeTab === 'polls' ? 'No tienes publicaciones con encuestas' :
                  'No tienes publicaciones que te gusten'
                }
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
                {
                  activeTab === 'posts' ? '¡Comparte tu primer post anónimo!' :
                  activeTab === 'reposts' ? 'Comparte contenido de otros usuarios' :
                  activeTab === 'photos' ? 'Crea un post con fotos o videos' :
                  activeTab === 'polls' ? 'Crea una encuesta' :
                  'Dale me gusta a las publicaciones que te interesen'
                }
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de edición */}
      {renderEditModal()}

      {/* Visor de foto de perfil */}
      {userProfile?.photoURL && (
        <ImageViewer
          visible={showAvatarViewer}
          imageUrls={[userProfile.photoURL]}
          onClose={() => setShowAvatarViewer(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  profileInfo: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  avatarSection: {
    marginBottom: 16,
  },
  avatarContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarLoadingContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  profileTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  profileTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  anonymousBadge: {
    fontSize: 13,
    marginBottom: 8,
  },
  bio: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 13,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 20,
    paddingVertical: 16,
    width: '100%',
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    paddingHorizontal: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hidiButtonContainer: {
    width: '100%',
    paddingHorizontal: 8,
    marginTop: 12,
  },
  hidiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  hidiButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    marginTop: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  postsSection: {
    marginTop: 0,
  },
  postsContainer: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  postContainer: {
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingPosts: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingPostsText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorPosts: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 32,
  },
  errorPostsText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  modalHeaderButton: {
    width: 60,
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 16,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
});

export default ProfileScreen;
