import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image as RNImage,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useResponsive } from '../hooks/useResponsive';
import { postsService } from '../services/firestoreService';
import { uploadPostImage } from '../services/storageService';
import { communityService, CATEGORY_TAGS } from '../services/communityService';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { Timestamp } from 'firebase/firestore';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, ICON_SIZE } from '../constants/design';
import { scale } from '../utils/scale';
import AvatarDisplay from '../components/avatars/AvatarDisplay';

// Colores para cada categoría (mismo que en LandingScreen)
const CATEGORY_COLORS: { [key: string]: string } = {
  'noticias': '#10B981',
  'relaciones-amor': '#EC4899',
  'finanzas-dinero': '#6366F1',
  'laboral': '#F59E0B',
  'salud-bienestar': '#22C55E',
  'entretenimiento': '#F59E0B',
  'gaming-tech': '#8B5CF6',
  'educacion-carrera': '#0EA5E9',
  'deportes': '#EF4444',
  'confesiones': '#6B7280',
  'debates-calientes': '#F97316',
  'viajes-lugares': '#14B8A6',
  'comida-cocina': '#F472B6',
  'moda-estilo': '#A855F7',
  'espiritualidad': '#FBBF24',
  'anime-manga': '#FF6B9D',
  'criptomonedas': '#F7931A',
  'kpop-kdrama': '#FF2D78',
  // Fallback para comunidades antiguas
  'gamers': '#8B5CF6',
  'politica': '#10B981',
  'religion-filosofia': '#FBBF24',
  'recreacion': '#14B8A6',
  'denuncias-injusticias': '#EF4444',
  'consejos-psicologia': '#EC4899',
  'gastronomia': '#F472B6',
  'haters': '#F97316',
};

const getCategoryColor = (slug: string): string => {
  return CATEGORY_COLORS[slug] || '#8B5CF6';
};

// Categorías oficiales (mismo que en LandingScreen)
const OFFICIAL_CATEGORIES = [
  { id: 'noticias', name: 'Noticias', icon: 'newspaper-outline', customIcon: require('../assets/icons/category-noticias.png'), slug: 'noticias' },
  { id: 'relaciones', name: 'Relaciones & Amor', icon: 'heart-outline', customIcon: require('../assets/icons/category-relaciones.png'), slug: 'relaciones-amor' },
  { id: 'finanzas', name: 'Finanzas & Dinero', icon: 'cash-outline', customIcon: require('../assets/icons/category-trabajo.png'), slug: 'finanzas-dinero' },
  { id: 'laboral', name: 'Laboral', icon: 'briefcase-outline', customIcon: require('../assets/icons/category-laboral.png'), slug: 'laboral' },
  { id: 'salud', name: 'Salud & Bienestar', icon: 'fitness-outline', customIcon: require('../assets/icons/category-salud.png'), slug: 'salud-bienestar' },
  { id: 'entretenimiento', name: 'Entretenimiento', icon: 'film-outline', slug: 'entretenimiento' },
  { id: 'gaming', name: 'Gaming & Tech', icon: 'game-controller-outline', customIcon: require('../assets/icons/category-gaming.png'), slug: 'gaming-tech' },
  { id: 'educacion', name: 'Educación & Carrera', icon: 'school-outline', slug: 'educacion-carrera' },
  { id: 'deportes', name: 'Deportes', icon: 'football-outline', slug: 'deportes' },
  { id: 'confesiones', name: 'Confesiones', icon: 'eye-off-outline', slug: 'confesiones' },
  { id: 'debates', name: 'Debates Calientes', icon: 'flame-outline', slug: 'debates-calientes' },
  { id: 'viajes', name: 'Viajes & Lugares', icon: 'airplane-outline', customIcon: require('../assets/icons/category-viajes.png'), slug: 'viajes-lugares' },
  { id: 'comida', name: 'Comida & Cocina', icon: 'restaurant-outline', slug: 'comida-cocina' },
  { id: 'moda', name: 'Moda & Estilo', icon: 'shirt-outline', slug: 'moda-estilo' },
  { id: 'espiritualidad', name: 'Espiritualidad', icon: 'sparkles-outline', slug: 'espiritualidad' },
  { id: 'anime', name: 'Anime & Manga', icon: 'sparkles-outline', slug: 'anime-manga' },
  { id: 'cripto', name: 'Criptomonedas', icon: 'logo-bitcoin', slug: 'criptomonedas' },
  { id: 'kpop', name: 'K-Pop & K-Drama', icon: 'musical-notes-outline', slug: 'kpop-kdrama' },
];

// Tipo simple para categorías seleccionables
interface SelectableCategory {
  id: string;
  name: string;
  icon: string;
  slug: string;
}

interface MediaItem {
  type: 'image' | 'video';
  uri: string;
  id: string;
}

interface PollOption {
  id: string;
  text: string;
}

interface Poll {
  options: PollOption[];
  duration: number; // duración en horas
}

const CreateScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { contentMaxWidth } = useResponsive();
  const navigation = useNavigation();

  // Communities
  const [selectedCommunity, setSelectedCommunity] = useState<SelectableCategory | null>(null);
  const [userCommunities, setUserCommunities] = useState<SelectableCategory[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDescription, setNewCommunityDescription] = useState('');
  const [newCommunityIcon, setNewCommunityIcon] = useState('chatbubbles');
  const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);

  const [postText, setPostText] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<MediaItem[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [poll, setPoll] = useState<Poll | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const maxTextLength = 500;
  const maxTags = 3;
  const maxImages = 4;
  const maxPollOptions = 4;
  const minPollOptions = 2;
  const textProgress = postText.length / maxTextLength;
  const isTextOverLimit = postText.length > maxTextLength;

  // Validar que las opciones de encuesta tengan texto
  const isPollValid = poll
    ? poll.options.length >= minPollOptions &&
      poll.options.every(opt => opt.text.trim().length > 0)
    : true;

  // Auto-seleccionar la primera categoría
  useEffect(() => {
    if (!selectedCommunity) {
      setSelectedCommunity(OFFICIAL_CATEGORIES[0]);
    }
  }, [selectedCommunity]);

  // Cargar categorías de usuarios
  useEffect(() => {
    const loadUserCommunities = async () => {
      try {
        const communities = await communityService.getUserCommunities();
        // Mapear a SelectableCategory
        const mapped: SelectableCategory[] = communities.map(c => ({
          id: c.id || c.slug,
          name: c.name,
          icon: c.icon,
          slug: c.slug,
        }));
        setUserCommunities(mapped);
      } catch (error) {
        console.error('Error loading user communities:', error);
      }
    };
    loadUserCommunities();
  }, []);

  // Resetear tags cuando cambia la categoría
  useEffect(() => {
    setSelectedTags([]);
  }, [selectedCommunity?.id]);

  // Obtener tags disponibles para la categoría seleccionada
  const getAvailableTags = useCallback(() => {
    if (!selectedCommunity) return [];
    return CATEGORY_TAGS[selectedCommunity.slug] || [];
  }, [selectedCommunity]);

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      }
      if (prev.length >= maxTags) {
        return prev;
      }
      return [...prev, tag];
    });
  };

  // Crear nueva categoría
  const handleCreateCommunity = async () => {
    if (!user || !newCommunityName.trim()) {
      Alert.alert('Error', 'Ingresa un nombre para la categoría');
      return;
    }

    setIsCreatingCommunity(true);
    try {
      await communityService.createCommunity({
        name: newCommunityName.trim(),
        description: newCommunityDescription.trim() || `Categoría creada por la comunidad`,
        icon: newCommunityIcon,
        rules: ['Se respetuoso', 'No spam'],
        createdBy: user.uid,
      });

      Alert.alert(
        'Categoría creada',
        'Tu categoría ha sido creada y ya está disponible para usar.',
        [{ text: 'OK' }]
      );

      setShowCreateModal(false);
      setNewCommunityName('');
      setNewCommunityDescription('');
      setNewCommunityIcon('chatbubbles');

      // Recargar categorías de usuarios
      const communities = await communityService.getUserCommunities();
      const mapped: SelectableCategory[] = communities.map(c => ({
        id: c.id || c.slug,
        name: c.name,
        icon: c.icon,
        slug: c.slug,
      }));
      setUserCommunities(mapped);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo crear la categoría');
    } finally {
      setIsCreatingCommunity(false);
    }
  };

  const canPublish = postText.trim().length > 0 && !isTextOverLimit && !isPublishing && isPollValid && selectedCommunity !== null;

  const handleClose = () => {
    navigation.goBack();
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

    if (!selectedCommunity) {
      Alert.alert('Comunidad requerida', 'Selecciona una comunidad para publicar');
      return;
    }

    console.log('🚀 Iniciando publicación...');
    console.log('👤 Usuario ID:', user.uid);
    console.log('📝 Contenido:', postText.trim());
    console.log('🖼️ Imágenes adjuntas:', attachedMedia.length);
    console.log('🏘️ Comunidad:', selectedCommunity.name);

    setIsPublishing(true);

    try {
      // Subir imágenes a Firebase Storage si las hay
      let imageUrls: string[] = [];
      let thumbnailUrls: string[] = [];

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

            // Subir a Firebase Storage (full size y thumbnail)
            console.log('☁️ Subiendo a Firebase Storage...');
            const { fullSize, thumbnail } = await uploadPostImage(
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

            console.log('✅ Imagen full size subida:', fullSize);
            console.log('✅ Thumbnail subido:', thumbnail);
            imageUrls.push(fullSize);
            thumbnailUrls.push(thumbnail);
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
      const postData: any = {
        userId: user.uid,
        content: postText.trim(),
        imageUrls,
        imageUrlsThumbnails: thumbnailUrls,
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
        isPrivate: false,
        hashtags,
        // Community data
        communityId: selectedCommunity.id,
        communitySlug: selectedCommunity.slug,
        tags: selectedTags.length > 0 ? selectedTags : [],
        // Voting system (initialize with 0)
        agreementCount: 0,
        disagreementCount: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Solo agregar poll si existe (evitar undefined en Firestore)
      if (poll) {
        postData.poll = {
          options: poll.options.map(opt => ({
            text: opt.text.trim(),
            votes: 0,
            votedBy: [],
          })),
          endsAt: Timestamp.fromMillis(Date.now() + poll.duration * 60 * 60 * 1000),
          totalVotes: 0,
        };
      }

      console.log('💾 Guardando post en Firestore...', postData);
      const postId = await postsService.create(postData);
      console.log('✅ Post creado con ID:', postId);

      // Limpiar formulario
      setPostText('');
      setAttachedMedia([]);
      setUploadProgress({});
      setPoll(null);
      setSelectedTags([]);

      // Navegar al feed de la categoría para ver la publicación
      const communitySlug = selectedCommunity.slug;
      (navigation as any).reset({
        index: 0,
        routes: [
          {
            name: 'Main',
            state: {
              routes: [
                {
                  name: 'Home',
                  state: {
                    routes: [
                      { name: 'Landing' },
                      { name: 'Feed', params: { communitySlug } },
                    ],
                    index: 1,
                  },
                },
              ],
            },
          },
        ],
      });

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
        }]}
        placeholder="¿Qué está pasando?"
        placeholderTextColor={theme.colors.textSecondary}
        value={postText}
        onChangeText={setPostText}
        multiline
        maxLength={maxTextLength + 50} // Permitir exceso para mostrar error
        textAlignVertical="top"
        autoFocus={true}
      />
    </View>
  );

  const renderMediaPreview = () => {
    if (attachedMedia.length === 0) return null;

    return (
      <View style={styles.mediaPreviewSection}>
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
                style={[styles.removeMediaButton, { backgroundColor: 'rgba(0,0,0,0.75)' }]}
                onPress={() => removeMedia(media.id)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={scale(18)} color="white" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderPoll = () => {
    if (!poll) return null;

    const pollDurations = [
      { label: '1 día', value: 24 },
      { label: '3 días', value: 72 },
      { label: '7 días', value: 168 },
    ];

    return (
      <View style={[styles.pollSection, {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
      }]}>
        {/* Header de encuesta */}
        <View style={styles.pollHeader}>
          <View style={styles.pollHeaderLeft}>
            <Ionicons name="bar-chart" size={scale(18)} color={theme.colors.accent} />
            <Text style={[styles.pollTitle, { color: theme.colors.text }]}>Encuesta</Text>
          </View>
          <TouchableOpacity onPress={handlePollPress} style={styles.removePollButton}>
            <Ionicons name="close" size={scale(18)} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Opciones de encuesta */}
        {poll.options.map((option, index) => (
          <View key={option.id} style={styles.pollOptionContainer}>
            <TextInput
              style={[styles.pollOptionInput, {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }]}
              placeholder={`Opción ${index + 1}`}
              placeholderTextColor={theme.colors.textSecondary}
              value={option.text}
              onChangeText={(text) => handlePollOptionChange(option.id, text)}
              maxLength={25}
            />
            {poll.options.length > minPollOptions && (
              <TouchableOpacity
                onPress={() => handleRemovePollOption(option.id)}
                style={styles.removePollOptionButton}
              >
                <Ionicons name="close-circle" size={scale(20)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Botón para agregar opción */}
        {poll.options.length < maxPollOptions && (
          <TouchableOpacity
            style={[styles.addPollOptionButton, { borderColor: theme.colors.border }]}
            onPress={handleAddPollOption}
          >
            <Ionicons name="add" size={scale(18)} color={theme.colors.accent} />
            <Text style={[styles.addPollOptionText, { color: theme.colors.accent }]}>
              Agregar opción
            </Text>
          </TouchableOpacity>
        )}

        {/* Selector de duración */}
        <View style={styles.pollDurationContainer}>
          <Text style={[styles.pollDurationLabel, { color: theme.colors.textSecondary }]}>
            Duración de la encuesta
          </Text>
          <View style={styles.pollDurationButtons}>
            {pollDurations.map((duration) => (
              <TouchableOpacity
                key={duration.value}
                style={[
                  styles.pollDurationButton,
                  {
                    backgroundColor: poll.duration === duration.value ? theme.colors.accent : theme.colors.background,
                    borderColor: poll.duration === duration.value ? theme.colors.accent : theme.colors.border,
                  }
                ]}
                onPress={() => handlePollDurationChange(duration.value)}
              >
                <Text style={[
                  styles.pollDurationButtonText,
                  {
                    color: poll.duration === duration.value ? 'white' : theme.colors.text,
                  }
                ]}>
                  {duration.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const handlePollPress = () => {
    if (poll) {
      // Si ya hay una encuesta, removerla
      setPoll(null);
    } else {
      // Si hay imágenes, no permitir crear encuesta
      if (attachedMedia.length > 0) {
        Alert.alert('No disponible', 'No puedes agregar una encuesta si ya tienes imágenes adjuntas');
        return;
      }
      // Crear nueva encuesta con 2 opciones vacías
      setPoll({
        options: [
          { id: '1', text: '' },
          { id: '2', text: '' },
        ],
        duration: 24, // 1 día por defecto
      });
    }
  };

  const handleAddPollOption = () => {
    if (!poll || poll.options.length >= maxPollOptions) return;

    setPoll({
      ...poll,
      options: [
        ...poll.options,
        { id: Date.now().toString(), text: '' }
      ]
    });
  };

  const handleRemovePollOption = (optionId: string) => {
    if (!poll || poll.options.length <= minPollOptions) return;

    setPoll({
      ...poll,
      options: poll.options.filter(opt => opt.id !== optionId)
    });
  };

  const handlePollOptionChange = (optionId: string, text: string) => {
    if (!poll) return;

    setPoll({
      ...poll,
      options: poll.options.map(opt =>
        opt.id === optionId ? { ...opt, text } : opt
      )
    });
  };

  const handlePollDurationChange = (duration: number) => {
    if (!poll) return;

    setPoll({
      ...poll,
      duration
    });
  };

  const renderToolbar = () => (
    <View style={styles.toolbar}>
      <View style={styles.toolbarLeft}>
        {/* Botón de galería */}
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={pickImageFromGallery}
          disabled={attachedMedia.length >= maxImages || poll !== null}
          activeOpacity={0.7}
        >
          <Ionicons
            name="image-outline"
            size={scale(22)}
            color={(attachedMedia.length >= maxImages || poll !== null) ? theme.colors.textSecondary : theme.colors.accent}
          />
        </TouchableOpacity>

        {/* Botón de cámara - solo en mobile */}
        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={takePhoto}
            disabled={attachedMedia.length >= maxImages || poll !== null}
            activeOpacity={0.7}
          >
            <Ionicons
              name="camera-outline"
              size={scale(22)}
              color={(attachedMedia.length >= maxImages || poll !== null) ? theme.colors.textSecondary : theme.colors.accent}
            />
          </TouchableOpacity>
        )}

        {/* Botón de encuesta */}
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={handlePollPress}
          activeOpacity={0.7}
        >
          <Ionicons
            name="bar-chart-outline"
            size={scale(22)}
            color={poll ? theme.colors.accent : theme.colors.accent}
            style={poll ? { opacity: 1 } : {}}
          />
        </TouchableOpacity>
      </View>

      {/* Contador de caracteres - solo visible después del 75% */}
      {textProgress >= 0.75 && (
        <View style={styles.toolbarRight}>
          <Text style={[
            styles.counterText,
            {
              color: isTextOverLimit ? theme.colors.error : theme.colors.textSecondary,
              fontWeight: isTextOverLimit ? 'bold' : 'normal',
            }
          ]}>
            {postText.length > maxTextLength ? `-${postText.length - maxTextLength}` : `${maxTextLength - postText.length}`}
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
      )}
    </View>
  );


  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom']}
    >
      {/* Header estilo X.com - pantalla completa */}
      <View style={[styles.header, {
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.border,
      }]}>
        <TouchableOpacity
          onPress={handleClose}
          activeOpacity={0.7}
          style={styles.cancelButton}
        >
          <Text style={[styles.cancelText, { color: theme.colors.text }]}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.postButton, {
            backgroundColor: canPublish ? theme.colors.accent : theme.colors.surface,
            opacity: canPublish ? 1 : 0.5,
          }]}
          onPress={handlePublish}
          disabled={!canPublish}
          activeOpacity={0.8}
        >
          {isPublishing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.postButtonText}>Postear</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Community Selector con iconos coloridos */}
      <View style={[styles.communitySelector, { borderBottomColor: theme.colors.border }]}>
        {/* Categorías Oficiales */}
        <Text style={[styles.communitySelectorLabel, { color: theme.colors.textSecondary }]}>
          Categorías Oficiales
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.communityGridContainer}
        >
          {OFFICIAL_CATEGORIES.map((category) => {
            const color = getCategoryColor(category.slug);
            const isSelected = selectedCommunity?.id === category.id;

            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.communityCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: isSelected ? color : theme.colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => setSelectedCommunity(category)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.communityIconContainer,
                    category.customIcon ? {} : {
                      backgroundColor: color,
                      shadowColor: color,
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.4,
                      shadowRadius: 6,
                      elevation: 4,
                    },
                  ]}
                >
                  {category.customIcon ? (
                    <Image
                      source={category.customIcon}
                      style={styles.customCategoryIcon}
                    />
                  ) : (
                    <Ionicons
                      name={category.icon as any}
                      size={scale(20)}
                      color="white"
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.communityCardText,
                    { color: theme.colors.text },
                  ]}
                  numberOfLines={2}
                >
                  {category.name}
                </Text>
                {isSelected && (
                  <View style={[styles.selectedBadge, { backgroundColor: color }]}>
                    <Ionicons name="checkmark" size={scale(12)} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Categorías de la Comunidad */}
        {userCommunities.length > 0 && (
          <>
            <Text style={[styles.communitySelectorLabel, { color: theme.colors.textSecondary, marginTop: SPACING.md }]}>
              Categorías de la Comunidad
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.communityGridContainer}
            >
              {userCommunities.map((community) => {
                const color = getCategoryColor(community.slug) || '#6B7280';
                const isSelected = selectedCommunity?.id === community.id;

                return (
                  <TouchableOpacity
                    key={community.id}
                    style={[
                      styles.communityCard,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: isSelected ? color : theme.colors.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                    onPress={() => setSelectedCommunity(community)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.communityIconContainer,
                        {
                          backgroundColor: color,
                          shadowColor: color,
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 0.4,
                          shadowRadius: 6,
                          elevation: 4,
                        },
                      ]}
                    >
                      <Ionicons
                        name={community.icon as any}
                        size={scale(20)}
                        color="white"
                      />
                    </View>
                    <Text
                      style={[
                        styles.communityCardText,
                        { color: theme.colors.text },
                      ]}
                      numberOfLines={2}
                    >
                      {community.name}
                    </Text>
                    {isSelected && (
                      <View style={[styles.selectedBadge, { backgroundColor: color }]}>
                        <Ionicons name="checkmark" size={scale(12)} color="white" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* Botón Crear Nueva Categoría */}
        <TouchableOpacity
          style={[styles.createCategoryButton, { borderColor: theme.colors.border }]}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={scale(20)} color={theme.colors.accent} />
          <Text style={[styles.createCategoryText, { color: theme.colors.accent }]}>
            Crear nueva categoría
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tags Section */}
      {selectedCommunity && getAvailableTags().length > 0 && (
        <View style={[styles.tagsSection, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.tagsHeader}>
            <Text style={[styles.tagsLabel, { color: theme.colors.textSecondary }]}>
              Tags (opcional, máx. {maxTags})
            </Text>
            {selectedTags.length > 0 && (
              <Text style={[styles.tagsCount, { color: theme.colors.accent }]}>
                {selectedTags.length}/{maxTags}
              </Text>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsScrollContent}
          >
            {getAvailableTags().map((tag) => {
              const isSelected = selectedTags.includes(tag);
              const color = getCategoryColor(selectedCommunity.slug);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor: isSelected ? color : theme.colors.surface,
                      borderColor: isSelected ? color : theme.colors.border,
                    },
                  ]}
                  onPress={() => toggleTag(tag)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tagChipText,
                      { color: isSelected ? 'white' : theme.colors.text },
                    ]}
                  >
                    {tag}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={scale(14)} color="white" style={{ marginLeft: scale(4) }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={0}
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
          {/* Área de composición con avatar */}
          <View style={styles.compositionArea}>
            {/* Avatar del usuario */}
            <View style={styles.avatarContainer}>
              <AvatarDisplay
                size={scale(32)}
                avatarType={userProfile?.avatarType || 'predefined'}
                avatarId={userProfile?.avatarId || 'male'}
                photoURL={typeof userProfile?.photoURL === 'string' ? userProfile.photoURL : undefined}
                photoURLThumbnail={typeof userProfile?.photoURLThumbnail === 'string' ? userProfile.photoURLThumbnail : undefined}
              />
            </View>

            {/* Área de texto e imágenes */}
            <View style={styles.inputArea}>
              {renderTextInput()}
              {renderMediaPreview()}
              {renderPoll()}
            </View>
          </View>
        </ScrollView>

        {/* Toolbar fija que sigue al teclado */}
        <View style={[
          styles.toolbarContainer,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
            maxWidth: contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
          }
        ]}>
          {renderToolbar()}
        </View>
      </KeyboardAvoidingView>

      {/* Modal para crear nueva categoría */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Crear Nueva Categoría
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={scale(24)} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              Crea una nueva categoría para la comunidad
            </Text>

            <View style={styles.modalForm}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Nombre</Text>
              <TextInput
                style={[styles.modalInput, {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }]}
                placeholder="Ej: Mascotas, Autos, etc."
                placeholderTextColor={theme.colors.textSecondary}
                value={newCommunityName}
                onChangeText={setNewCommunityName}
                maxLength={30}
              />

              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea, {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                }]}
                placeholder="¿De qué trata esta categoría?"
                placeholderTextColor={theme.colors.textSecondary}
                value={newCommunityDescription}
                onChangeText={setNewCommunityDescription}
                maxLength={150}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Icono</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconSelector}>
                {['chatbubbles', 'people', 'heart', 'star', 'flash', 'leaf', 'paw', 'car', 'musical-notes', 'camera', 'book', 'game-controller'].map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      {
                        backgroundColor: newCommunityIcon === icon ? theme.colors.accent : theme.colors.surface,
                        borderColor: newCommunityIcon === icon ? theme.colors.accent : theme.colors.border,
                      },
                    ]}
                    onPress={() => setNewCommunityIcon(icon)}
                  >
                    <Ionicons
                      name={icon as any}
                      size={scale(22)}
                      color={newCommunityIcon === icon ? 'white' : theme.colors.text}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity
              style={[
                styles.createCommunitySubmitButton,
                {
                  backgroundColor: newCommunityName.trim() ? theme.colors.accent : theme.colors.surface,
                  opacity: newCommunityName.trim() ? 1 : 0.5,
                },
              ]}
              onPress={handleCreateCommunity}
              disabled={!newCommunityName.trim() || isCreatingCommunity}
            >
              {isCreatingCommunity ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.createCommunitySubmitText}>Crear categoría</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  // Header estilo X.com - pantalla completa
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: scale(0.5),
  },
  cancelButton: {
    paddingVertical: SPACING.xs,
  },
  cancelText: {
    fontSize: FONT_SIZE.base,
  },
  postButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: scale(8),
    borderRadius: BORDER_RADIUS.full,
    minWidth: scale(70),
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonText: {
    color: 'white',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  // Community selector
  communitySelector: {
    paddingVertical: SPACING.md,
    borderBottomWidth: scale(0.5),
  },
  communitySelectorLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  communityGridContainer: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  communityCard: {
    width: scale(80),
    height: scale(90),
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
  },
  communityIconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  customCategoryIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
  },
  communityCardText: {
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.medium,
    textAlign: 'center',
    lineHeight: scale(12),
  },
  selectedBadge: {
    position: 'absolute',
    top: scale(4),
    right: scale(4),
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Área de composición
  compositionArea: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  avatarContainer: {
    paddingTop: scale(2),
  },
  inputArea: {
    flex: 1,
  },
  textInputSection: {
    marginBottom: 0,
  },
  textInput: {
    minHeight: scale(32),
    fontSize: FONT_SIZE.lg,
    lineHeight: scale(24),
    paddingVertical: 0,
  },
  // Media preview inline
  mediaPreviewSection: {
    marginTop: SPACING.sm,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  mediaPreviewItem: {
    position: 'relative',
    width: '100%',
    height: scale(280),
    borderRadius: BORDER_RADIUS.lg,
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
    top: SPACING.md,
    right: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    padding: scale(8),
  },
  // Toolbar container que sigue al teclado
  toolbarContainer: {
    borderTopWidth: scale(0.5),
    paddingHorizontal: SPACING.lg,
  },
  // Toolbar estilo X.com
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  toolbarButton: {
    padding: SPACING.sm,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  counterText: {
    fontSize: FONT_SIZE.xs,
  },
  progressCircle: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
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
  // Poll styles
  pollSection: {
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: scale(1),
    padding: SPACING.lg,
  },
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  pollHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  pollTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },
  removePollButton: {
    padding: SPACING.xs,
  },
  pollOptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  pollOptionInput: {
    flex: 1,
    borderWidth: scale(1),
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.base,
  },
  removePollOptionButton: {
    padding: SPACING.xs,
  },
  addPollOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderWidth: scale(1),
    borderRadius: BORDER_RADIUS.md,
    borderStyle: 'dashed',
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  addPollOptionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  pollDurationContainer: {
    marginTop: SPACING.sm,
  },
  pollDurationLabel: {
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.sm,
  },
  pollDurationButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  pollDurationButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: scale(1),
    alignItems: 'center',
  },
  pollDurationButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  // Botón crear categoría
  createCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
    marginHorizontal: SPACING.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  createCategoryText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  // Tags section
  tagsSection: {
    paddingVertical: SPACING.md,
    borderBottomWidth: scale(0.5),
  },
  tagsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  tagsLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  tagsCount: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  tagsScrollContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  tagChipText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  // Modal estilos
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
  },
  modalSubtitle: {
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.xl,
  },
  modalForm: {
    marginBottom: SPACING.xl,
  },
  inputLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    marginBottom: SPACING.xs,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.base,
    marginBottom: SPACING.md,
  },
  modalTextArea: {
    minHeight: scale(80),
    textAlignVertical: 'top',
  },
  iconSelector: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  iconOption: {
    width: scale(44),
    height: scale(44),
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  createCommunitySubmitButton: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCommunitySubmitText: {
    color: 'white',
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
});

export default CreateScreen;
