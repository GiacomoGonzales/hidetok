import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  Alert,
  Share,
  Modal,
  TextInput,
  Keyboard,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { uploadProfileImageFromUri } from '../services/storageService';
import { postsService, Post } from '../services/firestoreService';
import { formatNumber } from '../data/mockData';
import { ProfileStackParamList } from '../navigation/ProfileStackNavigator';
import Header from '../components/Header';
import ResponsiveLayout from '../components/ResponsiveLayout';
import AvatarPicker from '../components/avatars/AvatarPicker';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import { useResponsive } from '../hooks/useResponsive';

type ProfileScreenNavigationProp = StackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

const { width: screenWidth } = Dimensions.get('window');
const gridItemSize = (screenWidth - 48) / 3; // 3 columnas con espaciado

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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);

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
        
        const posts = await postsService.getByUserId(user.uid);
        console.log('📋 Posts encontrados:', posts.length);
        
        setUserPosts(posts);
        
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

  // Función de navegación para el header
  const handleNotificationsPress = () => {
    (navigation as any).navigate('Notifications');
  };

  // Función para recargar posts (útil después de crear un nuevo post)
  const refreshPosts = async () => {
    if (!user) return;
    
    try {
      setLoadingPosts(true);
      const posts = await postsService.getByUserId(user.uid);
      setUserPosts(posts);
      
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

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `¡Sígueme en HideTok! @${userProfile.displayName}\n\n${userProfile.bio || 'Usuario de HideTok'}`,
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
    }
  };

  const handleEditProfile = () => {
    setTempDisplayName(userProfile.displayName);
    setTempBio(userProfile.bio || '');
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
      });
      setShowEditModal(false);
      Alert.alert('Perfil actualizado', 'Los cambios se han guardado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    } finally {
      setUpdating(false);
    }
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cerrar sesión', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'No se pudo cerrar la sesión');
            }
          }
        },
      ]
    );
  };

  // Función para manejar selección de avatar
  const handleAvatarSelect = async (avatarData: {
    type: 'predefined' | 'custom';
    uri?: string;
    avatarId?: string;
  }) => {
    if (!user || !userProfile?.id) return;

    setUploadingAvatar(true);
    try {
      let updateData: any = {
        avatarType: avatarData.type,
      };

      if (avatarData.type === 'predefined') {
        updateData.avatarId = avatarData.avatarId;
        // Limpiar photoURL si cambiamos a predefinido
        updateData.photoURL = null;
      } else if (avatarData.type === 'custom' && avatarData.uri) {
        // Subir la imagen a Firebase Storage
        const downloadURL = await uploadProfileImageFromUri(avatarData.uri, user.uid);
        updateData.photoURL = downloadURL;
        updateData.avatarId = null;
      }

      await updateProfile(updateData);
      console.log('🎭 Avatar actualizado en perfil:', updateData);
      Alert.alert('Avatar actualizado', 'Tu avatar se ha cambiado correctamente');
    } catch (error) {
      console.error('Error updating avatar:', error);
      Alert.alert('Error', 'No se pudo actualizar el avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const renderPost = ({ item, index }: { item: Post; index: number }) => (
    <TouchableOpacity
      style={[styles.gridItem, { backgroundColor: theme.colors.surface }]}
      onPress={() => console.log('Open post:', item.id)}
      activeOpacity={0.8}
    >
      {item.imageUrls && item.imageUrls.length > 0 ? (
        <Image
          source={{ uri: item.imageUrls[0] }}
          style={styles.gridImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.gridPlaceholder, { backgroundColor: theme.colors.border }]}>
          <Text style={[styles.gridText, { color: theme.colors.textSecondary }]} numberOfLines={3}>
            {item.content}
          </Text>
        </View>
      )}
      
      {/* Indicadores */}
      <View style={styles.gridOverlay}>
        {item.imageUrls && item.imageUrls.length > 1 && (
          <View style={styles.mediaIndicator}>
            <Ionicons name="copy" size={12} color="white" />
          </View>
        )}
        {/* Video indicator removido por ahora ya que solo manejamos imágenes */}
      </View>

      {/* Stats en la esquina */}
      <View style={styles.gridStats}>
        <View style={styles.gridStat}>
          <Ionicons name="heart" size={12} color="white" />
          <Text style={styles.gridStatText}>{formatNumber(item.likes)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEditModal = () => (
    <Modal
      visible={showEditModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEditModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { 
          backgroundColor: theme.colors.card,
          transform: [{ translateY: keyboardHeight > 0 ? -keyboardHeight / 2 : 0 }],
        }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={[styles.modalCancel, { color: theme.colors.textSecondary }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Editar Perfil
            </Text>
            <TouchableOpacity onPress={handleSaveProfile} disabled={updating}>
              {updating ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Text style={[styles.modalSave, { color: theme.colors.accent }]}>
                  Guardar
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header principal - solo en móvil */}
          {!isDesktop && (
            <Header
              onNotificationsPress={handleNotificationsPress}
            />
          )}

          {/* Header con acciones del perfil */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.headerLeft} />
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {userProfile?.displayName || 'Perfil'}
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.settingsButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsButton} onPress={handleSettings}>
                <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          </View>

        {/* Información del perfil */}
        <View style={styles.profileInfo}>
          {/* Avatar y botones */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {uploadingAvatar ? (
                <View style={[styles.avatarLoadingContainer, { backgroundColor: theme.colors.surface }]}>
                  <ActivityIndicator size="large" color={theme.colors.accent} />
                </View>
              ) : (
                <AvatarPicker
                  currentAvatar={userProfile.photoURL}
                  currentAvatarType={userProfile.avatarType}
                  currentAvatarId={userProfile.avatarId}
                  onAvatarSelect={handleAvatarSelect}
                  size={80}
                />
              )}
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: theme.colors.accent }]}
                onPress={handleEditProfile}
              >
                <Text style={styles.editButtonText}>Editar perfil</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shareButton, { borderColor: theme.colors.border }]}
                onPress={handleShareProfile}
              >
                <Ionicons name="share-outline" size={20} color={theme.colors.text} />
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
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              📧 {userProfile.email || 'Sin email'}
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              📅 Miembro desde {userProfile.createdAt.toDate().toLocaleDateString()}
            </Text>
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

        {/* Grilla de posts */}
        <View style={styles.postsSection}>
          <View style={[styles.postsHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.postsTitle, { color: theme.colors.text }]}>
              Publicaciones ({userPosts.length})
            </Text>
          </View>
          
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
          ) : userPosts.length > 0 ? (
            <FlatList
              data={userPosts}
              renderItem={renderPost}
              keyExtractor={item => item.id || `post-${item.userId}-${Date.now()}`}
              numColumns={3}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={styles.gridContainer}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons 
                name="camera-outline" 
                size={48} 
                color={theme.colors.textSecondary} 
              />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                Aún no tienes publicaciones
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
                ¡Comparte tu primer post anónimo!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de edición */}
      {renderEditModal()}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerLeft: {
    width: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsButton: {
    padding: 4,
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
    padding: 16,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 16,
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
    gap: 8,
  },
  editButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
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
  infoText: {
    fontSize: 12,
    marginBottom: 4,
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
  postsSection: {
    marginTop: 8,
  },
  postsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  postsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  gridContainer: {
    padding: 8,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gridItem: {
    width: gridItemSize,
    height: gridItemSize,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  gridText: {
    fontSize: 12,
    textAlign: 'center',
  },
  gridOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    gap: 4,
  },
  mediaIndicator: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 2,
  },
  videoIndicator: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 2,
  },
  gridStats: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
  },
  gridStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 4,
    alignSelf: 'flex-start',
  },
  gridStatText: {
    color: 'white',
    fontSize: 10,
    marginLeft: 2,
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  modalCancel: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
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
