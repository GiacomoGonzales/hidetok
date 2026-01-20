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

/**
 * LIKES SERVICE - Arquitectura Óptima para Escalabilidad
 *
 * Estrategia:
 * 1. Colección separada 'likes' con ID compuesto: {userId}_{postId}
 * 2. Denormalización: contador 'likes' en el documento Post
 * 3. Batch writes para atomicidad
 * 4. Índices optimizados para queries rápidas
 */

export interface Like {
  id?: string; // {userId}_{postId}
  userId: string;
  postId: string;
  createdAt: Timestamp;
}

class LikesService {
  /**
   * Dar like a un post
   * - Crea documento en colección 'likes'
   * - Incrementa contador en el post
   * - Usa batch para atomicidad
   */
  async likePost(userId: string, postId: string): Promise<void> {
    try {
      // Validaciones
      if (!userId || !postId) {
        console.error('❌ [LikesService] userId o postId inválido:', { userId, postId });
        throw new Error('userId y postId son requeridos');
      }

      console.log('👍 [LikesService] Dando like:', { userId: userId.substring(0, 8), postId: postId.substring(0, 8) });

      const batch = writeBatch(db);

      // ID compuesto para evitar duplicados y hacer queries rápidas
      const likeId = `${userId}_${postId}`;
      const likeRef = doc(db, 'likes', likeId);
      const postRef = doc(db, 'posts', postId);

      // Verificar si ya existe el like
      const likeDoc = await getDoc(likeRef);
      if (likeDoc.exists()) {
        console.log('⚠️ [LikesService] El usuario ya dio like a este post');
        return;
      }

      // Crear documento de like
      batch.set(likeRef, {
        userId,
        postId,
        createdAt: Timestamp.now(),
      });

      // Incrementar contador en el post
      // Usar set con merge para manejar posts sin el campo likes
      batch.set(
        postRef,
        { likes: increment(1) },
        { merge: true }
      );

      await batch.commit();
      console.log('✅ [LikesService] Like guardado exitosamente');
    } catch (error) {
      console.error('❌ [LikesService] Error dando like:', error);
      throw error;
    }
  }

  /**
   * Quitar like de un post
   */
  async unlikePost(userId: string, postId: string): Promise<void> {
    try {
      // Validaciones
      if (!userId || !postId) {
        console.error('❌ [LikesService] userId o postId inválido:', { userId, postId });
        throw new Error('userId y postId son requeridos');
      }

      console.log('👎 [LikesService] Quitando like:', { userId: userId.substring(0, 8), postId: postId.substring(0, 8) });

      const batch = writeBatch(db);

      const likeId = `${userId}_${postId}`;
      const likeRef = doc(db, 'likes', likeId);
      const postRef = doc(db, 'posts', postId);

      // Verificar si existe el like
      const likeDoc = await getDoc(likeRef);
      if (!likeDoc.exists()) {
        console.log('⚠️ [LikesService] El usuario no ha dado like a este post');
        return;
      }

      // Eliminar documento de like
      batch.delete(likeRef);

      // Decrementar contador en el post (no permitir negativos)
      // Usar set con merge para manejar posts sin el campo likes
      batch.set(
        postRef,
        { likes: increment(-1) },
        { merge: true }
      );

      await batch.commit();
      console.log('✅ [LikesService] Like eliminado exitosamente');
    } catch (error) {
      console.error('❌ [LikesService] Error quitando like:', error);
      throw error;
    }
  }

  /**
   * Toggle like (dar o quitar like según el estado actual)
   */
  async toggleLike(userId: string, postId: string): Promise<boolean> {
    try {
      const isLiked = await this.hasUserLiked(userId, postId);

      if (isLiked) {
        await this.unlikePost(userId, postId);
        return false;
      } else {
        await this.likePost(userId, postId);
        return true;
      }
    } catch (error) {
      console.error('Error en toggle like:', error);
      throw error;
    }
  }

  /**
   * Verificar si un usuario ha dado like a un post
   * - Query súper rápida gracias al ID compuesto
   */
  async hasUserLiked(userId: string, postId: string): Promise<boolean> {
    try {
      const likeId = `${userId}_${postId}`;
      const likeRef = doc(db, 'likes', likeId);
      const likeDoc = await getDoc(likeRef);

      return likeDoc.exists();
    } catch (error) {
      console.error('Error verificando like:', error);
      throw error;
    }
  }

  /**
   * Verificar likes para múltiples posts (optimizado para feeds)
   * Retorna un Map<postId, boolean>
   */
  async hasUserLikedMultiple(
    userId: string,
    postIds: string[]
  ): Promise<Map<string, boolean>> {
    try {
      const likesMap = new Map<string, boolean>();

      // Inicializar todos como false
      postIds.forEach(postId => likesMap.set(postId, false));

      // Obtener todos los likes del usuario para estos posts
      const likePromises = postIds.map(postId => {
        const likeId = `${userId}_${postId}`;
        return getDoc(doc(db, 'likes', likeId));
      });

      const likesDocs = await Promise.all(likePromises);

      likesDocs.forEach((likeDoc, index) => {
        if (likeDoc.exists()) {
          likesMap.set(postIds[index], true);
        }
      });

      return likesMap;
    } catch (error) {
      console.error('Error verificando múltiples likes:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los posts que un usuario ha dado like (solo IDs)
   */
  async getUserLikedPosts(userId: string, limitCount = 50): Promise<string[]> {
    try {
      const likesRef = collection(db, 'likes');
      const q = query(
        likesRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const postIds: string[] = [];

      querySnapshot.forEach((doc) => {
        const like = doc.data() as Like;
        postIds.push(like.postId);
      });

      return postIds;
    } catch (error) {
      console.error('Error obteniendo posts con like:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los posts completos que un usuario ha dado like
   */
  async getUserLikedPostsWithData(userId: string, limitCount = 50): Promise<any[]> {
    try {
      // Primero obtener los IDs de los posts
      const postIds = await this.getUserLikedPosts(userId, limitCount);

      if (postIds.length === 0) {
        return [];
      }

      // Luego obtener los posts completos
      const postsPromises = postIds.map(async (postId) => {
        const postRef = doc(db, 'posts', postId);
        const postDoc = await getDoc(postRef);

        if (postDoc.exists()) {
          return { id: postDoc.id, ...postDoc.data() };
        }
        return null;
      });

      const posts = await Promise.all(postsPromises);

      // Filtrar posts que no existen (fueron eliminados)
      return posts.filter(post => post !== null);
    } catch (error) {
      console.error('Error obteniendo posts con like (con datos):', error);
      throw error;
    }
  }

  /**
   * Obtener usuarios que han dado like a un post
   */
  async getPostLikers(postId: string, limitCount = 100): Promise<string[]> {
    try {
      const likesRef = collection(db, 'likes');
      const q = query(
        likesRef,
        where('postId', '==', postId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const userIds: string[] = [];

      querySnapshot.forEach((doc) => {
        const like = doc.data() as Like;
        userIds.push(like.userId);
      });

      return userIds;
    } catch (error) {
      console.error('Error obteniendo usuarios que dieron like:', error);
      throw error;
    }
  }

  /**
   * Suscripción en tiempo real a los likes de un post
   */
  subscribeToPostLikes(
    postId: string,
    callback: (likesCount: number, userIds: string[]) => void
  ): () => void {
    try {
      const likesRef = collection(db, 'likes');
      const q = query(
        likesRef,
        where('postId', '==', postId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(q, (querySnapshot) => {
        const userIds: string[] = [];
        querySnapshot.forEach((doc) => {
          const like = doc.data() as Like;
          userIds.push(like.userId);
        });
        callback(querySnapshot.size, userIds);
      });
    } catch (error) {
      console.error('Error en suscripción a likes:', error);
      throw error;
    }
  }

  /**
   * FUNCIÓN DE MANTENIMIENTO: Recalcular contadores de likes
   * Útil si hay inconsistencias
   */
  async recalculatePostLikes(postId: string): Promise<number> {
    try {
      const likesRef = collection(db, 'likes');
      const q = query(likesRef, where('postId', '==', postId));

      const querySnapshot = await getDocs(q);
      const actualLikesCount = querySnapshot.size;

      // Actualizar contador en el post
      const postRef = doc(db, 'posts', postId);
      await setDoc(postRef, { likes: actualLikesCount }, { merge: true });

      return actualLikesCount;
    } catch (error) {
      console.error('Error recalculando likes:', error);
      throw error;
    }
  }

  /**
   * Eliminar todos los likes de un post (útil al borrar un post)
   */
  async deletePostLikes(postId: string): Promise<void> {
    try {
      const likesRef = collection(db, 'likes');
      const q = query(likesRef, where('postId', '==', postId));

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);

      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error eliminando likes del post:', error);
      throw error;
    }
  }

  /**
   * Eliminar todos los likes de un usuario (útil al borrar una cuenta)
   */
  async deleteUserLikes(userId: string): Promise<void> {
    try {
      const likesRef = collection(db, 'likes');
      const q = query(likesRef, where('userId', '==', userId));

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);

      // Eliminar likes y actualizar contadores
      const postUpdates: { [postId: string]: number } = {};

      querySnapshot.forEach((doc) => {
        const like = doc.data() as Like;
        batch.delete(doc.ref);

        // Acumular decrementos por post
        postUpdates[like.postId] = (postUpdates[like.postId] || 0) - 1;
      });

      // Actualizar contadores de posts
      Object.entries(postUpdates).forEach(([postId, change]) => {
        const postRef = doc(db, 'posts', postId);
        batch.set(postRef, { likes: increment(change) }, { merge: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error eliminando likes del usuario:', error);
      throw error;
    }
  }
}

export const likesService = new LikesService();

/**
 * ÍNDICES NECESARIOS EN FIREBASE CONSOLE:
 *
 * Collection: likes
 * - userId (Ascending) + createdAt (Descending)
 * - postId (Ascending) + createdAt (Descending)
 *
 * Para crearlos:
 * 1. Firebase Console > Firestore Database > Indexes
 * 2. Create Index
 * 3. O espera a que Firebase sugiera crearlos cuando hagas las queries
 */
