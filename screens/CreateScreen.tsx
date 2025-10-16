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
import { useUserProfile } from '../hooks/useUserProfile';
import { useResponsive } from '../hooks/useResponsive';
import { postsService } from '../services/firestoreService';
import { uploadPostImage } from '../services/storageService';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { Timestamp } from 'firebase/firestore';
import Header from '../components/Header';

const { width: screenWidth } = Dimensions.get('window');
const mediaPreviewSize = (screenWidth - 64) / 2; // Para 2 columnas con espaciado

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
            <View key={media.id} style={styles.mediaPreviewItem}>
              <Image
                source={{ uri: media.uri }}
                style={[styles.mediaPreviewImage, { backgroundColor: theme.colors.surface }]}
                resizeMode="cover"
              />
              
              {/* Indicador de tipo de media */}
              {media.type === 'video' && (
                <View style={styles.videoIndicator}>
                  <Ionicons name="play" size={20} color="white" />
                </View>
              )}
              
              {/* Botón de eliminar */}
              <TouchableOpacity
                style={styles.removeMediaButton}
                onPress={() => removeMedia(media.id)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={16} color="white" />
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
        <Ionicons name="camera" size={24} color={theme.colors.accent} />
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
            <Text style={styles.publishButtonText}>
              {attachedMedia.length > 0 ? 'Subiendo imágenes...' : 'Publicando...'}
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="send" size={20} color="white" />
            <Text style={styles.publishButtonText}>Publicar</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Tips de publicación */}
      <View style={styles.tips}>
        <Text style={[styles.tipsTitle, { color: theme.colors.text }]}>
          💡 Tips para tu post:
        </Text>
        <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
          • Usa #hashtags para que sea más descubrible
        </Text>
        <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
          • Las imágenes obtienen más interacción
        </Text>
        <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
          • Tu post se guardará permanentemente en el feed
        </Text>
        <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
          • Otros usuarios podrán darle like y comentar
        </Text>
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  textInputSection: {
    marginBottom: 24,
  },
  textInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  textCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  counterText: {
    fontSize: 14,
  },
  progressCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
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
    marginBottom: 24,
  },
  mediaHeader: {
    marginBottom: 12,
  },
  mediaSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaPreviewItem: {
    position: 'relative',
    width: mediaPreviewSize,
    height: mediaPreviewSize,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mediaPreviewImage: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  mediaActionsSection: {
    marginBottom: 24,
  },
  mediaActionButton: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  mediaActionText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  mediaActionSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  publishSection: {
    marginBottom: 32,
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  publishButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tips: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 16,
  },
});

export default CreateScreen;
