import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useResponsive } from '../hooks/useResponsive';
import AvatarPicker from '../components/avatars/AvatarPicker';
import CommunitySelector from '../components/CommunitySelector';
import { uploadProfileImageFromUri } from '../services/storageService';
import { scale } from '../utils/scale';

const { width: screenWidth } = Dimensions.get('window');

const OnboardingScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { updateProfile } = useUserProfile();
  const { isDesktop } = useResponsive();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedAvatarType, setSelectedAvatarType] = useState<'predefined' | 'custom'>('predefined');
  const [selectedAvatarId, setSelectedAvatarId] = useState('male');
  const [customAvatarUri, setCustomAvatarUri] = useState<string | null>(null);
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // Listener para detectar cuando el teclado se cierra y volver al inicio
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        // Cuando el teclado se cierra, hacer scroll hacia arriba
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
    );

    return () => {
      keyboardDidHideListener.remove();
    };
  }, []);

  const maxDisplayNameLength = 30;
  const maxBioLength = 150;

  const handleAvatarSelect = (avatarData: {
    type: 'predefined' | 'custom';
    uri?: string;
    avatarId?: string;
  }) => {
    setSelectedAvatarType(avatarData.type);
    if (avatarData.type === 'predefined' && avatarData.avatarId) {
      setSelectedAvatarId(avatarData.avatarId);
      setCustomAvatarUri(null);
    } else if (avatarData.type === 'custom' && avatarData.uri) {
      setCustomAvatarUri(avatarData.uri);
      setSelectedAvatarId('');
    }
  };

  const handleContinue = async () => {
    if (step === 1) {
      // Validar alias
      if (!displayName.trim()) {
        Alert.alert('Alias requerido', 'Por favor ingresa un alias para continuar');
        return;
      }
      if (displayName.trim().length < 3) {
        Alert.alert('Alias muy corto', 'Tu alias debe tener al menos 3 caracteres');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Ir al paso 3 (selección de comunidades)
      setStep(3);
    } else if (step === 3) {
      // Validar comunidades
      if (selectedCommunities.length < 1) {
        Alert.alert('Comunidades requeridas', 'Por favor selecciona al menos una comunidad');
        return;
      }

      // Guardar perfil completo
      if (!user) return;

      setUploading(true);
      try {
        let updateData: any = {
          displayName: displayName.trim(),
          bio: bio.trim(),
          avatarType: selectedAvatarType,
          joinedCommunities: selectedCommunities,
          primaryCommunity: selectedCommunities[0],
          hasCompletedCommunityOnboarding: true,
        };

        // Si es avatar personalizado, subir imagen
        if (selectedAvatarType === 'custom' && customAvatarUri) {
          const response = await fetch(customAvatarUri);
          const blob = await response.blob();
          const photoURL = await uploadProfileImageFromUri(customAvatarUri, user.uid);
          updateData.photoURL = photoURL;
        } else {
          // Avatar predefinido
          updateData.avatarId = selectedAvatarId;
        }

        await updateProfile(updateData);

        console.log('✅ Onboarding completado! Perfil actualizado:', updateData);

        // Marcar como completado
        setCompleted(true);
        setUploading(false);

        // Esperar un momento para que el estado se propague
        // El MainStackNavigator detectará el cambio y mostrará la app automáticamente
        console.log('⏳ Esperando que MainStackNavigator detecte el cambio...');
      } catch (error) {
        console.error('Error saving profile:', error);
        Alert.alert('Error', 'No se pudo guardar tu perfil. Intenta de nuevo.');
        setUploading(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      <View style={styles.stepIndicator}>
        <View style={[
          styles.stepDot,
          { backgroundColor: step >= 1 ? theme.colors.accent : theme.colors.border }
        ]} />
        <View style={[
          styles.stepLine,
          { backgroundColor: step >= 2 ? theme.colors.accent : theme.colors.border }
        ]} />
        <View style={[
          styles.stepDot,
          { backgroundColor: step >= 2 ? theme.colors.accent : theme.colors.border }
        ]} />
        <View style={[
          styles.stepLine,
          { backgroundColor: step >= 3 ? theme.colors.accent : theme.colors.border }
        ]} />
        <View style={[
          styles.stepDot,
          { backgroundColor: step >= 3 ? theme.colors.accent : theme.colors.border }
        ]} />
      </View>
      <Text style={[styles.stepText, { color: theme.colors.textSecondary }]}>
        Paso {step} de 3
      </Text>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.accent}20` }]}>
          <Ionicons name="shield-checkmark" size={40} color={theme.colors.accent} />
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Bienvenido a HideTok
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          La red social donde puedes ser tú mismo, completamente anónimo
        </Text>
      </View>

      {/* Features */}
      <View style={styles.featuresContainer}>
        <View style={styles.feature}>
          <View style={[styles.featureIcon, { backgroundColor: `${theme.colors.accent}15` }]}>
            <Ionicons name="person-outline" size={18} color={theme.colors.accent} />
          </View>
          <Text style={[styles.featureText, { color: theme.colors.text }]}>
            Comparte sin revelar tu identidad
          </Text>
        </View>
        <View style={styles.feature}>
          <View style={[styles.featureIcon, { backgroundColor: `${theme.colors.accent}15` }]}>
            <Ionicons name="lock-closed-outline" size={18} color={theme.colors.accent} />
          </View>
          <Text style={[styles.featureText, { color: theme.colors.text }]}>
            Tus datos están protegidos
          </Text>
        </View>
        <View style={styles.feature}>
          <View style={[styles.featureIcon, { backgroundColor: `${theme.colors.accent}15` }]}>
            <Ionicons name="chatbubbles-outline" size={18} color={theme.colors.accent} />
          </View>
          <Text style={[styles.featureText, { color: theme.colors.text }]}>
            Conversaciones auténticas
          </Text>
        </View>
      </View>

      {/* Input Section */}
      <View style={styles.inputSection}>
        <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
          Elige tu alias
        </Text>
        <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>
          Este será tu nombre en HideTok. No uses tu nombre real.
        </Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }]}
          placeholder="Ej: Usuario123, Anónimo99..."
          placeholderTextColor={theme.colors.textSecondary}
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={maxDisplayNameLength}
          onFocus={() => {
            // Scroll hacia abajo cuando el input recibe focus
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }}
        />
        <Text style={[styles.charCounter, { color: theme.colors.textSecondary }]}>
          {displayName.length}/{maxDisplayNameLength}
        </Text>
      </View>

      {/* Espacio extra cuando el teclado está abierto */}
      <View style={{ height: scale(100) }} />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      {/* Header */}
      <View style={styles.step2Header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Personaliza tu perfil
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Elige un avatar y agrega una descripción (opcional)
        </Text>
      </View>

      {/* Avatar Selection */}
      <View style={styles.avatarSection}>
        <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
          Tu avatar
        </Text>
        <View style={styles.avatarPickerContainer}>
          <AvatarPicker
            currentAvatar={customAvatarUri || undefined}
            currentAvatarType={selectedAvatarType}
            currentAvatarId={selectedAvatarId}
            onAvatarSelect={handleAvatarSelect}
            size={100}
          />
        </View>
        <Text style={[styles.avatarHint, { color: theme.colors.textSecondary }]}>
          Toca para elegir un avatar predefinido o subir tu propia imagen
        </Text>
      </View>

      {/* Bio Section */}
      <View style={styles.bioSection}>
        <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
          Descripción (opcional)
        </Text>
        <TextInput
          style={[styles.bioInput, {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }]}
          placeholder="Cuéntanos algo sobre ti... (opcional)"
          placeholderTextColor={theme.colors.textSecondary}
          value={bio}
          onChangeText={setBio}
          maxLength={maxBioLength}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          scrollEnabled={false}
          onFocus={() => {
            // Scroll hacia abajo cuando el input recibe focus
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }}
        />
        <Text style={[styles.charCounter, { color: theme.colors.textSecondary }]}>
          {bio.length}/{maxBioLength}
        </Text>
      </View>

      {/* Espacio extra cuando el teclado está abierto */}
      <View style={{ height: scale(100) }} />
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      {/* Header */}
      <View style={styles.step3Header}>
        <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.accent}20` }]}>
          <Ionicons name="people" size={40} color={theme.colors.accent} />
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Elige tus comunidades
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Selecciona las comunidades que te interesan. Podrás ver contenido y publicar en ellas.
        </Text>
      </View>

      {/* Community Selector */}
      <CommunitySelector
        selectedCommunities={selectedCommunities}
        onSelectionChange={setSelectedCommunities}
        minSelection={1}
        maxSelection={10}
        showWarnings={true}
      />
    </View>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return renderStep1();
    }
  };

  const getButtonText = () => {
    if (step === 3) return 'Completar';
    return 'Continuar';
  };

  const getButtonIcon = () => {
    if (step === 3) return 'checkmark';
    return 'arrow-forward';
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {isDesktop ? (
        // Desktop Layout - Floating Content
        <View style={styles.desktopWrapper}>
          <ScrollView
            contentContainerStyle={styles.desktopScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Step Indicator */}
            {renderStepIndicator()}

            {/* Content */}
            {renderCurrentStep()}

            {/* Footer Buttons - Inside scroll for desktop */}
            <View style={styles.desktopFooter}>
              {step > 1 && (
                <TouchableOpacity
                  style={[styles.backButton, { borderColor: theme.colors.border }]}
                  onPress={handleBack}
                  disabled={uploading}
                >
                  <Ionicons name="arrow-back" size={18} color={theme.colors.text} />
                  <Text style={[styles.backButtonText, { color: theme.colors.text }]}>
                    Atrás
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.continueButton, {
                  backgroundColor: completed ? theme.colors.success || '#10b981' : theme.colors.accent,
                }]}
                onPress={handleContinue}
                disabled={uploading || completed}
              >
                {uploading ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={styles.continueButtonText}>Guardando...</Text>
                  </>
                ) : completed ? (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="white" />
                    <Text style={styles.continueButtonText}>¡Completado!</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.continueButtonText}>
                      {getButtonText()}
                    </Text>
                    <Ionicons name={getButtonIcon()} size={18} color="white" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      ) : (
        // Mobile Layout - Full Screen
        <>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[styles.scrollContent, {
              paddingTop: insets.top + scale(16),
            }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* Step Indicator */}
            {renderStepIndicator()}

            {/* Content */}
            {renderCurrentStep()}
          </ScrollView>

          {/* Footer Buttons */}
          <View style={[styles.footer, {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
            paddingBottom: Math.max(insets.bottom, scale(16)) + scale(8),
          }]}>
            {step > 1 && (
              <TouchableOpacity
                style={[styles.backButton, { borderColor: theme.colors.border }]}
                onPress={handleBack}
                disabled={uploading}
              >
                <Ionicons name="arrow-back" size={scale(20)} color={theme.colors.text} />
                <Text style={[styles.backButtonText, { color: theme.colors.text }]}>
                  Atrás
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.continueButton, {
                backgroundColor: completed ? theme.colors.success || '#10b981' : theme.colors.accent,
              }]}
              onPress={handleContinue}
              disabled={uploading || completed}
            >
              {uploading ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.continueButtonText}>Guardando...</Text>
                </>
              ) : completed ? (
                <>
                  <Ionicons name="checkmark-circle" size={scale(20)} color="white" />
                  <Text style={styles.continueButtonText}>¡Completado!</Text>
                </>
              ) : (
                <>
                  <Text style={styles.continueButtonText}>
                    {getButtonText()}
                  </Text>
                  <Ionicons name={getButtonIcon()} size={scale(20)} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Desktop Styles
  desktopWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scale(20),
    paddingHorizontal: scale(20),
  },
  desktopScrollContent: {
    flexGrow: 1,
    maxWidth: scale(480),
    width: '100%',
    paddingBottom: scale(20),
  },
  desktopFooter: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    paddingTop: scale(24),
    gap: scale(12),
  },
  // Mobile Styles
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'android' ? scale(200) : scale(120),
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  stepIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: scale(16),
    paddingHorizontal: 0,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(6),
  },
  stepDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
  },
  stepLine: {
    width: scale(50),
    height: scale(2),
    marginHorizontal: scale(6),
  },
  stepText: {
    fontSize: scale(11),
    fontWeight: '500',
  },
  stepContent: {
    paddingHorizontal: scale(20),
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: scale(24),
  },
  iconContainer: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  title: {
    fontSize: scale(24),
    fontWeight: 'bold',
    marginBottom: scale(6),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: scale(14),
    lineHeight: scale(20),
    textAlign: 'center',
    paddingHorizontal: scale(12),
  },
  featuresContainer: {
    marginBottom: scale(24),
    gap: scale(12),
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  featureIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: scale(14),
    flex: 1,
  },
  inputSection: {
    marginBottom: scale(20),
  },
  inputLabel: {
    fontSize: scale(16),
    fontWeight: '600',
    marginBottom: scale(6),
  },
  inputHint: {
    fontSize: scale(13),
    marginBottom: scale(10),
    lineHeight: scale(18),
  },
  input: {
    borderWidth: scale(1),
    borderRadius: scale(12),
    padding: scale(14),
    fontSize: scale(15),
  },
  charCounter: {
    fontSize: scale(12),
    textAlign: 'right',
    marginTop: scale(4),
  },
  step2Header: {
    marginBottom: scale(24),
    alignItems: 'center',
  },
  step3Header: {
    marginBottom: scale(20),
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: scale(24),
  },
  sectionLabel: {
    fontSize: scale(15),
    fontWeight: '600',
    marginBottom: scale(12),
  },
  avatarPickerContainer: {
    marginBottom: scale(10),
  },
  avatarHint: {
    fontSize: scale(12),
    textAlign: 'center',
    paddingHorizontal: scale(24),
  },
  bioSection: {
    marginBottom: scale(20),
  },
  bioInput: {
    borderWidth: scale(1),
    borderRadius: scale(12),
    padding: scale(14),
    fontSize: scale(14),
    minHeight: scale(90),
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: scale(20),
    paddingTop: scale(16),
    gap: scale(12),
    borderTopWidth: scale(1),
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(14),
    paddingHorizontal: scale(18),
    borderRadius: scale(12),
    borderWidth: scale(1),
    gap: scale(6),
  },
  backButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(14),
    paddingHorizontal: scale(20),
    borderRadius: scale(12),
    gap: scale(6),
  },
  continueButtonText: {
    color: 'white',
    fontSize: scale(15),
    fontWeight: '600',
  },
});

export default OnboardingScreen;
