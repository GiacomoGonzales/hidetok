import { useState, useEffect } from 'react';
import { communityService, Community } from '../services/communityService';

// Mapa de slug a icono correcto de Ionicons
const ICON_MAP: Record<string, string> = {
  'gamers': 'game-controller',
  'politica': 'business',
  'deportes': 'football',
  'religion-filosofia': 'book',
  'recreacion': 'color-palette',
};

// Función para corregir iconos emoji a Ionicons
const fixCommunityIcon = (community: Community): Community => {
  const isValidIcon = community.icon.includes('-') || community.icon.length > 2;
  if (!isValidIcon && ICON_MAP[community.slug]) {
    return { ...community, icon: ICON_MAP[community.slug] };
  }
  return community;
};

// Cache global para comunidades
const communityCache = new Map<string, Community>();

export function useCommunityById(communityId: string | undefined) {
  const [community, setCommunity] = useState<Community | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!communityId) {
      setCommunity(null);
      return;
    }

    // Check cache first
    const cached = communityCache.get(communityId);
    if (cached) {
      setCommunity(cached);
      return;
    }

    const fetchCommunity = async () => {
      setIsLoading(true);
      try {
        const result = await communityService.getCommunityById(communityId);
        if (result) {
          const fixedCommunity = fixCommunityIcon(result);
          communityCache.set(communityId, fixedCommunity);
          setCommunity(fixedCommunity);
        }
      } catch (error) {
        console.error('Error fetching community:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommunity();
  }, [communityId]);

  return { community, isLoading };
}

// Función para precargar comunidades en el cache
export function preloadCommunities(communities: Community[]) {
  communities.forEach(c => {
    if (c.id) {
      communityCache.set(c.id, c);
    }
  });
}

export default useCommunityById;
