import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { repostsService } from '../services/firestoreService';

export const useReposts = (postId: string, initialRepostsCount: number) => {
  const { user } = useAuth();
  const [hasReposted, setHasReposted] = useState(false);
  const [repostsCount, setRepostsCount] = useState(initialRepostsCount || 0);
  const [repostId, setRepostId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  // Verificar si el usuario ya hizo repost
  useEffect(() => {
    const checkRepost = async () => {
      if (!user || !postId) return;

      try {
        const result = await repostsService.hasUserReposted(postId, user.uid);
        setHasReposted(result.hasReposted);
        setRepostId(result.repostId);
      } catch (error) {
        console.error('Error checking repost:', error);
      }
    };

    checkRepost();
  }, [postId, user]);

  const toggleRepost = async (comment?: string) => {
    if (!user || !postId || loading) return;

    setLoading(true);
    try {
      if (hasReposted && repostId) {
        // Eliminar repost
        await repostsService.deleteRepost(repostId, postId);
        setHasReposted(false);
        setRepostId(undefined);
        setRepostsCount(prev => Math.max(0, prev - 1));
      } else {
        // Crear repost (con comentario opcional)
        const newRepostId = await repostsService.createRepost(postId, user.uid, comment);
        setHasReposted(true);
        setRepostId(newRepostId);
        setRepostsCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling repost:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    hasReposted,
    repostsCount,
    toggleRepost, // Ahora acepta un comentario opcional
    loading,
  };
};
