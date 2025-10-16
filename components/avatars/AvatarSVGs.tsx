import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AvatarProps {
  size?: number;
  backgroundColor?: string;
}

// Avatar Masculino
export const MaleAvatar: React.FC<AvatarProps> = ({ size = 80, backgroundColor = '#4F46E5' }) => (
  <View style={[
    styles.avatarContainer,
    { 
      width: size, 
      height: size, 
      borderRadius: size / 2,
      backgroundColor 
    }
  ]}>
    <Ionicons name="man" size={size * 0.6} color="white" />
  </View>
);

// Avatar Femenino
export const FemaleAvatar: React.FC<AvatarProps> = ({ size = 80, backgroundColor = '#EC4899' }) => (
  <View style={[
    styles.avatarContainer,
    { 
      width: size, 
      height: size, 
      borderRadius: size / 2,
      backgroundColor 
    }
  ]}>
    <Ionicons name="woman" size={size * 0.6} color="white" />
  </View>
);

// Avatar Enmascarado
export const MaskedAvatar: React.FC<AvatarProps> = ({ size = 80, backgroundColor = '#1F2937' }) => (
  <View style={[
    styles.avatarContainer,
    { 
      width: size, 
      height: size, 
      borderRadius: size / 2,
      backgroundColor 
    }
  ]}>
    <Ionicons name="skull" size={size * 0.5} color="white" />
  </View>
);

// Avatar Robot
export const RobotAvatar: React.FC<AvatarProps> = ({ size = 80, backgroundColor = '#6366F1' }) => (
  <View style={[
    styles.avatarContainer,
    { 
      width: size, 
      height: size, 
      borderRadius: size / 2,
      backgroundColor 
    }
  ]}>
    <Text style={[styles.robotText, { fontSize: size * 0.4 }]}>🤖</Text>
  </View>
);

// Avatar Ninja
export const NinjaAvatar: React.FC<AvatarProps> = ({ size = 80, backgroundColor = '#7C3AED' }) => (
  <View style={[
    styles.avatarContainer,
    { 
      width: size, 
      height: size, 
      borderRadius: size / 2,
      backgroundColor 
    }
  ]}>
    <Text style={[styles.ninjaText, { fontSize: size * 0.4 }]}>🥷</Text>
  </View>
);

// Avatar Gato
export const CatAvatar: React.FC<AvatarProps> = ({ size = 80, backgroundColor = '#F59E0B' }) => (
  <View style={[
    styles.avatarContainer,
    { 
      width: size, 
      height: size, 
      borderRadius: size / 2,
      backgroundColor 
    }
  ]}>
    <Text style={[styles.catText, { fontSize: size * 0.4 }]}>🐱</Text>
  </View>
);

const styles = StyleSheet.create({
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  robotText: {
    textAlign: 'center',
  },
  ninjaText: {
    textAlign: 'center',
  },
  catText: {
    textAlign: 'center',
  },
});

export const predefinedAvatars = [
  { id: 'male', name: 'Masculino', component: MaleAvatar, color: '#4F46E5' },
  { id: 'female', name: 'Femenino', component: FemaleAvatar, color: '#EC4899' },
  { id: 'masked', name: 'Enmascarado', component: MaskedAvatar, color: '#1F2937' },
  { id: 'robot', name: 'Robot', component: RobotAvatar, color: '#6366F1' },
  { id: 'ninja', name: 'Ninja', component: NinjaAvatar, color: '#7C3AED' },
  { id: 'cat', name: 'Gato', component: CatAvatar, color: '#F59E0B' },
];
