import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { usersService } from '../services/firestoreService';
import { uploadProfileImageFromUri } from '../services/storageService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import AvatarPicker, { isDiceBearUrl } from '../components/avatars/AvatarPicker';

const HidiCreationScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { realProfile, setHidiProfile } = useUserProfile();
  const navigation = useNavigation();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedAvatarType, setSelectedAvatarType] = useState<'predefined' | 'custom'>('predefined');
  const [selectedAvatarId, setSelectedAvatarId] = useState('ghost');
  const [customAvatarUri, setCustomAvatarUri] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const canCreate = displayName.trim().length >= 3 && !isCreating;

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

  const handleCreate = async () => {
    if (!canCreate || !user || !realProfile?.id) return;

    setIsCreating(true);
    try {
      console.log('🎭 Creando perfil HIDI para:', user.uid);

      const hidiUid = `hidi_${user.uid}`;
      let photoURL: string | undefined;
      let photoURLThumbnail: string | undefined;

      // Si es avatar personalizado, subir imagen o usar DiceBear URL directo
      if (selectedAvatarType === 'custom' && customAvatarUri) {
        if (isDiceBearUrl(customAvatarUri)) {
          photoURL = customAvatarUri;
        } else {
          const result = await uploadProfileImageFromUri(customAvatarUri, hidiUid);
          photoURL = result.fullSize;
          photoURLThumbnail = result.thumbnail;
        }
      }

      // Crear perfil HIDI
      const hidiDocId = await usersService.createHidiProfile(user.uid, {
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarType: selectedAvatarType,
        avatarId: selectedAvatarType === 'predefined' ? selectedAvatarId : undefined,
        photoURL,
      });

      // Si hay thumbnail, actualizar el doc
      if (photoURLThumbnail) {
        await usersService.update(hidiDocId, { photoURLThumbnail });
      }

      console.log('✅ Perfil HIDI creado con docId:', hidiDocId);

      // Actualizar perfil real con linkedAccountId
      await usersService.update(realProfile.id, {
        linkedAccountId: hidiUid,
        profileType: 'real',
      });

      // Obtener el perfil HIDI completo y establecerlo en el context
      const hidiProfile = await usersService.getHidiProfile(user.uid);
      if (hidiProfile) {
        setHidiProfile(hidiProfile);
      }

      Alert.alert(
        'Perfil HIDI creado',
        'Tu identidad anónima está lista. Puedes cambiar entre perfiles desde el header.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('❌ Error creando perfil HIDI:', error);
      Alert.alert('Error', error?.message || 'No se pudo crear el perfil HIDI');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={scale(24)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Crear Perfil HIDI</Text>
        <View style={{ width: scale(24) }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
        {/* Disclaimer */}
        <View style={[styles.disclaimer, { backgroundColor: theme.colors.accent + '15' }]}>
          <Ionicons name="shield-checkmark" size={scale(24)} color={theme.colors.accent} />
          <Text style={[styles.disclaimerText, { color: theme.colors.text }]}>
            Este perfil es independiente de tu identidad real. Las publicaciones y acciones que hagas con HIDI no estarán vinculadas a tu perfil principal.
          </Text>
        </View>

        {/* Avatar Selection */}
        <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Foto de perfil</Text>
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
          Toca para elegir una foto o avatar predefinido
        </Text>

        {/* Display Name */}
        <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Nombre anónimo</Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }]}
          placeholder="Ej: SombraOscura, Anon123..."
          placeholderTextColor={theme.colors.textSecondary}
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={20}
          autoCapitalize="none"
        />
        <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>
          {displayName.length}/20 - Mínimo 3 caracteres
        </Text>

        {/* Bio */}
        <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Bio (opcional)</Text>
        <TextInput
          style={[styles.input, styles.bioInput, {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }]}
          placeholder="Describe tu alter ego..."
          placeholderTextColor={theme.colors.textSecondary}
          value={bio}
          onChangeText={setBio}
          maxLength={100}
          multiline
          onFocus={() => {
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 150);
          }}
        />
        <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>
          {bio.length}/100 caracteres
        </Text>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, {
            backgroundColor: theme.colors.accent,
            opacity: canCreate ? 1 : 0.4,
          }]}
          onPress={handleCreate}
          disabled={!canCreate}
          activeOpacity={0.8}
        >
          {isCreating ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="eye-off" size={scale(20)} color="white" />
              <Text style={styles.createButtonText}>Crear Perfil HIDI</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Espacio extra para que el teclado no tape el contenido */}
        <View style={{ height: scale(120) }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: scale(0.5),
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xl * 2,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  disclaimerText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  sectionLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: SPACING.md,
  },
  avatarPickerContainer: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatarHint: {
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.base,
    marginBottom: SPACING.xs,
  },
  bioInput: {
    minHeight: scale(80),
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: FONT_SIZE.xs,
    textAlign: 'right',
    marginBottom: SPACING.xl,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  createButtonText: {
    color: 'white',
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
});

export default HidiCreationScreen;
