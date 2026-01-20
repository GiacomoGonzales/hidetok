import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  increment,
  Timestamp,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Tipos para votación
export type VoteType = 'agree' | 'disagree';

export interface Vote {
  id?: string;
  postId: string;
  userId: string; // userId del votante
  type: VoteType;
  createdAt: Timestamp;
}

export interface VoteStats {
  agreementCount: number;
  disagreementCount: number;
  totalVotes: number;
  agreementPercentage: number; // 0-100
  userVote: VoteType | null;
}

// Servicio de votación
export const voteService = {
  // Generar ID único para el voto (evita duplicados)
  getVoteId: (postId: string, userId: string): string => {
    return `${userId}_${postId}`;
  },

  // Votar en un post
  vote: async (postId: string, userId: string, type: VoteType): Promise<void> => {
    try {
      const voteId = voteService.getVoteId(postId, userId);
      const voteRef = doc(db, 'votes', voteId);
      const postRef = doc(db, 'posts', postId);

      // Verificar si ya existe un voto
      const existingVote = await getDoc(voteRef);
      const batch = writeBatch(db);

      if (existingVote.exists()) {
        const oldType = existingVote.data().type as VoteType;

        if (oldType === type) {
          // Mismo voto, no hacer nada
          return;
        }

        // Cambio de voto: actualizar contadores
        if (oldType === 'agree') {
          batch.update(postRef, {
            agreementCount: increment(-1),
            disagreementCount: increment(1),
          });
        } else {
          batch.update(postRef, {
            agreementCount: increment(1),
            disagreementCount: increment(-1),
          });
        }

        // Actualizar el voto
        batch.update(voteRef, {
          type,
          createdAt: Timestamp.now(),
        });
      } else {
        // Nuevo voto
        batch.set(voteRef, {
          postId,
          userId,
          type,
          createdAt: Timestamp.now(),
        });

        // Incrementar contador correspondiente
        if (type === 'agree') {
          batch.update(postRef, {
            agreementCount: increment(1),
          });
        } else {
          batch.update(postRef, {
            disagreementCount: increment(1),
          });
        }
      }

      await batch.commit();
    } catch (error) {
      console.error('Error voting:', error);
      throw error;
    }
  },

  // Votar "de acuerdo"
  voteAgree: async (postId: string, userId: string): Promise<void> => {
    return voteService.vote(postId, userId, 'agree');
  },

  // Votar "en desacuerdo"
  voteDisagree: async (postId: string, userId: string): Promise<void> => {
    return voteService.vote(postId, userId, 'disagree');
  },

  // Eliminar voto
  removeVote: async (postId: string, userId: string): Promise<void> => {
    try {
      const voteId = voteService.getVoteId(postId, userId);
      const voteRef = doc(db, 'votes', voteId);
      const postRef = doc(db, 'posts', postId);

      // Obtener el voto existente
      const existingVote = await getDoc(voteRef);

      if (!existingVote.exists()) {
        return; // No hay voto que eliminar
      }

      const voteType = existingVote.data().type as VoteType;
      const batch = writeBatch(db);

      // Decrementar el contador correspondiente
      if (voteType === 'agree') {
        batch.update(postRef, {
          agreementCount: increment(-1),
        });
      } else {
        batch.update(postRef, {
          disagreementCount: increment(-1),
        });
      }

      // Eliminar el voto
      batch.delete(voteRef);

      await batch.commit();
    } catch (error) {
      console.error('Error removing vote:', error);
      throw error;
    }
  },

  // Obtener voto del usuario para un post
  getUserVote: async (postId: string, userId: string): Promise<VoteType | null> => {
    try {
      const voteId = voteService.getVoteId(postId, userId);
      const voteRef = doc(db, 'votes', voteId);
      const voteSnap = await getDoc(voteRef);

      if (!voteSnap.exists()) {
        return null;
      }

      return voteSnap.data().type as VoteType;
    } catch (error) {
      console.error('Error getting user vote:', error);
      return null;
    }
  },

  // Calcular porcentaje de acuerdo
  getAgreementPercentage: (agreementCount: number, disagreementCount: number): number => {
    const total = agreementCount + disagreementCount;
    if (total === 0) return 0;
    return Math.round((agreementCount / total) * 100);
  },

  // Formatear porcentaje para mostrar
  formatAgreementText: (agreementCount: number, disagreementCount: number): string => {
    const total = agreementCount + disagreementCount;
    if (total === 0) {
      return 'Sé el primero en opinar';
    }
    const percentage = voteService.getAgreementPercentage(agreementCount, disagreementCount);
    return `${percentage}% de acuerdo`;
  },

  // Obtener estadísticas completas de votación para un post
  getVoteStats: async (postId: string, userId?: string): Promise<VoteStats> => {
    try {
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);

      if (!postSnap.exists()) {
        return {
          agreementCount: 0,
          disagreementCount: 0,
          totalVotes: 0,
          agreementPercentage: 0,
          userVote: null,
        };
      }

      const postData = postSnap.data();
      const agreementCount = postData.agreementCount || 0;
      const disagreementCount = postData.disagreementCount || 0;
      const totalVotes = agreementCount + disagreementCount;
      const agreementPercentage = voteService.getAgreementPercentage(agreementCount, disagreementCount);

      let userVote: VoteType | null = null;
      if (userId) {
        userVote = await voteService.getUserVote(postId, userId);
      }

      return {
        agreementCount,
        disagreementCount,
        totalVotes,
        agreementPercentage,
        userVote,
      };
    } catch (error) {
      console.error('Error getting vote stats:', error);
      return {
        agreementCount: 0,
        disagreementCount: 0,
        totalVotes: 0,
        agreementPercentage: 0,
        userVote: null,
      };
    }
  },

  // Suscribirse a cambios en los votos de un post (tiempo real)
  subscribeToVoteStats: (
    postId: string,
    userId: string | undefined,
    callback: (stats: VoteStats) => void
  ): (() => void) => {
    const postRef = doc(db, 'posts', postId);

    return onSnapshot(postRef, async (snapshot) => {
      if (!snapshot.exists()) {
        callback({
          agreementCount: 0,
          disagreementCount: 0,
          totalVotes: 0,
          agreementPercentage: 0,
          userVote: null,
        });
        return;
      }

      const postData = snapshot.data();
      const agreementCount = postData.agreementCount || 0;
      const disagreementCount = postData.disagreementCount || 0;
      const totalVotes = agreementCount + disagreementCount;
      const agreementPercentage = voteService.getAgreementPercentage(agreementCount, disagreementCount);

      let userVote: VoteType | null = null;
      if (userId) {
        userVote = await voteService.getUserVote(postId, userId);
      }

      callback({
        agreementCount,
        disagreementCount,
        totalVotes,
        agreementPercentage,
        userVote,
      });
    });
  },

  // Votar en un comentario (misma lógica pero para comentarios)
  voteOnComment: async (commentId: string, userId: string, type: VoteType): Promise<void> => {
    try {
      const voteId = `comment_${userId}_${commentId}`;
      const voteRef = doc(db, 'commentVotes', voteId);
      const commentRef = doc(db, 'comments', commentId);

      const existingVote = await getDoc(voteRef);
      const batch = writeBatch(db);

      if (existingVote.exists()) {
        const oldType = existingVote.data().type as VoteType;

        if (oldType === type) return;

        if (oldType === 'agree') {
          batch.update(commentRef, {
            agreementCount: increment(-1),
            disagreementCount: increment(1),
          });
        } else {
          batch.update(commentRef, {
            agreementCount: increment(1),
            disagreementCount: increment(-1),
          });
        }

        batch.update(voteRef, {
          type,
          createdAt: Timestamp.now(),
        });
      } else {
        batch.set(voteRef, {
          commentId,
          userId,
          type,
          createdAt: Timestamp.now(),
        });

        if (type === 'agree') {
          batch.update(commentRef, {
            agreementCount: increment(1),
          });
        } else {
          batch.update(commentRef, {
            disagreementCount: increment(1),
          });
        }
      }

      await batch.commit();
    } catch (error) {
      console.error('Error voting on comment:', error);
      throw error;
    }
  },

  // Toggle voto (si ya votó lo mismo, quita el voto; si votó diferente, cambia)
  toggleVote: async (postId: string, userId: string, type: VoteType): Promise<VoteType | null> => {
    try {
      const currentVote = await voteService.getUserVote(postId, userId);

      if (currentVote === type) {
        // Quitar voto
        await voteService.removeVote(postId, userId);
        return null;
      } else {
        // Agregar o cambiar voto
        await voteService.vote(postId, userId, type);
        return type;
      }
    } catch (error) {
      console.error('Error toggling vote:', error);
      throw error;
    }
  },
};

export default voteService;
