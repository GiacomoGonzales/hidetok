import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { usersService, UserProfile } from '../services/firestoreService';
import { Timestamp } from 'firebase/firestore';

interface UserProfileContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<Omit<UserProfile, 'id' | 'uid' | 'createdAt'>>) => Promise<void>;
  refreshProfile: () => void;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile debe ser usado dentro de un UserProfileProvider');
  }
  return context;
};

interface UserProfileProviderProps {
  children: React.ReactNode;
}

export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

        console.log('🔄 [UserProfileContext] Cargando perfil para usuario:', user.uid);

        // Buscar perfil existente
        let profile = await usersService.getByUid(user.uid);

        // Si no existe, crear uno nuevo
        if (!profile) {
          // Preparar datos base del perfil
          const baseProfileData = {
            uid: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || 'Usuario Anónimo',
            email: user.email || '',
            bio: '',
            followers: 0,
            following: 0,
            posts: 0,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };

          // Agregar campos de avatar según el tipo de autenticación
          const newProfileData: Omit<UserProfile, 'id'> = user.photoURL
            ? {
                ...baseProfileData,
                photoURL: user.photoURL,
                avatarType: 'custom' as const,
              }
            : {
                ...baseProfileData,
                avatarType: 'predefined' as const,
                avatarId: 'male',
              };

          console.log('📝 [UserProfileContext] Creando nuevo perfil:', newProfileData);

          const profileId = await usersService.create(newProfileData);
          profile = {
            id: profileId,
            ...newProfileData,
          };

          console.log('✅ [UserProfileContext] Perfil creado exitosamente:', profileId);
        } else {
          console.log('📥 [UserProfileContext] Perfil cargado:', profile.displayName);
        }

        setUserProfile(profile);
      } catch (err) {
        console.error('❌ [UserProfileContext] Error loading user profile:', err);
        setError('Error al cargar el perfil de usuario');
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [user, refreshTrigger]);

  const updateProfile = async (updates: Partial<Omit<UserProfile, 'id' | 'uid' | 'createdAt'>>) => {
    if (!userProfile?.id || !user) {
      console.error('❌ [UserProfileContext] No se puede actualizar: no hay perfil o usuario');
      return;
    }

    try {
      console.log('🔄 [UserProfileContext] Actualizando perfil con:', updates);

      // Agregar updatedAt al update
      const updatesWithTimestamp = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      // Actualizar en Firestore
      await usersService.update(userProfile.id, updatesWithTimestamp);
      console.log('✅ [UserProfileContext] Perfil actualizado en Firestore');

      // Actualizar estado local inmediatamente
      const newProfile = { ...userProfile, ...updatesWithTimestamp };
      console.log('✅ [UserProfileContext] Actualizando estado local:', {
        displayName: newProfile.displayName,
        avatarType: newProfile.avatarType,
      });
      setUserProfile(newProfile);

      // Forzar refresh desde Firestore para asegurar sincronización
      setTimeout(() => {
        console.log('🔄 [UserProfileContext] Forzando refresh del perfil desde Firestore...');
        setRefreshTrigger(prev => prev + 1);
      }, 300);
    } catch (err) {
      console.error('❌ [UserProfileContext] Error updating profile:', err);
      throw new Error('Error al actualizar el perfil');
    }
  };

  const refreshProfile = () => {
    console.log('🔄 [UserProfileContext] Refresh manual solicitado');
    setRefreshTrigger(prev => prev + 1);
  };

  const value: UserProfileContextType = {
    userProfile,
    loading,
    error,
    updateProfile,
    refreshProfile,
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};
