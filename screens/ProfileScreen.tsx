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
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
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
import AvatarPicker from '../components/avatars/AvatarPicker';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import PostCard from '../components/PostCard';
import ImageViewer from '../components/ImageViewer';
import { useResponsive } from '../hooks/useResponsive';

type ProfileScreenNavigationProp = StackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

const ProfileScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const { userProfile, loading: profileLoading, error: profileError, updateProfile } = useUserProfile();
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
  const [uploadingCover, setUploadingCover] = useState(false);
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

  // Cargar posts del usuario
  useEffect(() => {
    const loadUserPosts = async () => {
      if (!user) return;

      try {
        setLoadingPosts(true);
        setPostsError(null);
        console.log('🔍 Cargando posts del usuario:', user.uid);

        // Cargar posts, reposts y liked posts en paralelo
        const [posts, reposts, likedPosts] = await Promise.all([
          postsService.getByUserId(user.uid),
          repostsService.getUserReposts(user.uid),
          likesService.getUserLikedPostsWithData(user.uid)
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
  }, [user, userProfile?.id]); // Recargar cuando cambie el usuario o se cree el perfil

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
    // TODO: Implementar pantalla de notificaciones
    console.log('Notificaciones - Próximamente');
  };

  // Función para recargar posts (útil después de crear un nuevo post)
  const refreshPosts = async () => {
    if (!user) return;

    try {
      setLoadingPosts(true);

      // Cargar posts, reposts y liked posts en paralelo
      const [posts, reposts, likedPosts] = await Promise.all([
        postsService.getByUserId(user.uid),
        repostsService.getUserReposts(user.uid),
        likesService.getUserLikedPostsWithData(user.uid)
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

  // Función para cambiar la foto de portada
  const handleChangeCoverPhoto = async () => {
    if (!user || !userProfile?.id) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto de portada');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingCover(true);
        const { fullSize } = await uploadProfileImageFromUri(result.assets[0].uri, user.uid, 'cover');

        await updateProfile({
          coverPhotoURL: fullSize,
        });

        // No mostrar Alert para evitar interferencias
      }
    } catch (error) {
      console.error('Error updating cover photo:', error);
      Alert.alert('Error', 'No se pudo actualizar la foto de portada');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleComment = (postId: string) => {
    const post = userPosts.find(p => p.id === postId);
    if (post) {
      (navigation as any).navigate('PostDetail', { post });
    }
  };

  const handlePrivateMessage = (userId: string, userData?: { displayName: string; avatarType?: string; avatarId?: string; photoURL?: string; photoURLThumbnail?: string }) => {
    if (!user || user.uid === userId) return; // No enviar mensaje a sí mismo

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
        return userPosts.filter(post => post.imageUrls && post.imageUrls.length > 0);
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

        {/* Cover Photo / Banner */}
        <View style={styles.coverPhotoContainer}>
          {userProfile.coverPhotoURL && typeof userProfile.coverPhotoURL === 'string' ? (
            <Image
              source={{ uri: userProfile.coverPhotoURL }}
              style={styles.coverPhoto}
              contentFit="cover"
              priority="high"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.coverPhotoPlaceholder, { backgroundColor: theme.colors.surface }]}>
              <View style={[styles.coverPhotoPattern, { backgroundColor: theme.colors.accent + '20' }]} />
            </View>
          )}

          {/* Botón para cambiar foto de portada */}
          <TouchableOpacity
            style={[styles.changeCoverButton, { backgroundColor: theme.colors.card }]}
            onPress={handleChangeCoverPhoto}
            disabled={uploadingCover}
            activeOpacity={0.7}
          >
            {uploadingCover ? (
              <ActivityIndicator size="small" color={theme.colors.text} />
            ) : (
              <Ionicons name="camera" size={16} color={theme.colors.text} />
            )}
          </TouchableOpacity>
        </View>

        {/* Información del perfil */}
        <View style={styles.profileInfo}>
          {/* Avatar y botones */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
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
                    size={80}
                  />
                )}
              </TouchableOpacity>
              <Text style={[styles.displayName, { color: theme.colors.text }]}>
                {userProfile.displayName}
              </Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.editButton, {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background
                }]}
                onPress={handleEditProfile}
              >
                <Ionicons name="create-outline" size={16} color={theme.colors.text} />
                <Text style={[styles.editButtonText, { color: theme.colors.text }]}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shareButton, { borderColor: theme.colors.border }]}
                onPress={handleSettingsPress}
              >
                <Ionicons name="settings-outline" size={16} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bio */}
          <View style={styles.bioSection}>
            <Text style={[styles.bio, { color: theme.colors.text }]}>
              {userProfile.bio || 'Sin biografía'}
            </Text>
            {user?.isAnonymous && (
              <Text style={[styles.anonymousBadge, { color: theme.colors.textSecondary }]}>
                👤 Usuario Anónimo
              </Text>
            )}
          </View>

          {/* Información adicional */}
          <View style={styles.infoSection}>
            {userProfile.website && (
              <View style={styles.infoRow}>
                <Ionicons name="link-outline" size={14} color={theme.colors.textSecondary} />
                <Text
                  style={[styles.infoText, { color: theme.colors.accent }]}
                  numberOfLines={1}
                >
                  {userProfile.website}
                </Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                Miembro desde {userProfile.createdAt.toDate().toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Estadísticas */}
          <View style={styles.statsSection}>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {formatNumber(userProfile.posts)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Publicaciones
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {formatNumber(userProfile.followers)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Seguidores
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {formatNumber(userProfile.following)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Siguiendo
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs de filtros */}
        <View style={[styles.tabsContainer, { borderBottomColor: theme.colors.border }]}>
          {renderTabButton('posts', 'document-text-outline', 'Posts')}
          {renderTabButton('reposts', 'repeat-outline', 'Repost')}
          {renderTabButton('photos', 'image-outline', 'Fotos')}
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
                  activeTab === 'photos' ? 'No tienes publicaciones con fotos' :
                  activeTab === 'polls' ? 'No tienes publicaciones con encuestas' :
                  'No tienes publicaciones que te gusten'
                }
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
                {
                  activeTab === 'posts' ? '¡Comparte tu primer post anónimo!' :
                  activeTab === 'reposts' ? 'Comparte contenido de otros usuarios' :
                  activeTab === 'photos' ? 'Crea un post con fotos' :
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
  coverPhotoContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
  },
  coverPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  coverPhotoPattern: {
    position: 'absolute',
    width: '200%',
    height: '200%',
    top: -50,
    left: -50,
    transform: [{ rotate: '45deg' }],
    opacity: 0.3,
  },
  changeCoverButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  profileInfo: {
    padding: 16,
    marginTop: -40,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarWrapper: {
    alignItems: 'center',
    marginRight: 16,
  },
  avatarContainer: {
    marginBottom: 8,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
  },
  avatarLoadingContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  actionButtons: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 4,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  shareButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioSection: {
    marginBottom: 16,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  anonymousBadge: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  infoSection: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
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
