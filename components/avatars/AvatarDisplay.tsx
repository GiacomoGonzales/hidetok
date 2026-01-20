import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { predefinedAvatars } from './AvatarSVGs';

interface AvatarDisplayProps {
  size?: number;
  avatarType?: 'predefined' | 'custom';
  avatarId?: string;
  photoURL?: string;
  photoURLThumbnail?: string; // Thumbnail para tamaños pequeños (< 60px)
  backgroundColor?: string;
  borderColor?: string;
  showBorder?: boolean;
}

// Helper para validar si una URL es válida
const isValidImageUrl = (url: unknown): url is string => {
  if (typeof url !== 'string' || !url || url.trim() === '') {
    return false;
  }
  // Verificar que sea una URL http/https válida
  return url.startsWith('http://') || url.startsWith('https://');
};

const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  size = 80,
  avatarType = 'predefined',
  avatarId = 'male',
  photoURL,
  photoURLThumbnail,
  backgroundColor = '#9CA3AF',
  borderColor = 'transparent',
  showBorder = false,
}) => {
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: showBorder ? 2 : 0,
    borderColor,
    overflow: 'hidden' as const,
  };

  // Si es un avatar personalizado y tenemos una URL válida
  const hasValidPhotoURL = isValidImageUrl(photoURL);

  if (avatarType === 'custom' && hasValidPhotoURL) {
    // Usar thumbnail para tamaños pequeños (< 60px) si está disponible y es válido
    const thumbnailUrl = isValidImageUrl(photoURLThumbnail) ? photoURLThumbnail : null;
    const imageUrl = (size < 60 && thumbnailUrl) ? thumbnailUrl : photoURL;

    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: imageUrl }}
          style={[styles.customImage, { width: size, height: size, borderRadius: size / 2 }]}
          resizeMode="cover"
          onError={() => {
            // Silenciar errores de carga de imagen
            console.warn('AvatarDisplay: Error loading image:', imageUrl);
          }}
        />
      </View>
    );
  }

  // Si es un avatar predefinido
  if (avatarType === 'predefined' && avatarId) {
    const selectedAvatar = predefinedAvatars.find(avatar => avatar.id === avatarId);
    if (selectedAvatar) {
      const AvatarComponent = selectedAvatar.component;
      return (
        <View style={containerStyle}>
          <AvatarComponent
            size={size}
            backgroundColor={selectedAvatar.color}
          />
        </View>
      );
    }
  }

  // Avatar por defecto si no hay nada
  return (
    <View style={[
      containerStyle,
      styles.defaultContainer,
      { backgroundColor }
    ]}>
      <Ionicons 
        name="person" 
        size={size * 0.5} 
        color="white" 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  customImage: {
    borderRadius: 40,
  },
  defaultContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AvatarDisplay;
