import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { predefinedAvatars } from './AvatarSVGs';

interface AvatarDisplayProps {
  size?: number;
  avatarType?: 'predefined' | 'custom';
  avatarId?: string;
  photoURL?: string;
  backgroundColor?: string;
  borderColor?: string;
  showBorder?: boolean;
}

const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  size = 80,
  avatarType = 'predefined',
  avatarId = 'male',
  photoURL,
  backgroundColor = '#9CA3AF',
  borderColor = 'transparent',
  showBorder = false,
}) => {
  // Debug logging
  React.useEffect(() => {
    console.log('🔸 AvatarDisplay props:', {
      size,
      avatarType,
      avatarId,
      hasPhotoURL: !!photoURL,
      photoURL: photoURL ? photoURL.substring(0, 50) + '...' : null
    });
  }, [avatarType, avatarId, photoURL]);
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: showBorder ? 2 : 0,
    borderColor,
    overflow: 'hidden' as const,
  };

  // Si es un avatar personalizado y tenemos la URL
  if (avatarType === 'custom' && photoURL) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: photoURL }}
          style={[styles.customImage, { width: size, height: size }]}
          resizeMode="cover"
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
