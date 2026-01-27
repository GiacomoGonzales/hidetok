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
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useResponsive } from '../hooks/useResponsive';
import AvatarPicker from '../components/avatars/AvatarPicker';
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
  const [realName, setRealName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateModalType, setDateModalType] = useState<'day' | 'month' | 'year'>('day');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | null>(null);
  const [bio, setBio] = useState('');
  const [selectedAvatarType, setSelectedAvatarType] = useState<'predefined' | 'custom'>('predefined');
  const [selectedAvatarId, setSelectedAvatarId] = useState('male');
  const [customAvatarUri, setCustomAvatarUri] = useState<string | null>(null);
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

  const maxRealNameLength = 50;
  const maxDisplayNameLength = 30;
  const maxBioLength = 150;

  // Año máximo: hace 13 años (edad mínima)
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear - 13;
  const minYear = currentYear - 120;

  const months = [
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

  const days = Array.from({ length: 31 }, (_, i) => ({
    value: (i + 1).toString().padStart(2, '0'),
    label: (i + 1).toString(),
  }));

  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => ({
    value: (maxYear - i).toString(),
    label: (maxYear - i).toString(),
  }));

  const getMonthLabel = (value: string) => {
    const month = months.find(m => m.value === value);
    return month ? month.label : '';
  };

  const openDateModal = (type: 'day' | 'month' | 'year') => {
    setDateModalType(type);
    setShowDateModal(true);
  };

  const selectDateValue = (value: string) => {
    if (dateModalType === 'day') {
      setBirthDay(value);
    } else if (dateModalType === 'month') {
      setBirthMonth(value);
    } else {
      setBirthYear(value);
    }
    setShowDateModal(false);
  };

  const getDateModalData = () => {
    switch (dateModalType) {
      case 'day':
        return days;
      case 'month':
        return months;
      case 'year':
        return years;
    }
  };

  const getDateModalTitle = () => {
    switch (dateModalType) {
      case 'day':
        return 'Día';
      case 'month':
        return 'Mes';
      case 'year':
        return 'Año';
    }
  };

  const getBirthDateISO = () => {
    if (birthDay && birthMonth && birthYear) {
      return `${birthYear}-${birthMonth}-${birthDay}`;
    }
    return null;
  };

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
      // Validar nombre real
      if (!realName.trim()) {
        Alert.alert('Nombre requerido', 'Por favor ingresa tu nombre para continuar');
        return;
      }
      if (realName.trim().length < 2) {
        Alert.alert('Nombre muy corto', 'Tu nombre debe tener al menos 2 caracteres');
        return;
      }
      // Validar alias
      if (!displayName.trim()) {
        Alert.alert('Alias requerido', 'Por favor ingresa un alias para continuar');
        return;
      }
      if (displayName.trim().length < 3) {
        Alert.alert('Alias muy corto', 'Tu alias debe tener al menos 3 caracteres');
        return;
      }
      // Validar fecha de nacimiento
      if (!birthDay || !birthMonth || !birthYear) {
        Alert.alert('Fecha requerida', 'Por favor ingresa tu fecha de nacimiento completa');
        return;
      }
      // Validar género
      if (!gender) {
        Alert.alert('Género requerido', 'Por favor selecciona tu género');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Guardar perfil completo
      if (!user) return;

      setUploading(true);
      try {
        let updateData: any = {
          realName: realName.trim(),
          displayName: displayName.trim(),
          birthDate: getBirthDateISO(),
          gender: gender,
          bio: bio.trim(),
          avatarType: selectedAvatarType,
          hasCompletedCommunityOnboarding: true,
        };

        // Si es avatar personalizado, subir imagen
        if (selectedAvatarType === 'custom' && customAvatarUri) {
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

      {/* Nombre Real (Privado) */}
      <View style={styles.inputSection}>
        <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
          Tu nombre
        </Text>
        <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>
          Este nombre es privado y no se mostrará a otros usuarios.
        </Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }]}
          placeholder="Tu nombre real"
          placeholderTextColor={theme.colors.textSecondary}
          value={realName}
          onChangeText={setRealName}
          maxLength={maxRealNameLength}
          autoCapitalize="words"
        />
      </View>

      {/* Alias (Público) */}
      <View style={styles.inputSection}>
        <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
          Elige tu alias
        </Text>
        <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>
          Este será tu nombre público en HideTok. No uses tu nombre real.
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
        />
        <Text style={[styles.charCounter, { color: theme.colors.textSecondary }]}>
          {displayName.length}/{maxDisplayNameLength}
        </Text>
      </View>

      {/* Fecha de Nacimiento */}
      <View style={styles.inputSection}>
        <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
          Fecha de nacimiento
        </Text>
        <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>
          Debes tener al menos 13 años para usar HideTok.
        </Text>
        <View style={styles.dateSelectorsRow}>
          {/* Día */}
          <TouchableOpacity
            style={[styles.dateSelector, {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }]}
            onPress={() => openDateModal('day')}
          >
            <Text style={[
              styles.dateSelectorText,
              { color: birthDay ? theme.colors.text : theme.colors.textSecondary }
            ]}>
              {birthDay || 'Día'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {/* Mes */}
          <TouchableOpacity
            style={[styles.dateSelector, styles.dateSelectorMonth, {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }]}
            onPress={() => openDateModal('month')}
          >
            <Text style={[
              styles.dateSelectorText,
              { color: birthMonth ? theme.colors.text : theme.colors.textSecondary }
            ]}>
              {birthMonth ? getMonthLabel(birthMonth) : 'Mes'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {/* Año */}
          <TouchableOpacity
            style={[styles.dateSelector, {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }]}
            onPress={() => openDateModal('year')}
          >
            <Text style={[
              styles.dateSelectorText,
              { color: birthYear ? theme.colors.text : theme.colors.textSecondary }
            ]}>
              {birthYear || 'Año'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Género */}
      <View style={styles.inputSection}>
        <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
          Género
        </Text>
        <View style={styles.genderContainer}>
          <TouchableOpacity
            style={[
              styles.genderOption,
              {
                backgroundColor: gender === 'male' ? theme.colors.accent : theme.colors.surface,
                borderColor: gender === 'male' ? theme.colors.accent : theme.colors.border,
              }
            ]}
            onPress={() => setGender('male')}
          >
            <Ionicons
              name="male"
              size={20}
              color={gender === 'male' ? 'white' : theme.colors.text}
            />
            <Text style={[
              styles.genderText,
              { color: gender === 'male' ? 'white' : theme.colors.text }
            ]}>
              Hombre
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.genderOption,
              {
                backgroundColor: gender === 'female' ? theme.colors.accent : theme.colors.surface,
                borderColor: gender === 'female' ? theme.colors.accent : theme.colors.border,
              }
            ]}
            onPress={() => setGender('female')}
          >
            <Ionicons
              name="female"
              size={20}
              color={gender === 'female' ? 'white' : theme.colors.text}
            />
            <Text style={[
              styles.genderText,
              { color: gender === 'female' ? 'white' : theme.colors.text }
            ]}>
              Mujer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.genderOption,
              {
                backgroundColor: gender === 'other' ? theme.colors.accent : theme.colors.surface,
                borderColor: gender === 'other' ? theme.colors.accent : theme.colors.border,
              }
            ]}
            onPress={() => setGender('other')}
          >
            <Ionicons
              name="person"
              size={20}
              color={gender === 'other' ? 'white' : theme.colors.text}
            />
            <Text style={[
              styles.genderText,
              { color: gender === 'other' ? 'white' : theme.colors.text }
            ]}>
              Otro
            </Text>
          </TouchableOpacity>
        </View>
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

  const renderCurrentStep = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      default:
        return renderStep1();
    }
  };

  const getButtonText = () => {
    if (step === 2) return 'Completar';
    return 'Continuar';
  };

  const getButtonIcon = () => {
    if (step === 2) return 'checkmark';
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

      {/* Modal para selección de fecha */}
      <Modal
        visible={showDateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateModal(false)}
      >
        <TouchableOpacity
          style={styles.dateModalOverlay}
          activeOpacity={1}
          onPress={() => setShowDateModal(false)}
        >
          <View style={[styles.dateModalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.dateModalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.dateModalTitle, { color: theme.colors.text }]}>
                {getDateModalTitle()}
              </Text>
              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={getDateModalData()}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dateModalItem,
                    { borderBottomColor: theme.colors.border }
                  ]}
                  onPress={() => selectDateValue(item.value)}
                >
                  <Text style={[styles.dateModalItemText, { color: theme.colors.text }]}>
                    {item.label}
                  </Text>
                  {((dateModalType === 'day' && birthDay === item.value) ||
                    (dateModalType === 'month' && birthMonth === item.value) ||
                    (dateModalType === 'year' && birthYear === item.value)) && (
                    <Ionicons name="checkmark" size={20} color={theme.colors.accent} />
                  )}
                </TouchableOpacity>
              )}
              style={styles.dateModalList}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
  dateSelectorsRow: {
    flexDirection: 'row',
    gap: scale(10),
  },
  dateSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(14),
    paddingHorizontal: scale(12),
    borderRadius: scale(12),
    borderWidth: scale(1),
  },
  dateSelectorMonth: {
    flex: 1.5,
  },
  dateSelectorText: {
    fontSize: scale(14),
  },
  dateModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dateModalContent: {
    borderTopLeftRadius: scale(16),
    borderTopRightRadius: scale(16),
    maxHeight: '60%',
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    borderBottomWidth: 1,
  },
  dateModalTitle: {
    fontSize: scale(16),
    fontWeight: '600',
  },
  dateModalList: {
    paddingBottom: scale(20),
  },
  dateModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    borderBottomWidth: 0.5,
  },
  dateModalItemText: {
    fontSize: scale(15),
  },
  genderContainer: {
    flexDirection: 'row',
    gap: scale(10),
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(12),
    borderRadius: scale(12),
    borderWidth: scale(1),
    gap: scale(6),
  },
  genderText: {
    fontSize: scale(14),
    fontWeight: '500',
  },
  step2Header: {
    marginBottom: scale(24),
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
