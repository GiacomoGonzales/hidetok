import { useState, useEffect, useCallback } from 'react';
import { voteService, VoteType, VoteStats } from '../services/voteService';

interface UseVoteOptions {
  postId: string;
  userId?: string;
  initialStats?: Partial<VoteStats>;
}

interface UseVoteReturn {
  stats: VoteStats;
  isLoading: boolean;
  error: string | null;
  voteAgree: () => Promise<void>;
  voteDisagree: () => Promise<void>;
  removeVote: () => Promise<void>;
  toggleVote: (type: VoteType) => Promise<void>;
  refreshStats: () => Promise<void>;
}

export function useVote({ postId, userId, initialStats }: UseVoteOptions): UseVoteReturn {
  const [stats, setStats] = useState<VoteStats>({
    agreementCount: initialStats?.agreementCount ?? 0,
    disagreementCount: initialStats?.disagreementCount ?? 0,
    totalVotes: (initialStats?.agreementCount ?? 0) + (initialStats?.disagreementCount ?? 0),
    agreementPercentage: 0,
    userVote: initialStats?.userVote ?? null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calcular porcentaje cuando cambian los contadores
  useEffect(() => {
    const total = stats.agreementCount + stats.disagreementCount;
    const percentage = total > 0 ? Math.round((stats.agreementCount / total) * 100) : 0;
    if (percentage !== stats.agreementPercentage) {
      setStats(prev => ({ ...prev, agreementPercentage: percentage }));
    }
  }, [stats.agreementCount, stats.disagreementCount]);

  // Cargar voto del usuario al montar
  useEffect(() => {
    if (userId && postId) {
      voteService.getUserVote(postId, userId).then(vote => {
        setStats(prev => ({ ...prev, userVote: vote }));
      });
    }
  }, [postId, userId]);

  const refreshStats = useCallback(async () => {
    if (!postId) return;
    try {
      const newStats = await voteService.getVoteStats(postId, userId);
      setStats(newStats);
    } catch (err) {
      console.error('Error refreshing vote stats:', err);
    }
  }, [postId, userId]);

  const handleVote = useCallback(async (type: VoteType) => {
    if (!userId) {
      setError('Debes iniciar sesión para votar');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Optimistic update
    const previousStats = { ...stats };
    const wasAgree = stats.userVote === 'agree';
    const wasDisagree = stats.userVote === 'disagree';

    let newAgreementCount = stats.agreementCount;
    let newDisagreementCount = stats.disagreementCount;

    if (type === 'agree') {
      if (wasAgree) {
        // Quitar voto
        newAgreementCount--;
        setStats(prev => ({ ...prev, agreementCount: newAgreementCount, userVote: null }));
      } else {
        // Agregar o cambiar
        if (wasDisagree) newDisagreementCount--;
        newAgreementCount++;
        setStats(prev => ({
          ...prev,
          agreementCount: newAgreementCount,
          disagreementCount: newDisagreementCount,
          userVote: 'agree',
        }));
      }
    } else {
      if (wasDisagree) {
        // Quitar voto
        newDisagreementCount--;
        setStats(prev => ({ ...prev, disagreementCount: newDisagreementCount, userVote: null }));
      } else {
        // Agregar o cambiar
        if (wasAgree) newAgreementCount--;
        newDisagreementCount++;
        setStats(prev => ({
          ...prev,
          agreementCount: newAgreementCount,
          disagreementCount: newDisagreementCount,
          userVote: 'disagree',
        }));
      }
    }

    try {
      await voteService.toggleVote(postId, userId, type);
    } catch (err) {
      // Revertir en caso de error
      setStats(previousStats);
      setError('Error al votar. Intenta de nuevo.');
      console.error('Error voting:', err);
    } finally {
      setIsLoading(false);
    }
  }, [postId, userId, stats]);

  const voteAgree = useCallback(() => handleVote('agree'), [handleVote]);
  const voteDisagree = useCallback(() => handleVote('disagree'), [handleVote]);

  const removeVote = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    const previousStats = { ...stats };

    // Optimistic update
    if (stats.userVote === 'agree') {
      setStats(prev => ({
        ...prev,
        agreementCount: prev.agreementCount - 1,
        userVote: null,
      }));
    } else if (stats.userVote === 'disagree') {
      setStats(prev => ({
        ...prev,
        disagreementCount: prev.disagreementCount - 1,
        userVote: null,
      }));
    }

    try {
      await voteService.removeVote(postId, userId);
    } catch (err) {
      setStats(previousStats);
      setError('Error al quitar voto');
      console.error('Error removing vote:', err);
    } finally {
      setIsLoading(false);
    }
  }, [postId, userId, stats]);

  const toggleVote = useCallback((type: VoteType) => handleVote(type), [handleVote]);

  return {
    stats,
    isLoading,
    error,
    voteAgree,
    voteDisagree,
    removeVote,
    toggleVote,
    refreshStats,
  };
}

export default useVote;
