import { useState, useEffect } from 'react';
import { usersService, UserProfile } from '../services/firestoreService';

// Cache simple para evitar consultas duplicadas
const userCache = new Map<string, UserProfile>();

export const useUserById = (userId: string | undefined) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      if (!userId) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      // Verificar cache primero
      const cachedUser = userCache.get(userId);
      if (cachedUser) {
        console.log('📋 Usuario encontrado en cache:', userId.substring(0, 8));
        setUserProfile(cachedUser);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Cargando usuario desde Firestore:', userId.substring(0, 8));
        // Buscar usuario por UID
        const user = await usersService.getByUid(userId);
        
        if (user) {
          // Guardar en cache
          userCache.set(userId, user);
          console.log('✅ Usuario cargado y guardado en cache:', user.displayName);
        } else {
          console.log('❌ Usuario no encontrado:', userId.substring(0, 8));
        }
        
        setUserProfile(user);
      } catch (err) {
        console.error('Error loading user by ID:', err);
        setError('Error al cargar usuario');
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [userId]);

  return { userProfile, loading, error };
};
