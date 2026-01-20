import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  increment,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { notificationService } from './notificationService';

/**
 * FOLLOWS SERVICE - Arquitectura Óptima para Escalabilidad
 *
 * Estrategia:
 * 1. Colección 'follows' con ID compuesto: {followerId}_{followingId}
 * 2. Denormalización: contadores 'followers' y 'following' en UserProfile
 * 3. Batch writes para atomicidad
 * 4. Índices optimizados para ambas direcciones de queries
 *
 * Nota: Para redes sociales muy grandes (millones de usuarios), considera
 * usar colecciones separadas: 'followers' y 'following' para mejor performance
 */

export interface Follow {
  id?: string; // {followerId}_{followingId}
  followerId: string; // Usuario que sigue
  followingId: string; // Usuario siendo seguido
  createdAt: Timestamp;
}

class FollowsService {
  /**
   * Seguir a un usuario
   * - Crea documento en colección 'follows'
   * - Incrementa 'following' del seguidor
   * - Incrementa 'followers' del seguido
   */
  async followUser(followerId: string, followingId: string): Promise<void> {
    try {
      // Validación: no puedes seguirte a ti mismo
      if (followerId === followingId) {
        throw new Error('No puedes seguirte a ti mismo');
      }

      // Validaciones
      if (!followerId || !followingId) {
        console.error('❌ [FollowsService] followerId o followingId inválido:', { followerId, followingId });
        throw new Error('followerId y followingId son requeridos');
      }

      console.log('👥 [FollowsService] Siguiendo usuario:', {
        followerId: followerId.substring(0, 8),
        followingId: followingId.substring(0, 8)
      });

      const batch = writeBatch(db);

      // ID compuesto para evitar duplicados
      const followId = `${followerId}_${followingId}`;
      const followRef = doc(db, 'follows', followId);

      // Verificar si ya existe el follow
      const followDoc = await getDoc(followRef);
      if (followDoc.exists()) {
        console.log('⚠️ [FollowsService] Ya sigues a este usuario');
        return;
      }

      // IMPORTANTE: Obtener los documentos de usuario por UID primero
      console.log('🔍 [FollowsService] Buscando documentos de usuarios...');
      const followerUserQuery = query(collection(db, 'users'), where('uid', '==', followerId));
      const followingUserQuery = query(collection(db, 'users'), where('uid', '==', followingId));

      const [followerSnapshot, followingSnapshot] = await Promise.all([
        getDocs(followerUserQuery),
        getDocs(followingUserQuery)
      ]);

      if (followerSnapshot.empty || followingSnapshot.empty) {
        console.error('❌ [FollowsService] Usuario no encontrado:', {
          followerFound: !followerSnapshot.empty,
          followingFound: !followingSnapshot.empty
        });
        return;
      }

      console.log('✅ [FollowsService] Usuarios encontrados, actualizando contadores...');
      const followerUserRef = followerSnapshot.docs[0].ref;
      const followingUserRef = followingSnapshot.docs[0].ref;

      // Crear documento de follow
      batch.set(followRef, {
        followerId,
        followingId,
        createdAt: Timestamp.now(),
      });

      // Incrementar contador 'following' del seguidor
      // Usar set con merge para crear el campo si no existe
      batch.set(
        followerUserRef,
        { following: increment(1) },
        { merge: true }
      );

      // Incrementar contador 'followers' del seguido
      // Usar set con merge para crear el campo si no existe
      batch.set(
        followingUserRef,
        { followers: increment(1) },
        { merge: true }
      );

      await batch.commit();
      console.log('✅ [FollowsService] Follow guardado exitosamente');

      // Crear notificación para el usuario seguido
      try {
        const followerData = followerSnapshot.docs[0].data();
        await notificationService.createFollowNotification(
          followingId,
          followerId,
          followerData.displayName || 'Usuario',
          {
            type: followerData.avatarType,
            id: followerData.avatarId,
            url: followerData.photoURL,
          }
        );
        console.log('🔔 [FollowsService] Notificación de follow creada');
      } catch (notifError) {
        // No bloquear el follow si falla la notificación
        console.error('⚠️ [FollowsService] Error creando notificación:', notifError);
      }
    } catch (error) {
      console.error('❌ [FollowsService] Error siguiendo usuario:', error);
      throw error;
    }
  }

  /**
   * Dejar de seguir a un usuario
   */
  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    try {
      // Validaciones
      if (!followerId || !followingId) {
        console.error('❌ [FollowsService] followerId o followingId inválido:', { followerId, followingId });
        throw new Error('followerId y followingId son requeridos');
      }

      console.log('👤 [FollowsService] Dejando de seguir usuario:', {
        followerId: followerId.substring(0, 8),
        followingId: followingId.substring(0, 8)
      });

      const batch = writeBatch(db);

      const followId = `${followerId}_${followingId}`;
      const followRef = doc(db, 'follows', followId);

      // Verificar si existe el follow
      const followDoc = await getDoc(followRef);
      if (!followDoc.exists()) {
        console.log('⚠️ [FollowsService] No sigues a este usuario');
        return;
      }

      // IMPORTANTE: Obtener los documentos de usuario por UID primero
      console.log('🔍 [FollowsService] Buscando documentos de usuarios...');
      const followerUserQuery = query(collection(db, 'users'), where('uid', '==', followerId));
      const followingUserQuery = query(collection(db, 'users'), where('uid', '==', followingId));

      const [followerSnapshot, followingSnapshot] = await Promise.all([
        getDocs(followerUserQuery),
        getDocs(followingUserQuery)
      ]);

      if (followerSnapshot.empty || followingSnapshot.empty) {
        console.error('❌ [FollowsService] Usuario no encontrado:', {
          followerFound: !followerSnapshot.empty,
          followingFound: !followingSnapshot.empty
        });
        return;
      }

      console.log('✅ [FollowsService] Usuarios encontrados, actualizando contadores...');
      const followerUserRef = followerSnapshot.docs[0].ref;
      const followingUserRef = followingSnapshot.docs[0].ref;

      // Eliminar documento de follow
      batch.delete(followRef);

      // Decrementar contador 'following' del seguidor
      // Usar set con merge para manejar documentos que no existen
      batch.set(
        followerUserRef,
        { following: increment(-1) },
        { merge: true }
      );

      // Decrementar contador 'followers' del seguido
      // Usar set con merge para manejar documentos que no existen
      batch.set(
        followingUserRef,
        { followers: increment(-1) },
        { merge: true }
      );

      await batch.commit();
      console.log('✅ [FollowsService] Unfollow exitoso');

      // Eliminar notificación de follow
      try {
        await notificationService.deleteFollowNotification(followingId, followerId);
        console.log('🔔 [FollowsService] Notificación de follow eliminada');
      } catch (notifError) {
        // No bloquear el unfollow si falla la eliminación de notificación
        console.error('⚠️ [FollowsService] Error eliminando notificación:', notifError);
      }
    } catch (error) {
      console.error('❌ [FollowsService] Error dejando de seguir usuario:', error);
      throw error;
    }
  }

  /**
   * Toggle follow (seguir o dejar de seguir según el estado actual)
   */
  async toggleFollow(followerId: string, followingId: string): Promise<boolean> {
    try {
      const isFollowing = await this.isFollowing(followerId, followingId);

      if (isFollowing) {
        await this.unfollowUser(followerId, followingId);
        return false;
      } else {
        await this.followUser(followerId, followingId);
        return true;
      }
    } catch (error) {
      console.error('Error en toggle follow:', error);
      throw error;
    }
  }

  /**
   * Verificar si un usuario sigue a otro
   * - Query súper rápida gracias al ID compuesto
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      const followId = `${followerId}_${followingId}`;
      const followRef = doc(db, 'follows', followId);
      const followDoc = await getDoc(followRef);

      return followDoc.exists();
    } catch (error) {
      console.error('Error verificando follow:', error);
      throw error;
    }
  }

  /**
   * Verificar follows para múltiples usuarios (optimizado para listas de usuarios)
   * Retorna un Map<userId, boolean>
   */
  async isFollowingMultiple(
    followerId: string,
    userIds: string[]
  ): Promise<Map<string, boolean>> {
    try {
      const followsMap = new Map<string, boolean>();

      // Inicializar todos como false
      userIds.forEach(userId => followsMap.set(userId, false));

      // Obtener todos los follows
      const followPromises = userIds.map(userId => {
        const followId = `${followerId}_${userId}`;
        return getDoc(doc(db, 'follows', followId));
      });

      const followsDocs = await Promise.all(followPromises);

      followsDocs.forEach((followDoc, index) => {
        if (followDoc.exists()) {
          followsMap.set(userIds[index], true);
        }
      });

      return followsMap;
    } catch (error) {
      console.error('Error verificando múltiples follows:', error);
      throw error;
    }
  }

  /**
   * Obtener lista de usuarios que sigue un usuario (following)
   */
  async getFollowing(userId: string, limitCount = 100): Promise<string[]> {
    try {
      const followsRef = collection(db, 'follows');
      const q = query(
        followsRef,
        where('followerId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const followingIds: string[] = [];

      querySnapshot.forEach((doc) => {
        const follow = doc.data() as Follow;
        followingIds.push(follow.followingId);
      });

      return followingIds;
    } catch (error) {
      console.error('Error obteniendo following:', error);
      throw error;
    }
  }

  /**
   * Obtener lista de usuarios que siguen a un usuario (followers)
   */
  async getFollowers(userId: string, limitCount = 100): Promise<string[]> {
    try {
      const followsRef = collection(db, 'follows');
      const q = query(
        followsRef,
        where('followingId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const followerIds: string[] = [];

      querySnapshot.forEach((doc) => {
        const follow = doc.data() as Follow;
        followerIds.push(follow.followerId);
      });

      return followerIds;
    } catch (error) {
      console.error('Error obteniendo followers:', error);
      throw error;
    }
  }

  /**
   * Obtener amigos mutuos (usuarios que se siguen mutuamente)
   */
  async getMutualFollows(userId: string): Promise<string[]> {
    try {
      // Obtener a quiénes sigue
      const following = await this.getFollowing(userId, 1000);

      // Verificar cuáles de esos también lo siguen
      const mutualFollows: string[] = [];

      // Batch de verificaciones para mejor performance
      const batchSize = 10;
      for (let i = 0; i < following.length; i += batchSize) {
        const batch = following.slice(i, i + batchSize);
        const checks = await Promise.all(
          batch.map(async (followingId) => {
            const isMutual = await this.isFollowing(followingId, userId);
            return isMutual ? followingId : null;
          })
        );

        mutualFollows.push(...checks.filter((id): id is string => id !== null));
      }

      return mutualFollows;
    } catch (error) {
      console.error('Error obteniendo follows mutuos:', error);
      throw error;
    }
  }

  /**
   * Suscripción en tiempo real a los followers de un usuario
   */
  subscribeToFollowers(
    userId: string,
    callback: (followerIds: string[]) => void
  ): () => void {
    try {
      const followsRef = collection(db, 'follows');
      const q = query(
        followsRef,
        where('followingId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(q, (querySnapshot) => {
        const followerIds: string[] = [];
        querySnapshot.forEach((doc) => {
          const follow = doc.data() as Follow;
          followerIds.push(follow.followerId);
        });
        callback(followerIds);
      });
    } catch (error) {
      console.error('Error en suscripción a followers:', error);
      throw error;
    }
  }

  /**
   * Suscripción en tiempo real a los following de un usuario
   */
  subscribeToFollowing(
    userId: string,
    callback: (followingIds: string[]) => void
  ): () => void {
    try {
      const followsRef = collection(db, 'follows');
      const q = query(
        followsRef,
        where('followerId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(q, (querySnapshot) => {
        const followingIds: string[] = [];
        querySnapshot.forEach((doc) => {
          const follow = doc.data() as Follow;
          followingIds.push(follow.followingId);
        });
        callback(followingIds);
      });
    } catch (error) {
      console.error('Error en suscripción a following:', error);
      throw error;
    }
  }

  /**
   * FUNCIÓN DE MANTENIMIENTO: Recalcular contadores
   */
  async recalculateUserFollowCounts(userId: string): Promise<{
    followers: number;
    following: number;
  }> {
    try {
      // Contar followers
      const followersRef = collection(db, 'follows');
      const followersQuery = query(followersRef, where('followingId', '==', userId));
      const followersSnapshot = await getDocs(followersQuery);
      const followersCount = followersSnapshot.size;

      // Contar following
      const followingQuery = query(followersRef, where('followerId', '==', userId));
      const followingSnapshot = await getDocs(followingQuery);
      const followingCount = followingSnapshot.size;

      // IMPORTANTE: Obtener el documento de usuario por UID primero
      const userQuery = query(collection(db, 'users'), where('uid', '==', userId));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const userRef = userSnapshot.docs[0].ref;
        await setDoc(
          userRef,
          {
            followers: followersCount,
            following: followingCount,
          },
          { merge: true }
        );
      }

      return { followers: followersCount, following: followingCount };
    } catch (error) {
      console.error('Error recalculando contadores de follow:', error);
      throw error;
    }
  }

  /**
   * Eliminar todos los follows relacionados a un usuario (útil al borrar cuenta)
   */
  async deleteUserFollows(userId: string): Promise<void> {
    try {
      const followsRef = collection(db, 'follows');

      // Eliminar donde el usuario es follower
      const q1 = query(followsRef, where('followerId', '==', userId));
      const snapshot1 = await getDocs(q1);

      // Eliminar donde el usuario es following
      const q2 = query(followsRef, where('followingId', '==', userId));
      const snapshot2 = await getDocs(q2);

      const batch = writeBatch(db);

      // Procesar follows donde este usuario sigue a otros
      for (const document of snapshot1.docs) {
        const follow = document.data() as Follow;
        batch.delete(document.ref);

        // IMPORTANTE: Obtener el documento del otro usuario por UID
        const otherUserQuery = query(collection(db, 'users'), where('uid', '==', follow.followingId));
        const otherUserSnapshot = await getDocs(otherUserQuery);

        if (!otherUserSnapshot.empty) {
          const otherUserRef = otherUserSnapshot.docs[0].ref;
          batch.set(otherUserRef, { followers: increment(-1) }, { merge: true });
        }
      }

      // Procesar follows donde otros siguen a este usuario
      for (const document of snapshot2.docs) {
        const follow = document.data() as Follow;
        batch.delete(document.ref);

        // IMPORTANTE: Obtener el documento del otro usuario por UID
        const otherUserQuery = query(collection(db, 'users'), where('uid', '==', follow.followerId));
        const otherUserSnapshot = await getDocs(otherUserQuery);

        if (!otherUserSnapshot.empty) {
          const otherUserRef = otherUserSnapshot.docs[0].ref;
          batch.set(otherUserRef, { following: increment(-1) }, { merge: true });
        }
      }

      await batch.commit();
    } catch (error) {
      console.error('Error eliminando follows del usuario:', error);
      throw error;
    }
  }

  /**
   * Sugerencias de usuarios para seguir (usuarios populares que no sigues)
   * Este es un ejemplo básico, idealmente usarías Cloud Functions con ML
   */
  async getSuggestedUsers(
    userId: string,
    limitCount = 10
  ): Promise<string[]> {
    try {
      // Obtener usuarios que ya sigue
      const following = await this.getFollowing(userId, 1000);

      // TODO: Implementar algoritmo de sugerencias más sofisticado
      // Por ahora, simplemente excluye a los que ya sigue
      // En producción, considera:
      // - Amigos de amigos (follows de follows)
      // - Usuarios populares en tu área
      // - Usuarios con intereses similares
      // - Machine Learning

      return [];
    } catch (error) {
      console.error('Error obteniendo sugerencias:', error);
      throw error;
    }
  }
}

export const followsService = new FollowsService();

/**
 * ÍNDICES NECESARIOS EN FIREBASE CONSOLE:
 *
 * Collection: follows
 * - followerId (Ascending) + createdAt (Descending)
 * - followingId (Ascending) + createdAt (Descending)
 *
 * Para aplicaciones MUY grandes (millones de usuarios), considera:
 * Dividir en dos colecciones separadas:
 * - 'followers': optimizada para queries "¿quién me sigue?"
 * - 'following': optimizada para queries "¿a quién sigo?"
 *
 * Esto duplica el storage pero mejora drasticamente el performance.
 */
