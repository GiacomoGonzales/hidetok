import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import * as ImagePicker from 'expo-image-picker';
import { generateAvatarWithGemini, saveGeneratedAvatar, performAvatarReplacement, uploadImageForSwap, saveFaceSwapResult } from '../services/avatarGenerationService';
import { usersService } from '../services/firestoreService';

// --- Option data ---
const GENDER_OPTIONS = [
  { id: 'male', label: 'Masculino' },
  { id: 'female', label: 'Femenino' },
  { id: 'other', label: 'Otro' },
];

const SKIN_TONES = [
  { id: 'tone1', color: '#FDDBB4' },
  { id: 'tone2', color: '#E8B98D' },
  { id: 'tone3', color: '#D09B6F' },
  { id: 'tone4', color: '#AE7B4E' },
  { id: 'tone5', color: '#7C5139' },
  { id: 'tone6', color: '#4A2F1E' },
];

const HAIR_STYLES = [
  { id: 'short', label: 'Corto' },
  { id: 'medium', label: 'Medio' },
  { id: 'long', label: 'Largo' },
  { id: 'curly', label: 'Rizado' },
  { id: 'wavy', label: 'Ondulado' },
  { id: 'bald', label: 'Calvo' },
];

const AGE_RANGES = [
  { id: 'young', label: '18-30' },
  { id: 'adult', label: '30-50' },
  { id: 'senior', label: '50+' },
];

const EYE_COLOR_OPTIONS = [
  { id: 'brown', label: 'Marrón' },
  { id: 'blue', label: 'Azul' },
  { id: 'green', label: 'Verde' },
  { id: 'hazel', label: 'Miel' },
  { id: 'black', label: 'Negro' },
  { id: 'gray', label: 'Gris' },
];

const FACE_SHAPE_OPTIONS = [
  { id: 'oval', label: 'Ovalada' },
  { id: 'round', label: 'Redonda' },
  { id: 'angular', label: 'Angular' },
  { id: 'long', label: 'Alargada' },
  { id: 'square', label: 'Cuadrada' },
];

const FACIAL_HAIR_OPTIONS = [
  { id: 'none', label: 'Sin barba' },
  { id: 'stubble', label: 'Barba corta' },
  { id: 'full_beard', label: 'Barba larga' },
  { id: 'mustache', label: 'Bigote' },
  { id: 'goatee', label: 'Candado' },
];

const ACCESSORIES_OPTIONS = [
  { id: 'none', label: 'Ninguno' },
  { id: 'glasses', label: 'Lentes' },
  { id: 'sunglasses', label: 'Gafas de sol' },
  { id: 'earrings', label: 'Aretes' },
  { id: 'cap', label: 'Gorra' },
  { id: 'headscarf', label: 'Pañuelo' },
  { id: 'piercing', label: 'Piercing' },
];

const EXPRESSION_OPTIONS = [
  { id: 'smile', label: 'Sonrisa' },
  { id: 'serious', label: 'Serio' },
  { id: 'relaxed', label: 'Relajado' },
  { id: 'confident', label: 'Confiado' },
  { id: 'mysterious', label: 'Misterioso' },
];

const AiAvatarScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile, updateLocalProfile } = useUserProfile();
  const navigation = useNavigation();

  // Whether the user already has an AI avatar
  const [showWizard, setShowWizard] = useState(false);
  const hasAiAvatar = !!userProfile?.aiAvatarPortraitUrl && !showWizard;

  // Wizard step
  const [step, setStep] = useState<1 | 2>(1);

  // Selection state — Step 1 (Rostro base)
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [selectedSkinTone, setSelectedSkinTone] = useState<string | null>(null);
  const [selectedHairStyle, setSelectedHairStyle] = useState<string | null>(null);
  const [selectedAgeRange, setSelectedAgeRange] = useState<string | null>(null);

  // Selection state — Step 2 (Detalles del rostro)
  const [selectedEyeColor, setSelectedEyeColor] = useState<string | null>(null);
  const [selectedFaceShape, setSelectedFaceShape] = useState<string | null>(null);
  const [selectedFacialHair, setSelectedFacialHair] = useState<string | null>(null);
  const [selectedAccessories, setSelectedAccessories] = useState<string | null>(null);

  // Selection state — Step 2 (continued)
  const [selectedExpression, setSelectedExpression] = useState<string | null>(null);

  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Generated URL from Gemini (single image)
  const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState<string | null>(null);

  const step1Complete = selectedGender && selectedSkinTone && selectedHairStyle && selectedAgeRange;
  const step2Complete = selectedEyeColor && selectedFaceShape && selectedExpression;

  const getSelections = () => ({
    gender: selectedGender!,
    skinTone: selectedSkinTone!,
    hairStyle: selectedHairStyle!,
    ageRange: selectedAgeRange!,
    eyeColor: selectedEyeColor!,
    faceShape: selectedFaceShape!,
    facialHair: selectedFacialHair || 'none',
    accessories: selectedAccessories || 'none',
    expression: selectedExpression!,
  });

  const handleNextStep = () => {
    if (step === 1 && step1Complete) setStep(2);
  };

  const handleGenerate = async () => {
    if (!step1Complete || !step2Complete) return;
    if (!user?.uid) {
      Alert.alert('Error', 'Debes iniciar sesión para generar un avatar.');
      return;
    }
    const selections = getSelections();

    setLoading(true);
    setLoadingMessage('Generando avatar con Gemini AI...');
    try {
      const imageUrl = await generateAvatarWithGemini(selections);
      setGeneratedAvatarUrl(imageUrl);
      setGenerated(true);
    } catch (error: any) {
      console.error('Error generating avatar:', error);
      Alert.alert('Error', 'No se pudo generar el avatar. Intenta de nuevo.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleStartRegenerate = () => {
    setGenerated(false);
    setGeneratedAvatarUrl(null);
    setStep(1);
    setShowWizard(true);
  };

  // Upload a custom photo as avatar
  const handleUploadAvatar = async () => {
    if (!user?.uid || !userProfile?.id) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.uri) return;

    setLoading(true);
    setLoadingMessage('Subiendo foto...');
    try {
      const uploadedUrl = await uploadImageForSwap(user.uid, asset.uri, asset.base64);
      await usersService.update(userProfile.id, {
        photoURL: uploadedUrl,
        aiAvatarPortraitUrl: uploadedUrl,
      });
      updateLocalProfile({
        photoURL: uploadedUrl,
        aiAvatarPortraitUrl: uploadedUrl,
        avatarType: 'custom',
      });
      setGeneratedAvatarUrl(uploadedUrl);
      setGenerated(true);
      setShowWizard(false);
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', 'No se pudo subir la foto. Intenta de nuevo.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleRegenerate = async () => {
    if (!step1Complete || !step2Complete) {
      setGenerated(false);
      setGeneratedAvatarUrl(null);
      setStep(1);
      return;
    }
    setLoading(true);
    setLoadingMessage('Regenerando avatar con Gemini AI...');
    try {
      const imageUrl = await generateAvatarWithGemini(getSelections());
      setGeneratedAvatarUrl(imageUrl);
      setGenerated(true);
    } catch (error: any) {
      console.error('Error regenerating avatar:', error);
      Alert.alert('Error', 'No se pudo regenerar el avatar. Intenta de nuevo.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleUseAsAvatar = async () => {
    if (!generatedAvatarUrl || !user?.uid || !userProfile?.id) return;

    setLoading(true);
    setLoadingMessage('Guardando avatar...');
    try {
      const { avatarUrl } = await saveGeneratedAvatar(
        user.uid,
        userProfile.id,
        generatedAvatarUrl,
        getSelections(),
      );
      // Also set as profile photo when skipping face swap
      await usersService.update(userProfile.id, { photoURL: avatarUrl });
      updateLocalProfile({
        photoURL: avatarUrl,
        aiAvatarPortraitUrl: avatarUrl,
        aiAvatarSelections: getSelections(),
        avatarType: 'custom',
      });
      navigation.goBack();
    } catch (error: any) {
      console.error('Error saving avatar:', error);
      Alert.alert('Error', 'No se pudo guardar el avatar.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // --- Face Swap ---
  const [swapResultUrl, setSwapResultUrl] = useState<string | null>(null);

  // Pick image and do avatar replacement using Gemini
  const pickImageForSwap = async (fromCamera: boolean, avatarUrl: string) => {
    if (!user?.uid) return;

    let result;
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        allowsEditing: true,
        aspect: [3, 4],
        base64: true,
      });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        allowsEditing: true,
        aspect: [3, 4],
        base64: true,
      });
    }

    const asset = result.assets?.[0];
    if (result.canceled || !asset?.uri) return;

    setLoading(true);
    setLoadingMessage('Subiendo foto...');
    try {
      const uploadedUrl = await uploadImageForSwap(user.uid, asset.uri, asset.base64);
      setLoadingMessage('Reemplazando persona por avatar con Gemini AI...\n(Esto puede tomar 30-60 segundos)');
      const generatedImageUrl = await performAvatarReplacement(uploadedUrl, avatarUrl);
      setLoadingMessage('Guardando resultado...');
      const savedUrl = await saveFaceSwapResult(user.uid, generatedImageUrl);
      setSwapResultUrl(savedUrl);
    } catch (error: any) {
      console.error('Error avatar replacement:', error);
      Alert.alert('Error', 'No se pudo reemplazar el avatar. Intenta de nuevo.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // Save the swapped photo as profile photo + save avatar selections
  const handleUseSwapAsProfile = async () => {
    if (!swapResultUrl || !user?.uid || !userProfile?.id || !generatedAvatarUrl) return;

    setLoading(true);
    setLoadingMessage('Guardando foto de perfil...');
    try {
      // Save avatar to Firebase
      const { avatarUrl } = await saveGeneratedAvatar(
        user.uid,
        userProfile.id,
        generatedAvatarUrl,
        getSelections(),
      );
      // Update profile with the swap result as photoURL
      await usersService.update(userProfile.id, {
        photoURL: swapResultUrl,
      });
      updateLocalProfile({
        photoURL: swapResultUrl,
        aiAvatarPortraitUrl: avatarUrl,
        aiAvatarSelections: getSelections(),
        avatarType: 'custom',
      });
      navigation.goBack();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const STEP_LABELS = ['Base', 'Detalles'];

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2].map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && (
            <View
              style={[
                styles.stepLineSegment,
                { backgroundColor: step >= s ? theme.colors.accent : theme.colors.border },
              ]}
            />
          )}
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor: step >= s ? theme.colors.accent : 'transparent',
                  borderColor: step >= s ? theme.colors.accent : theme.colors.border,
                },
              ]}
            />
            <Text
              style={[
                styles.stepLabel,
                { color: step >= s ? theme.colors.accent : theme.colors.textSecondary },
              ]}
            >
              {STEP_LABELS[i]}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );

  // --- Chip helper ---
  const renderChip = (
    id: string,
    label: string,
    selected: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={id}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.accent : theme.colors.surface,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.chipText,
          { color: selected ? '#FFFFFF' : theme.colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  // --- State B: already has AI avatar ---
  const renderExistingAvatar = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Current AI avatar */}
      <View style={styles.existingAvatarContainer}>
        {userProfile?.aiAvatarPortraitUrl ? (
          <Image
            source={{ uri: userProfile.aiAvatarPortraitUrl }}
            style={styles.existingAvatarImageCircle}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.existingAvatarPlaceholder,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Ionicons name="person-outline" size={scale(80)} color={theme.colors.textSecondary} />
            <Text style={[styles.placeholderLabel, { color: theme.colors.textSecondary }]}>
              Tu avatar IA actual
            </Text>
          </View>
        )}
      </View>

      {/* Face Swap */}
      <View style={[styles.sectionBlock, { marginTop: SPACING.xxl }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Reemplazo de Persona
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
          Toma o sube una foto y se reemplazará la persona con tu avatar usando Gemini AI
        </Text>

        <View style={styles.swapButtonsRow}>
          <TouchableOpacity
            style={[styles.swapButton, { backgroundColor: theme.colors.accent }]}
            activeOpacity={0.8}
            onPress={() => userProfile?.aiAvatarPortraitUrl && pickImageForSwap(true, userProfile.aiAvatarPortraitUrl)}
          >
            <Ionicons name="camera" size={scale(22)} color="#FFFFFF" />
            <Text style={styles.swapButtonText}>Tomar foto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.swapButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
            activeOpacity={0.8}
            onPress={() => userProfile?.aiAvatarPortraitUrl && pickImageForSwap(false, userProfile.aiAvatarPortraitUrl)}
          >
            <Ionicons name="images" size={scale(22)} color={theme.colors.accent} />
            <Text style={[styles.swapButtonText, { color: theme.colors.accent }]}>Galería</Text>
          </TouchableOpacity>
        </View>

        {swapResultUrl && (
          <View style={styles.swapPreviewContainer}>
            <Image source={{ uri: swapResultUrl }} style={styles.swapResultImage} resizeMode="contain" />
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.colors.accent, marginTop: SPACING.md }]}
              onPress={async () => {
                if (!swapResultUrl || !userProfile?.id) return;
                setLoading(true);
                setLoadingMessage('Actualizando foto de perfil...');
                try {
                  await usersService.update(userProfile.id, { photoURL: swapResultUrl });
                  updateLocalProfile({ photoURL: swapResultUrl });
                  setSwapResultUrl(null);
                  Alert.alert('Listo', 'Tu foto de perfil ha sido actualizada.');
                } catch (e: any) {
                  Alert.alert('Error', 'No se pudo actualizar la foto de perfil.');
                } finally {
                  setLoading(false);
                  setLoadingMessage('');
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={scale(18)} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Usar como foto de perfil</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.secondaryButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginTop: SPACING.lg }]}
        activeOpacity={0.7}
        onPress={handleUploadAvatar}
      >
        <Ionicons name="image-outline" size={scale(18)} color={theme.colors.text} />
        <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Subir otra foto como avatar</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginTop: SPACING.sm }]}
        activeOpacity={0.7}
        onPress={handleStartRegenerate}
      >
        <Ionicons name="refresh" size={scale(18)} color={theme.colors.text} />
        <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Regenerar avatar con IA</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // --- State A: no AI avatar yet ---
  const renderCreation = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Disclaimer banner */}
      <View style={[styles.disclaimerBanner, { backgroundColor: theme.colors.accent + '15', borderColor: theme.colors.accent + '30' }]}>
        <Ionicons name="information-circle-outline" size={scale(20)} color={theme.colors.accent} />
        <Text style={[styles.disclaimerText, { color: theme.colors.text }]}>
          Crea un avatar generado por IA o sube una foto para usar como avatar en tu perfil HIDI.
        </Text>
      </View>

      {/* Upload custom photo option */}
      {!generated && (
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginBottom: SPACING.xxl }]}
          activeOpacity={0.7}
          onPress={handleUploadAvatar}
        >
          <Ionicons name="image-outline" size={scale(18)} color={theme.colors.text} />
          <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Subir foto como avatar</Text>
        </TouchableOpacity>
      )}

      {/* Step indicator */}
      {!generated && renderStepIndicator()}

      {!generated ? (
        <>
          {step === 1 && (
            <>
              {/* Gender */}
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Género</Text>
                <View style={styles.chipRow}>
                  {GENDER_OPTIONS.map((opt) =>
                    renderChip(opt.id, opt.label, selectedGender === opt.id, () =>
                      setSelectedGender(opt.id),
                    ),
                  )}
                </View>
              </View>

              {/* Skin tone */}
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Tono de piel</Text>
                <View style={styles.skinToneRow}>
                  {SKIN_TONES.map((tone) => (
                    <TouchableOpacity
                      key={tone.id}
                      style={[
                        styles.skinToneCircle,
                        { backgroundColor: tone.color },
                        selectedSkinTone === tone.id && {
                          borderColor: theme.colors.accent,
                          borderWidth: scale(3),
                        },
                      ]}
                      onPress={() => setSelectedSkinTone(tone.id)}
                      activeOpacity={0.7}
                    />
                  ))}
                </View>
              </View>

              {/* Hair style */}
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Estilo de cabello</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {HAIR_STYLES.map((opt) =>
                    renderChip(opt.id, opt.label, selectedHairStyle === opt.id, () =>
                      setSelectedHairStyle(opt.id),
                    ),
                  )}
                </ScrollView>
              </View>

              {/* Age range */}
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Rango de edad</Text>
                <View style={styles.chipRow}>
                  {AGE_RANGES.map((opt) =>
                    renderChip(opt.id, opt.label, selectedAgeRange === opt.id, () =>
                      setSelectedAgeRange(opt.id),
                    ),
                  )}
                </View>
              </View>

              {/* Next button */}
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: step1Complete ? theme.colors.accent : theme.colors.surface, opacity: step1Complete ? 1 : 0.5 }]}
                onPress={handleNextStep}
                disabled={!step1Complete}
                activeOpacity={0.8}
              >
                <Text style={[styles.primaryButtonText, { color: step1Complete ? '#FFFFFF' : theme.colors.textSecondary }]}>
                  Siguiente
                </Text>
                <Ionicons name="arrow-forward" size={scale(18)} color={step1Complete ? '#FFFFFF' : theme.colors.textSecondary} />
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              {/* Eye color */}
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Color de ojos</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {EYE_COLOR_OPTIONS.map((opt) =>
                    renderChip(opt.id, opt.label, selectedEyeColor === opt.id, () =>
                      setSelectedEyeColor(opt.id),
                    ),
                  )}
                </ScrollView>
              </View>

              {/* Face shape */}
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Forma de cara</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {FACE_SHAPE_OPTIONS.map((opt) =>
                    renderChip(opt.id, opt.label, selectedFaceShape === opt.id, () =>
                      setSelectedFaceShape(opt.id),
                    ),
                  )}
                </ScrollView>
              </View>

              {/* Facial hair (show for male/other) */}
              {selectedGender !== 'female' && (
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Barba / Bigote</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                    {FACIAL_HAIR_OPTIONS.map((opt) =>
                      renderChip(opt.id, opt.label, selectedFacialHair === opt.id, () =>
                        setSelectedFacialHair(opt.id),
                      ),
                    )}
                  </ScrollView>
                </View>
              )}

              {/* Accessories */}
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Accesorios</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {ACCESSORIES_OPTIONS.map((opt) =>
                    renderChip(opt.id, opt.label, selectedAccessories === opt.id, () =>
                      setSelectedAccessories(opt.id),
                    ),
                  )}
                </ScrollView>
              </View>

              {/* Expression */}
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Expresión</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {EXPRESSION_OPTIONS.map((opt) =>
                    renderChip(opt.id, opt.label, selectedExpression === opt.id, () =>
                      setSelectedExpression(opt.id),
                    ),
                  )}
                </ScrollView>
              </View>

              {/* Back link */}
              <TouchableOpacity style={styles.backLink} onPress={() => setStep(1)} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={scale(16)} color={theme.colors.accent} />
                <Text style={[styles.backLinkText, { color: theme.colors.accent }]}>Paso anterior</Text>
              </TouchableOpacity>

              {/* Generate button */}
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: step2Complete ? theme.colors.accent : theme.colors.surface, opacity: step2Complete ? 1 : 0.5 }]}
                onPress={handleGenerate}
                disabled={!step2Complete}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles" size={scale(18)} color={step2Complete ? '#FFFFFF' : theme.colors.textSecondary} />
                <Text style={[styles.primaryButtonText, { color: step2Complete ? '#FFFFFF' : theme.colors.textSecondary }]}>
                  Generar Avatar
                </Text>
              </TouchableOpacity>
            </>
          )}
        </>
      ) : (
        <>
          {!swapResultUrl ? (
            <>
              {/* Avatar preview - single image from Gemini */}
              <View style={styles.previewContainer}>
                {generatedAvatarUrl && (
                  <Image
                    source={{ uri: generatedAvatarUrl }}
                    style={styles.previewImagePortrait}
                    resizeMode="cover"
                  />
                )}
              </View>

              <Text style={[styles.sectionTitle, { color: theme.colors.text, textAlign: 'center', marginBottom: SPACING.sm }]}>
                Avatar generado con Gemini AI
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
                Ahora toma o sube una foto tuya para aplicar el reemplazo de persona con tu avatar
              </Text>

              {/* Take photo / gallery buttons */}
              <View style={styles.swapButtonsRow}>
                <TouchableOpacity
                  style={[styles.swapButton, { backgroundColor: theme.colors.accent }]}
                  activeOpacity={0.8}
                  onPress={() => generatedAvatarUrl && pickImageForSwap(true, generatedAvatarUrl)}
                >
                  <Ionicons name="camera" size={scale(22)} color="#FFFFFF" />
                  <Text style={styles.swapButtonText}>Tomar foto</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.swapButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
                  activeOpacity={0.8}
                  onPress={() => generatedAvatarUrl && pickImageForSwap(false, generatedAvatarUrl)}
                >
                  <Ionicons name="images" size={scale(22)} color={theme.colors.accent} />
                  <Text style={[styles.swapButtonText, { color: theme.colors.accent }]}>Galería</Text>
                </TouchableOpacity>
              </View>

              {/* Skip face swap — use avatar directly */}
              <TouchableOpacity
                style={[styles.skipLink]}
                onPress={handleUseAsAvatar}
                activeOpacity={0.7}
              >
                <Text style={[styles.skipLinkText, { color: theme.colors.textSecondary }]}>
                  Omitir y usar avatar directamente
                </Text>
              </TouchableOpacity>

              {/* Regenerate */}
              <TouchableOpacity
                style={[styles.backLink, { justifyContent: 'center', marginTop: SPACING.md }]}
                onPress={handleRegenerate}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={scale(16)} color={theme.colors.accent} />
                <Text style={[styles.backLinkText, { color: theme.colors.accent }]}>Regenerar avatar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Face swap result */}
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: swapResultUrl }}
                  style={styles.swapResultImage}
                  resizeMode="contain"
                />
              </View>

              <Text style={[styles.sectionTitle, { color: theme.colors.text, textAlign: 'center', marginBottom: SPACING.lg }]}>
                Resultado del reemplazo
              </Text>

              {/* Action buttons */}
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.colors.accent }]}
                onPress={handleUseSwapAsProfile}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={scale(18)} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Usar como foto de perfil</Text>
              </TouchableOpacity>

              <View style={[styles.previewActions, { marginTop: SPACING.md }]}>
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, flex: 1 }]}
                  onPress={() => {
                    setSwapResultUrl(null);
                    if (generatedAvatarUrl) pickImageForSwap(true, generatedAvatarUrl);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera" size={scale(16)} color={theme.colors.text} />
                  <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Otra foto</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, flex: 1 }]}
                  onPress={() => {
                    setSwapResultUrl(null);
                    handleRegenerate();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh" size={scale(16)} color={theme.colors.text} />
                  <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Nuevo avatar</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={scale(24)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Avatar Humano IA</Text>
        <View style={styles.headerRight} />
      </View>

      {hasAiAvatar ? renderExistingAvatar() : renderCreation()}

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingBox, { backgroundColor: theme.colors.surface }]}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              {loadingMessage}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 0.5,
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: scale(40),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.xl,
    paddingBottom: scale(40),
  },
  // Disclaimer
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.xxl,
  },
  disclaimerText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxl,
    position: 'relative',
  },
  stepItem: {
    alignItems: 'center',
    zIndex: 1,
    paddingHorizontal: SPACING.xl,
  },
  stepDot: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    borderWidth: 2,
    marginBottom: SPACING.xs,
  },
  stepLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  stepLine: {
    position: 'absolute',
    top: scale(6),
    left: '35%',
    right: '35%',
    height: scale(2),
    zIndex: 0,
  },
  stepLineSegment: {
    width: scale(30),
    height: scale(2),
    marginTop: scale(-10),
    alignSelf: 'center',
  },
  // Sections
  sectionBlock: {
    marginBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: SPACING.md,
  },
  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  // Skin tones
  skinToneRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  skinToneCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    borderWidth: scale(2),
    borderColor: 'transparent',
  },
  // Buttons
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
  primaryButtonText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
  },
  // Back link
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  backLinkText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  skipLinkText: {
    fontSize: FONT_SIZE.sm,
    textDecorationLine: 'underline',
  },
  // Preview — full body rectangular
  previewContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  previewImage: {
    width: scale(200),
    height: scale(300),
    borderRadius: BORDER_RADIUS.lg,
  },
  previewImagePortrait: {
    width: scale(200),
    height: scale(200),
    borderRadius: scale(100),
  },
  previewPlaceholder: {
    width: scale(200),
    height: scale(300),
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  placeholderLabel: {
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
  },
  previewActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  // State B: existing avatar — full body rectangular
  existingAvatarContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  existingAvatarPlaceholder: {
    width: scale(180),
    height: scale(270),
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  // Existing avatar image
  existingAvatarImage: {
    width: scale(180),
    height: scale(270),
    borderRadius: BORDER_RADIUS.lg,
  },
  existingAvatarImageCircle: {
    width: scale(180),
    height: scale(180),
    borderRadius: scale(90),
  },
  // Section subtitle
  sectionSubtitle: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
    marginBottom: SPACING.lg,
  },
  // Face Swap
  swapButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  swapButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  swapButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: '#FFFFFF',
  },
  swapPreviewContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    position: 'relative',
  },
  swapPreviewImage: {
    width: scale(280),
    height: scale(280),
    borderRadius: BORDER_RADIUS.lg,
  },
  swapResultImage: {
    width: scale(260),
    height: scale(400),
    borderRadius: BORDER_RADIUS.lg,
  },
  swapPreviewClose: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
  },
  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingBox: {
    padding: SPACING.xxl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    textAlign: 'center',
  },
});

export default AiAvatarScreen;
