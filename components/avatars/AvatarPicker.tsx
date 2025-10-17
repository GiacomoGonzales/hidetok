import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { predefinedAvatars } from './AvatarSVGs';

const { width: screenWidth } = Dimensions.get('window');

interface AvatarPickerProps {
  currentAvatar?: string;
  currentAvatarType?: 'predefined' | 'custom';
  currentAvatarId?: string;
  onAvatarSelect: (avatarData: {
    type: 'predefined' | 'custom';
    uri?: string;
    avatarId?: string;
  }) => void;
  size?: number;
}

const AvatarPicker: React.FC<AvatarPickerProps> = ({
  currentAvatar,
  currentAvatarType = 'predefined',
  currentAvatarId = 'male',
  onAvatarSelect,
  size = 80,
}) => {
  const { theme } = useTheme();
  const { isDesktop } = useResponsive();
  const [showPicker, setShowPicker] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handlePredefinedAvatarSelect = (avatarId: string) => {
    onAvatarSelect({
      type: 'predefined',
      avatarId,
    });
    setShowPicker(false);
  };

  const pickImageFromGallery = async () => {
    try {
      // En web, usar input file de HTML
      if (Platform.OS === 'web') {
        return new Promise<void>((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';

          input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (file) {
              setUploading(true);
              const uri = URL.createObjectURL(file);
              onAvatarSelect({
                type: 'custom',
                uri,
              });
              setUploading(false);
              setShowPicker(false);
            }
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
          'Necesitamos acceso a tu galería para seleccionar una foto'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        onAvatarSelect({
          type: 'custom',
          uri: result.assets[0].uri,
        });
        setUploading(false);
        setShowPicker(false);
      }
    } catch (error) {
      setUploading(false);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Permisos necesarios',
          'Necesitamos acceso a tu cámara para tomar una foto'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        onAvatarSelect({
          type: 'custom',
          uri: result.assets[0].uri,
        });
        setUploading(false);
        setShowPicker(false);
      }
    } catch (error) {
      setUploading(false);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const renderCurrentAvatar = () => {
    if (currentAvatarType === 'custom' && currentAvatar) {
      return (
        <Image
          source={{ uri: currentAvatar }}
          style={[styles.avatar, { width: size, height: size }]}
        />
      );
    }

    const selectedAvatar = predefinedAvatars.find(avatar => avatar.id === currentAvatarId);
    if (selectedAvatar) {
      const AvatarComponent = selectedAvatar.component;
      return (
        <AvatarComponent
          size={size}
          backgroundColor={selectedAvatar.color}
        />
      );
    }

    // Avatar por defecto
    return (
      <View style={[
        styles.defaultAvatar,
        { 
          width: size, 
          height: size, 
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        }
      ]}>
        <Ionicons name="person" size={size * 0.5} color={theme.colors.textSecondary} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.avatarContainer}
        onPress={() => setShowPicker(true)}
      >
        {renderCurrentAvatar()}
        <View style={[styles.editBadge, { backgroundColor: theme.colors.accent }]}>
          <Ionicons name="camera" size={12} color="white" />
        </View>
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType={isDesktop ? "fade" : "slide"}
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={[
          styles.modalOverlay,
          isDesktop && styles.desktopModalOverlay
        ]}>
          <View style={[
            styles.modalContent,
            { backgroundColor: theme.colors.card },
            isDesktop && styles.desktopModalContent,
            isDesktop && { borderColor: theme.colors.border }
          ]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Seleccionar Avatar
              </Text>
              <View style={{ width: 60 }} />
            </View>

            <ScrollView
              style={[styles.modalBody, isDesktop && styles.desktopModalBody]}
              showsVerticalScrollIndicator={false}
            >
              {/* Opciones de cámara */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Foto personalizada
                </Text>

                <View style={styles.photoOptions}>
                  {Platform.OS !== 'web' && (
                    <TouchableOpacity
                      style={[styles.photoOption, { backgroundColor: theme.colors.surface }]}
                      onPress={takePhoto}
                      disabled={uploading}
                    >
                      <Ionicons name="camera" size={24} color={theme.colors.accent} />
                      <Text style={[styles.photoOptionText, { color: theme.colors.text }]}>
                        Tomar foto
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.photoOption, {
                      backgroundColor: theme.colors.surface,
                      flex: Platform.OS === 'web' ? 1 : undefined,
                    }]}
                    onPress={pickImageFromGallery}
                    disabled={uploading}
                  >
                    <Ionicons name="images" size={24} color={theme.colors.accent} />
                    <Text style={[styles.photoOptionText, { color: theme.colors.text }]}>
                      {Platform.OS === 'web' ? 'Seleccionar imagen' : 'Desde galería'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Avatares predefinidos */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Avatares predefinidos
                </Text>
                
                <View style={styles.avatarsGrid}>
                  {predefinedAvatars.map((avatar) => {
                    const AvatarComponent = avatar.component;
                    const isSelected = currentAvatarType === 'predefined' && currentAvatarId === avatar.id;
                    
                    return (
                      <TouchableOpacity
                        key={avatar.id}
                        style={[
                          styles.avatarOption,
                          isSelected && { 
                            borderColor: theme.colors.accent,
                            borderWidth: 3,
                          }
                        ]}
                        onPress={() => handlePredefinedAvatarSelect(avatar.id)}
                      >
                        <AvatarComponent
                          size={60}
                          backgroundColor={avatar.color}
                        />
                        <Text style={[styles.avatarName, { color: theme.colors.textSecondary }]}>
                          {avatar.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {uploading && (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.accent} />
                  <Text style={[styles.uploadingText, { color: theme.colors.text }]}>
                    Procesando imagen...
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    borderRadius: 40,
  },
  defaultAvatar: {
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  desktopModalOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  desktopModalContent: {
    borderRadius: 16,
    maxHeight: '80%',
    width: '90%',
    maxWidth: 600,
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  cancelText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  desktopModalBody: {
    maxHeight: 500,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  photoOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  photoOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  photoOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  avatarsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  avatarOption: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    width: '30%',
  },
  avatarName: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  uploadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  uploadingText: {
    marginTop: 12,
    fontSize: 16,
  },
});

export default AvatarPicker;
