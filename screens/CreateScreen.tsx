import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useResponsive } from '../hooks/useResponsive';
import { postsService } from '../services/firestoreService';
import { uploadPostImage } from '../services/storageService';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { Timestamp } from 'firebase/firestore';
import Header from '../components/Header';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, ICON_SIZE } from '../constants/design';
import { scale } from '../utils/scale';

interface MediaItem {
  type: 'image' | 'video';
  uri: string;
  id: string;
}

const CreateScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { contentMaxWidth } = useResponsive();
  const navigation = useNavigation();
  const [postText, setPostText] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<MediaItem[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const maxTextLength = 300;
  const maxImages = 4;
  const textProgress = postText.length / maxTextLength;
  const isTextOverLimit = postText.length > maxTextLength;
  const canPublish = postText.trim().length > 0 && !isTextOverLimit && !isPublishing;

  // Funciones de navegación para el header
  const handleSearchPress = () => {
    navigation.navigate('Search' as never);
  };

  const handleProfilePress = () => {
    navigation.navigate('Settings' as never);
  };

  // Función para seleccionar imagen de la galería
  const pickImageFromGallery = async () => {
    try {
      // En web, usar input file de HTML
      if (Platform.OS === 'web') {
        return new Promise<void>((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.multiple = true;

          input.onchange = async (e: any) => {
            const files = Array.from(e.target.files) as File[];
            const remainingSlots = maxImages - attachedMedia.length;
            const filesToProcess = files.slice(0, remainingSlots);

            const newMedia: MediaItem[] = await Promise.all(
              filesToProcess.map(async (file: File, index: number) => {
                const uri = URL.createObjectURL(file);
                return {
                  id: `image_${Date.now()}_${index}`,
                  type: 'image' as const,
                  uri,
                };
              })
            );

            setAttachedMedia(prev => [...prev, ...newMedia]);
            resolve();
          };

          input.click();
        });
      }

      // En mobile, usar ImagePicker nativo
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permisos necesarios',
          'Necesitamos acceso a tu galería para seleccionar imágenes',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Ir a Configuración', onPress: () => ImagePicker.requestMediaLibraryPermissionsAsync() }
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: maxImages - attachedMedia.length,
        quality: 0.8,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets) {
        const newMedia: MediaItem[] = result.assets.map((asset, index) => ({
          id: `image_${Date.now()}_${index}`,
          type: 'image' as const,
          uri: asset.uri,
        }));

        setAttachedMedia(prev => [...prev, ...newMedia]);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron seleccionar las imágenes');
    }
  };

  // Función para tomar foto con la cámara
  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Permisos necesarios',
          'Necesitamos acceso a tu cámara para tomar fotos',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Ir a Configuración', onPress: () => ImagePicker.requestCameraPermissionsAsync() }
          ]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        aspect: [1, 1],
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        const newMedia: MediaItem = {
          id: `photo_${Date.now()}`,
          type: 'image',
          uri: result.assets[0].uri,
        };

        setAttachedMedia(prev => [...prev, newMedia]);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const handleAttachMedia = () => {
    if (attachedMedia.length >= maxImages) {
      Alert.alert('Límite alcanzado', `Solo puedes adjuntar hasta ${maxImages} imágenes.`);
      return;
    }

    // En web, ir directo a seleccionar archivo (no hay cámara)
    if (Platform.OS === 'web') {
      pickImageFromGallery();
      return;
    }

    // En mobile, mostrar opciones de cámara y galería
    Alert.alert(
      'Agregar Imagen',
      'Selecciona de dónde quieres obtener la imagen',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cámara', onPress: takePhoto },
        { text: 'Galería', onPress: pickImageFromGallery },
      ]
    );
  };

  const removeMedia = (mediaId: string) => {
    setAttachedMedia(prev => prev.filter(item => item.id !== mediaId));
  };

  const detectHashtags = (text: string): string[] => {
    const hashtagRegex = /#[\w\u00c0-\u024f\u1e00-\u1eff]+/gi;
    return text.match(hashtagRegex) || [];
  };

  const detectLinks = (text: string): string[] => {
    const linkRegex = /https?:\/\/[^\s]+/gi;
    return text.match(linkRegex) || [];
  };

  const handlePublish = async () => {
    if (!canPublish || !user || !userProfile) {
      Alert.alert('Error', 'Debes estar autenticado para publicar');
      return;
    }

    console.log('🚀 Iniciando publicación...');
    console.log('👤 Usuario ID:', user.uid);
    console.log('📝 Contenido:', postText.trim());
    console.log('🖼️ Imágenes adjuntas:', attachedMedia.length);

    setIsPublishing(true);

    try {
      // Subir imágenes a Firebase Storage si las hay
      let imageUrls: string[] = [];
      
      if (attachedMedia.length > 0) {
        console.log('📤 Subiendo', attachedMedia.length, 'imágenes...');
        
        for (let i = 0; i < attachedMedia.length; i++) {
          const media = attachedMedia[i];
          try {
            console.log(`🖼️ Subiendo imagen ${i + 1}/${attachedMedia.length}:`, media.id);
            
            // Convertir URI a blob
            console.log('🔄 Convirtiendo URI a blob...');
            const response = await fetch(media.uri);
            
            if (!response.ok) {
              throw new Error(`Error al obtener la imagen: ${response.status} ${response.statusText}`);
            }
            
            const blob = await response.blob();
            console.log('✅ Blob creado, tamaño:', blob.size, 'bytes');
            
            // Subir a Firebase Storage
            console.log('☁️ Subiendo a Firebase Storage...');
            const imageUrl = await uploadPostImage(
              blob,
              user.uid,
              (progress) => {
                console.log(`📊 Progreso imagen ${i + 1}:`, progress.progress.toFixed(1) + '%');
                setUploadProgress(prev => ({
                  ...prev,
                  [media.id]: progress.progress
                }));
              }
            );
            
            console.log('✅ Imagen subida exitosamente:', imageUrl);
            imageUrls.push(imageUrl);
          } catch (error) {
            console.error('Error uploading image:', error);
            Alert.alert(
              'Error al subir imagen', 
              `Error: ${error instanceof Error ? error.message : 'Error desconocido'}\n\nVerifica que:\n• Tengas conexión a internet\n• Firebase Storage esté configurado\n• Las reglas de Storage permitan escritura`
            );
            setIsPublishing(false);
            return;
          }
        }
      }

      // Extraer hashtags del texto
      const hashtags = detectHashtags(postText);
      console.log('🏷️ Hashtags encontrados:', hashtags);

      // Crear el post en Firestore
      const postData = {
        userId: user.uid,
        content: postText.trim(),
        imageUrls,
        likes: 0,
        comments: 0,
        shares: 0,
        isPrivate: false,
        hashtags,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      console.log('💾 Guardando post en Firestore...', postData);
      const postId = await postsService.create(postData);
      console.log('✅ Post creado con ID:', postId);

      // Limpiar formulario
      setPostText('');
      setAttachedMedia([]);
      setUploadProgress({});

      Alert.alert(
        '¡Publicado!',
        'Tu post ha sido publicado exitosamente',
        [
          { 
            text: 'Ver en Feed', 
            onPress: () => {
              navigation.navigate('HomeStack' as never, { screen: 'Home' } as never);
            }
          },
          { text: 'Crear otro', style: 'default' },
        ]
      );

    } catch (error) {
      console.error('Error publishing post:', error);
      Alert.alert(
        'Error al publicar', 
        `No se pudo publicar el post.\n\nError: ${error instanceof Error ? error.message : 'Error desconocido'}\n\nInténtalo de nuevo.`
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const renderTextInput = () => (
    <View style={styles.textInputSection}>
      <TextInput
        style={[styles.textInput, { 
          color: theme.colors.text,
          borderColor: isTextOverLimit ? theme.colors.error : theme.colors.border,
        }]}
        placeholder="¿Qué quieres compartir de forma anónima?"
        placeholderTextColor={theme.colors.textSecondary}
        value={postText}
        onChangeText={setPostText}
        multiline
        maxLength={maxTextLength + 50} // Permitir exceso para mostrar error
        textAlignVertical="top"
        autoFocus
      />
      
      {/* Contador de caracteres */}
      <View style={styles.textCounter}>
        <Text style={[
          styles.counterText,
          { 
            color: isTextOverLimit ? theme.colors.error : theme.colors.textSecondary,
            fontWeight: isTextOverLimit ? 'bold' : 'normal',
          }
        ]}>
          {postText.length}/{maxTextLength}
        </Text>
        
        {/* Indicador circular de progreso */}
        <View style={[styles.progressCircle, { borderColor: theme.colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: isTextOverLimit ? theme.colors.error : theme.colors.accent,
                transform: [{ rotate: `${Math.min(textProgress * 360, 360)}deg` }],
              },
            ]}
          />
        </View>
      </View>
    </View>
  );

  const renderMediaPreview = () => {
    if (attachedMedia.length === 0) return null;

    return (
      <View style={styles.mediaPreviewSection}>
        <View style={styles.mediaHeader}>
          <Text style={[styles.mediaSectionTitle, { color: theme.colors.text }]}>
            Media adjunta ({attachedMedia.length}/{maxImages})
          </Text>
        </View>

        <View style={styles.mediaGrid}>
          {attachedMedia.map((media, index) => (
            <View key={media.id} style={[
              styles.mediaPreviewItem,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }
            ]}>
              <Image
                source={{ uri: media.uri }}
                style={styles.mediaPreviewImage}
                resizeMode="cover"
              />

              {/* Indicador de tipo de media */}
              {media.type === 'video' && (
                <View style={styles.videoIndicator}>
                  <Ionicons name="play" size={scale(20)} color="white" />
                </View>
              )}

              {/* Botón de eliminar */}
              <TouchableOpacity
                style={[styles.removeMediaButton, { backgroundColor: theme.colors.error }]}
                onPress={() => removeMedia(media.id)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={scale(16)} color="white" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderMediaActions = () => (
    <View style={styles.mediaActionsSection}>
      <TouchableOpacity
        style={[styles.mediaActionButton, {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: attachedMedia.length >= maxImages ? 0.5 : 1,
        }]}
        onPress={handleAttachMedia}
        disabled={attachedMedia.length >= maxImages}
        activeOpacity={0.8}
      >
        <Ionicons name="camera" size={ICON_SIZE.lg} color={theme.colors.accent} />
        <Text style={[styles.mediaActionText, { color: theme.colors.text }]}>
          Agregar Imágenes
        </Text>
        <Text style={[styles.mediaActionSubtext, { color: theme.colors.textSecondary }]}>
          Hasta {maxImages} imágenes desde cámara o galería
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPublishSection = () => (
    <View style={styles.publishSection}>
      <TouchableOpacity
        style={[styles.publishButton, { 
          backgroundColor: canPublish ? theme.colors.accent : theme.colors.surface,
          opacity: canPublish ? 1 : 0.5,
        }]}
        onPress={handlePublish}
        disabled={!canPublish}
        activeOpacity={0.8}
      >
        {isPublishing ? (
          <>
            <ActivityIndicator size="small" color="white" />
            <Text style={styles.publishButtonText}>Publicando...</Text>
          </>
        ) : (
          <>
            <Ionicons name="send" size={ICON_SIZE.md} color="white" />
            <Text style={styles.publishButtonText}>Publicar</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
    >
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header principal */}
        <Header 
          onSearchPress={handleSearchPress}
          onProfilePress={handleProfilePress}
        />
        
        {/* Header de crear post */}
        <View style={[styles.header, { 
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
        }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Crear Post
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Comparte de forma anónima
          </Text>
        </View>

        {renderTextInput()}
        {renderMediaPreview()}
        {renderMediaActions()}
        {renderPublishSection()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: scale(0.5),
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: scale(4),
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.sm,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  textInputSection: {
    marginBottom: SPACING.xxl,
  },
  textInput: {
    minHeight: scale(120),
    borderWidth: scale(1),
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    fontSize: FONT_SIZE.md,
    lineHeight: scale(24),
  },
  textCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  counterText: {
    fontSize: FONT_SIZE.sm,
  },
  progressCircle: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    borderWidth: scale(2),
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '50%',
    height: '100%',
    transformOrigin: 'right center',
  },
  mediaPreviewSection: {
    marginBottom: SPACING.xxl,
  },
  mediaHeader: {
    marginBottom: SPACING.md,
  },
  mediaSectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  mediaPreviewItem: {
    position: 'relative',
    width: scale(140),
    height: scale(140),
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: scale(1),
  },
  mediaPreviewImage: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: BORDER_RADIUS.md,
    padding: scale(4),
  },
  removeMediaButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    padding: scale(6),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.3,
    shadowRadius: scale(4),
    elevation: 3,
  },
  mediaActionsSection: {
    marginBottom: SPACING.xxl,
  },
  mediaActionButton: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: scale(2),
    borderStyle: 'dashed',
  },
  mediaActionText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    marginTop: SPACING.sm,
  },
  mediaActionSubtext: {
    fontSize: FONT_SIZE.xs,
    marginTop: scale(4),
  },
  publishSection: {
    marginBottom: SPACING.xxxl,
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    marginBottom: SPACING.xxl,
  },
  publishButtonText: {
    color: 'white',
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
});

export default CreateScreen;
