import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { usersService, UserProfile } from '../services/firestoreService';
import { Timestamp } from 'firebase/firestore';
import { updateUserCache } from '../hooks/useUserById';

type ProfileType = 'real' | 'hidi';

interface UserProfileContextType {
  userProfile: UserProfile | null; // Perfil activo (real o hidi)
  realProfile: UserProfile | null;
  hidiProfile: UserProfile | null;
  activeProfileType: ProfileType;
  hasHidiProfile: boolean;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<Omit<UserProfile, 'id' | 'uid' | 'createdAt'>>) => Promise<void>;
  updateLocalProfile: (updates: Partial<UserProfile>) => void;
  refreshProfile: () => void;
  switchIdentity: () => void;
  setHidiProfile: (profile: UserProfile) => void;
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
  const [realProfile, setRealProfile] = useState<UserProfile | null>(null);
  const [hidiProfile, setHidiProfileState] = useState<UserProfile | null>(null);
  const [activeProfileType, setActiveProfileType] = useState<ProfileType>('real');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Perfil activo basado en el tipo seleccionado
  const userProfile = activeProfileType === 'hidi' && hidiProfile ? hidiProfile : realProfile;

  useEffect(() => {
    const loadUserProfiles = async () => {
      if (!user) {
        setRealProfile(null);
        setHidiProfileState(null);
        setActiveProfileType('real');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('🔄 [UserProfileContext] Cargando perfiles para usuario:', user.uid);

        // Buscar perfil real existente
        let profile = await usersService.getByUid(user.uid);

        // Si no existe, crear uno nuevo
        if (!profile) {
          const baseProfileData = {
            uid: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || 'Usuario Anónimo',
            email: user.email || '',
            bio: '',
            followers: 0,
            following: 0,
            posts: 0,
            joinedCommunities: [] as string[],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            profileType: 'real' as const,
          };

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
          console.log('📥 [UserProfileContext] Perfil real cargado:', profile.displayName);
        }

        // Auto-fix: sync photoURLThumbnail with photoURL if out of sync
        if (profile && profile.avatarType === 'custom' && profile.photoURL && profile.photoURL !== profile.photoURLThumbnail) {
          console.log('🔧 [UserProfileContext] Auto-syncing photoURLThumbnail with photoURL');
          profile.photoURLThumbnail = profile.photoURL;
          // Also fix in Firestore so it doesn't happen again
          usersService.update(profile.id!, { photoURLThumbnail: profile.photoURL }).catch(() => {});
        }

        setRealProfile(profile);

        // Actualizar caché con perfil real
        if (profile) {
          updateUserCache(user.uid, profile);
        }

        // Intentar cargar perfil HIDI
        try {
          const hidi = await usersService.getHidiProfile(user.uid);
          if (hidi) {
            console.log('🎭 [UserProfileContext] Perfil HIDI cargado:', hidi.displayName);
            setHidiProfileState(hidi);
            updateUserCache(`hidi_${user.uid}`, hidi);
          } else {
            console.log('🎭 [UserProfileContext] No hay perfil HIDI');
            setHidiProfileState(null);
          }
        } catch (hidiErr) {
          console.log('🎭 [UserProfileContext] Error cargando perfil HIDI (ignorado):', hidiErr);
          setHidiProfileState(null);
        }
      } catch (err) {
        console.error('❌ [UserProfileContext] Error loading user profile:', err);
        setError('Error al cargar el perfil de usuario');
        setRealProfile(null);
        setHidiProfileState(null);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfiles();
  }, [user, refreshTrigger]);

  const updateProfile = async (updates: Partial<Omit<UserProfile, 'id' | 'uid' | 'createdAt'>>) => {
    const currentProfile = userProfile;
    if (!currentProfile?.id || !user) {
      console.error('❌ [UserProfileContext] No se puede actualizar: no hay perfil o usuario');
      return;
    }

    try {
      // Auto-sync thumbnail when photoURL changes
      if (updates.photoURL && !updates.photoURLThumbnail) {
        updates.photoURLThumbnail = updates.photoURL;
      }

      console.log('🔄 [UserProfileContext] Actualizando perfil activo con:', updates);

      const updatesWithTimestamp = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      // Actualizar estado local inmediatamente
      const newProfile = { ...currentProfile, ...updatesWithTimestamp };
      if (activeProfileType === 'hidi') {
        setHidiProfileState(newProfile);
        updateUserCache(`hidi_${user.uid}`, newProfile);
      } else {
        setRealProfile(newProfile);
        updateUserCache(user.uid, newProfile);
      }

      // Actualizar en Firestore
      await usersService.update(currentProfile.id, updatesWithTimestamp);
      console.log('✅ [UserProfileContext] Perfil actualizado en Firestore');
    } catch (err) {
      console.error('❌ [UserProfileContext] Error updating profile:', err);
      throw new Error('Error al actualizar el perfil');
    }
  };

  const updateLocalProfile = (updates: Partial<UserProfile>) => {
    if (!userProfile || !user) {
      console.warn('⚠️ [UserProfileContext] No se puede actualizar: no hay perfil');
      return;
    }

    // Auto-sync thumbnail when photoURL changes
    if (updates.photoURL && !updates.photoURLThumbnail) {
      updates.photoURLThumbnail = updates.photoURL;
    }

    const newProfile = { ...userProfile, ...updates };
    if (activeProfileType === 'hidi') {
      setHidiProfileState(newProfile);
      updateUserCache(`hidi_${user.uid}`, updates);
    } else {
      setRealProfile(newProfile);
      updateUserCache(user.uid, updates);
    }
  };

  const refreshProfile = () => {
    console.log('🔄 [UserProfileContext] Refresh manual solicitado');
    setRefreshTrigger(prev => prev + 1);
  };

  const switchIdentity = useCallback(() => {
    if (!hidiProfile) {
      console.warn('⚠️ [UserProfileContext] No hay perfil HIDI para cambiar');
      return;
    }
    setActiveProfileType(prev => {
      const next = prev === 'real' ? 'hidi' : 'real';
      console.log(`🎭 [UserProfileContext] Cambiando identidad: ${prev} → ${next}`);
      return next;
    });
  }, [hidiProfile]);

  // Setter público para que HidiCreationScreen pueda establecer el perfil recién creado
  const setHidiProfile = useCallback((profile: UserProfile) => {
    setHidiProfileState(profile);
    if (user) {
      updateUserCache(`hidi_${user.uid}`, profile);
    }
  }, [user]);

  const value: UserProfileContextType = {
    userProfile,
    realProfile,
    hidiProfile,
    activeProfileType,
    hasHidiProfile: !!hidiProfile,
    loading,
    error,
    updateProfile,
    updateLocalProfile,
    refreshProfile,
    switchIdentity,
    setHidiProfile,
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};
