import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usersService, UserProfile } from '../services/firestoreService';
import { Timestamp } from 'firebase/firestore';

export const useUserProfile = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Buscar perfil existente
        let profile = await usersService.getByUid(user.uid);

        // Si no existe, crear uno nuevo
        if (!profile) {
          const newProfileData: Omit<UserProfile, 'id'> = {
            uid: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || 'Usuario Anónimo',
            email: user.email || '',
            ...(user.photoURL && { photoURL: user.photoURL }), // Solo incluir si existe
            avatarType: user.photoURL ? 'custom' : 'predefined',
            avatarId: user.photoURL ? undefined : 'male', // Avatar por defecto
            bio: '',
            followers: 0,
            following: 0,
            posts: 0,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };

          const profileId = await usersService.create(newProfileData);
          profile = {
            id: profileId,
            ...newProfileData,
          };
        }

        setUserProfile(profile);
      } catch (err) {
        console.error('Error loading user profile:', err);
        setError('Error al cargar el perfil de usuario');
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [user]);

  const updateProfile = async (updates: Partial<Omit<UserProfile, 'id' | 'uid' | 'createdAt'>>) => {
    if (!userProfile?.id) return;

    try {
      await usersService.update(userProfile.id, updates);
      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      console.error('Error updating profile:', err);
      throw new Error('Error al actualizar el perfil');
    }
  };

  return {
    userProfile,
    loading,
    error,
    updateProfile,
  };
};
