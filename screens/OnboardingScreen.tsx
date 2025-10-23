import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useResponsive } from '../hooks/useResponsive';
import AvatarPicker from '../components/avatars/AvatarPicker';
import { uploadProfileImageFromUri } from '../services/storageService';

const { width: screenWidth } = Dimensions.get('window');

const OnboardingScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { updateProfile } = useUserProfile();
  const { isDesktop } = useResponsive();

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedAvatarType, setSelectedAvatarType] = useState<'predefined' | 'custom'>('predefined');
  const [selectedAvatarId, setSelectedAvatarId] = useState('male');
  const [customAvatarUri, setCustomAvatarUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [completed, setCompleted] = useState(false);

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
      // Guardar perfil
      if (!user) return;

      setUploading(true);
      try {
        let updateData: any = {
          displayName: displayName.trim(),
          bio: bio.trim(),
          avatarType: selectedAvatarType,
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
      </View>
      <Text style={[styles.stepText, { color: theme.colors.textSecondary }]}>
        Paso {step} de 2
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
          autoFocus
        />
        <Text style={[styles.charCounter, { color: theme.colors.textSecondary }]}>
          {displayName.length}/{maxDisplayNameLength}
        </Text>
      </View>
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
        />
        <Text style={[styles.charCounter, { color: theme.colors.textSecondary }]}>
          {bio.length}/{maxBioLength}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
            {step === 1 ? renderStep1() : renderStep2()}

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
                  flex: step === 1 ? 1 : undefined,
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
                      {step === 1 ? 'Continuar' : 'Completar'}
                    </Text>
                    <Ionicons name={step === 1 ? "arrow-forward" : "checkmark"} size={18} color="white" />
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
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Step Indicator */}
            {renderStepIndicator()}

            {/* Content */}
            {step === 1 ? renderStep1() : renderStep2()}
          </ScrollView>

          {/* Footer Buttons */}
          <View style={[styles.footer, {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
          }]}>
            {step > 1 && (
              <TouchableOpacity
                style={[styles.backButton, { borderColor: theme.colors.border }]}
                onPress={handleBack}
                disabled={uploading}
              >
                <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
                <Text style={[styles.backButtonText, { color: theme.colors.text }]}>
                  Atrás
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.continueButton, {
                backgroundColor: completed ? theme.colors.success || '#10b981' : theme.colors.accent,
                flex: step === 1 ? 1 : undefined,
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
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.continueButtonText}>¡Completado!</Text>
                </>
              ) : (
                <>
                  <Text style={styles.continueButtonText}>
                    {step === 1 ? 'Continuar' : 'Completar'}
                  </Text>
                  <Ionicons name={step === 1 ? "arrow-forward" : "checkmark"} size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
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
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  desktopScrollContent: {
    flexGrow: 1,
    maxWidth: 480,
    width: '100%',
    paddingBottom: 20,
  },
  desktopFooter: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    paddingTop: 24,
    gap: 12,
  },
  // Mobile Styles
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  stepIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepLine: {
    width: 50,
    height: 2,
    marginHorizontal: 6,
  },
  stepText: {
    fontSize: 11,
    fontWeight: '500',
  },
  stepContent: {
    paddingHorizontal: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  featuresContainer: {
    marginBottom: 24,
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputHint: {
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
  },
  charCounter: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  step2Header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  avatarPickerContainer: {
    marginBottom: 10,
  },
  avatarHint: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  bioSection: {
    marginBottom: 20,
  },
  bioInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    minHeight: 90,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 6,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default OnboardingScreen;
