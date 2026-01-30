import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  Timestamp,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Tipos para las colecciones principales
export interface PollOption {
  text: string;
  votes: number;
  votedBy: string[]; // Array de userIds que votaron por esta opción
}

export interface PostPoll {
  options: PollOption[];
  endsAt: Timestamp;
  totalVotes: number;
}

export interface Post {
  id?: string;
  userId: string;
  content: string;
  imageUrl?: string;
  imageUrls?: string[]; // Para múltiples imágenes (full size)
  imageUrlsThumbnails?: string[]; // Thumbnails para carga rápida en el feed
  videoUrl?: string;
  poll?: PostPoll; // Encuesta opcional

  // === NUEVO: Sistema de comunidades ===
  communityId?: string; // ID de la comunidad (requerido para nuevos posts)
  communitySlug?: string; // Slug para navegación rápida
  tags?: string[]; // Tags/temas seleccionados por el usuario

  // === NUEVO: Sistema de votación (% de acuerdo) ===
  agreementCount: number; // Votos "de acuerdo"
  disagreementCount: number; // Votos "en desacuerdo"

  // === DEPRECADO: Sistema de likes (mantener para retrocompatibilidad) ===
  likes: number; // @deprecated - usar agreementCount/disagreementCount

  comments: number;
  shares: number;
  reposts: number;
  views: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isPrivate: boolean;
  hashtags: string[];
  // Campos para reposts (nuevo diseño Twitter-style)
  isRepost?: boolean;
  originalPostId?: string; // ID del post original (solo para reposts)
  repostComment?: string; // Comentario opcional al repostear
  // Datos del post original se cargan dinámicamente, no se duplican
}

export interface UserProfile {
  id?: string;
  uid: string;
  realName?: string; // Nombre real (privado, no se muestra)
  displayName: string; // Alias público
  email: string;
  birthDate?: string; // Fecha de nacimiento ISO string
  gender?: 'male' | 'female' | 'other';
  photoURL?: string;
  photoURLThumbnail?: string; // Versión pequeña para el feed (150x150px)
  coverPhotoURL?: string; // Foto de portada/banner
  avatarType?: 'predefined' | 'custom';
  avatarId?: string; // Para avatares predefinidos
  bio: string;
  website?: string; // Sitio web del usuario
  followers: number;
  following: number;
  posts: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // === NUEVO: Sistema de comunidades ===
  joinedCommunities: string[]; // Array de communityIds
  primaryCommunity?: string; // ID de la comunidad principal (la primera elegida)
  hasCompletedCommunityOnboarding?: boolean; // Si ya eligió comunidades

  // === País ===
  country?: string; // Código ISO del país (ej: 'AR', 'MX')
  countryName?: string; // Nombre del país (ej: 'Argentina')

  // === HIDI: Sistema de doble identidad ===
  profileType?: 'real' | 'hidi'; // Tipo de perfil
  linkedAccountId?: string; // uid del perfil vinculado (real↔hidi)
}

export interface Comment {
  id?: string;
  postId: string;
  userId: string;
  content: string;
  imageUrl?: string;
  likes: number; // @deprecated - usar agreementCount/disagreementCount
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  parentCommentId?: string; // Para respuestas a comentarios

  // === NUEVO: Sistema de votación para comentarios ===
  agreementCount?: number;
  disagreementCount?: number;
}

// Servicio genérico para operaciones CRUD
class FirestoreService {
  // Crear documento
  async create<T>(collectionName: string, data: Omit<T, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error(`Error creando documento en ${collectionName}:`, error);
      throw error;
    }
  }

  // Obtener documento por ID
  async getById<T>(collectionName: string, id: string): Promise<T | null> {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      return null;
    } catch (error) {
      console.error(`Error obteniendo documento de ${collectionName}:`, error);
      throw error;
    }
  }

  // Obtener múltiples documentos con filtros
  async getMany<T>(
    collectionName: string,
    filters?: { field: string; operator: any; value: any }[],
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'desc',
    limitCount?: number
  ): Promise<T[]> {
    try {
      let q = collection(db, collectionName);
      let queryRef: any = q;

      // Aplicar filtros
      if (filters) {
        filters.forEach(filter => {
          queryRef = query(queryRef, where(filter.field, filter.operator, filter.value));
        });
      }

      // Aplicar ordenamiento
      if (orderByField) {
        queryRef = query(queryRef, orderBy(orderByField, orderDirection));
      }

      // Aplicar límite
      if (limitCount) {
        queryRef = query(queryRef, limit(limitCount));
      }

      const querySnapshot = await getDocs(queryRef);
      const documents: T[] = [];

      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() } as T);
      });

      return documents;
    } catch (error) {
      console.error(`Error obteniendo documentos de ${collectionName}:`, error);
      throw error;
    }
  }

  // Obtener múltiples documentos con paginación (cursor-based)
  async getManyPaginated<T>(
    collectionName: string,
    limitCount: number,
    lastDoc?: DocumentSnapshot,
    filters?: { field: string; operator: any; value: any }[],
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<{ documents: T[]; lastDoc: DocumentSnapshot | null }> {
    try {
      let q = collection(db, collectionName);
      let queryRef: any = q;

      // Aplicar filtros
      if (filters) {
        filters.forEach(filter => {
          queryRef = query(queryRef, where(filter.field, filter.operator, filter.value));
        });
      }

      // Aplicar ordenamiento
      if (orderByField) {
        queryRef = query(queryRef, orderBy(orderByField, orderDirection));
      }

      // Aplicar cursor si existe
      if (lastDoc) {
        queryRef = query(queryRef, startAfter(lastDoc));
      }

      // Aplicar límite
      queryRef = query(queryRef, limit(limitCount));

      const querySnapshot = await getDocs(queryRef);
      const documents: T[] = [];

      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() } as T);
      });

      // Obtener el último documento para el siguiente cursor
      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

      return { documents, lastDoc: lastVisible };
    } catch (error) {
      console.error(`Error obteniendo documentos paginados de ${collectionName}:`, error);
      throw error;
    }
  }

  // Actualizar documento
  async update<T>(
    collectionName: string,
    id: string,
    data: Partial<Omit<T, 'id' | 'createdAt'>>
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`Error actualizando documento en ${collectionName}:`, error);
      throw error;
    }
  }

  // Eliminar documento
  async delete(collectionName: string, id: string): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error eliminando documento de ${collectionName}:`, error);
      throw error;
    }
  }

  // Escuchar cambios en tiempo real
  subscribeToCollection<T>(
    collectionName: string,
    callback: (documents: T[]) => void,
    filters?: { field: string; operator: any; value: any }[],
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'desc',
    limitCount?: number
  ): () => void {
    try {
      let q = collection(db, collectionName);
      let queryRef: any = q;

      // Aplicar filtros
      if (filters) {
        filters.forEach(filter => {
          queryRef = query(queryRef, where(filter.field, filter.operator, filter.value));
        });
      }

      // Aplicar ordenamiento
      if (orderByField) {
        queryRef = query(queryRef, orderBy(orderByField, orderDirection));
      }

      // Aplicar límite
      if (limitCount) {
        queryRef = query(queryRef, limit(limitCount));
      }

      return onSnapshot(queryRef, (querySnapshot) => {
        const documents: T[] = [];
        querySnapshot.forEach((doc) => {
          documents.push({ id: doc.id, ...doc.data() } as T);
        });
        callback(documents);
      });
    } catch (error) {
      console.error(`Error suscribiéndose a ${collectionName}:`, error);
      throw error;
    }
  }
}

// Crear instancia del servicio
export const firestoreService = new FirestoreService();

// Servicios específicos para cada colección
export const postsService = {
  // Crear post con campos de votación inicializados
  create: (data: Omit<Post, 'id'>) => {
    const postData = {
      ...data,
      agreementCount: data.agreementCount ?? 0,
      disagreementCount: data.disagreementCount ?? 0,
      likes: data.likes ?? 0, // Mantener para retrocompatibilidad
    };
    return firestoreService.create<Post>('posts', postData);
  },
  getById: (id: string) => firestoreService.getById<Post>('posts', id),
  getByUserId: async (userId: string, limitCount = 50) => {
    // Obtener posts del usuario sin ordenamiento para evitar índice compuesto
    const posts = await firestoreService.getMany<Post>('posts', 
      [{ field: 'userId', operator: '==', value: userId }],
      undefined, // Sin ordenamiento en servidor
      'desc',
      limitCount // Limitar cantidad para performance
    );
    // Ordenar en el cliente por fecha de creación (más reciente primero)
    return posts.sort((a, b) => {
      const timeA = a.createdAt.toMillis();
      const timeB = b.createdAt.toMillis();
      return timeB - timeA; // desc
    });
  },
  getPublicPosts: (limitCount = 20) => firestoreService.getMany<Post>('posts',
    undefined, // Sin filtros por ahora
    'createdAt', 'desc', limitCount
  ),
  getPublicPostsPaginated: async (limitCount = 20, lastDoc?: DocumentSnapshot) => {
    const result = await firestoreService.getManyPaginated<Post>(
      'posts',
      limitCount,
      lastDoc,
      undefined, // Sin filtros
      'createdAt',
      'desc'
    );
    return result;
  },
  update: (id: string, data: Partial<Post>) => firestoreService.update<Post>('posts', id, data),
  delete: (id: string) => firestoreService.delete('posts', id),
  subscribe: (callback: (posts: Post[]) => void, limitCount = 20) =>
    firestoreService.subscribeToCollection<Post>('posts', callback,
      undefined, // Sin filtros por ahora
      'createdAt', 'desc', limitCount
    ),
  voteInPoll: async (postId: string, optionIndex: number, userId: string): Promise<void> => {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      throw new Error('Post no encontrado');
    }

    const post = postSnap.data() as Post;

    if (!post.poll) {
      throw new Error('Este post no tiene encuesta');
    }

    // Verificar que el usuario no haya votado ya
    const hasVoted = post.poll.options.some(opt => opt.votedBy.includes(userId));
    if (hasVoted) {
      throw new Error('Ya has votado en esta encuesta');
    }

    // Actualizar la opción votada
    const updatedOptions = post.poll.options.map((opt, idx) => {
      if (idx === optionIndex) {
        return {
          ...opt,
          votes: opt.votes + 1,
          votedBy: [...opt.votedBy, userId],
        };
      }
      return opt;
    });

    // Actualizar el post con los nuevos datos
    await updateDoc(postRef, {
      'poll.options': updatedOptions,
      'poll.totalVotes': post.poll.totalVotes + 1,
    });
  },
  incrementViews: async (postId: string): Promise<void> => {
    const postRef = doc(db, 'posts', postId);
    try {
      const postSnap = await getDoc(postRef);
      const currentViews = postSnap.data()?.views || 0;
      await updateDoc(postRef, {
        views: currentViews + 1,
      });
    } catch (error) {
      console.error('Error incrementando vistas:', error);
    }
  },

  // === NUEVAS FUNCIONES PARA COMUNIDADES ===

  // Obtener posts de una comunidad específica
  getByCommunityId: async (communityId: string, limitCount = 20) => {
    const posts = await firestoreService.getMany<Post>('posts',
      [{ field: 'communityId', operator: '==', value: communityId }],
      'createdAt',
      'desc',
      limitCount
    );
    return posts;
  },

  // Obtener posts de una comunidad con paginación (por communityId)
  getByCommunityIdPaginated: async (communityId: string, limitCount = 20, lastDoc?: DocumentSnapshot) => {
    const result = await firestoreService.getManyPaginated<Post>(
      'posts',
      limitCount,
      lastDoc,
      [{ field: 'communityId', operator: '==', value: communityId }],
      'createdAt',
      'desc'
    );
    return result;
  },

  // Obtener posts de una comunidad con paginación (por communitySlug)
  getByCommunitySlugPaginated: async (communitySlug: string, limitCount = 20, lastDoc?: DocumentSnapshot) => {
    const result = await firestoreService.getManyPaginated<Post>(
      'posts',
      limitCount,
      lastDoc,
      [{ field: 'communitySlug', operator: '==', value: communitySlug }],
      'createdAt',
      'desc'
    );
    return result;
  },

  // Obtener posts de múltiples comunidades (para feed "Mis comunidades")
  getByMultipleCommunities: async (communityIds: string[], limitCount = 20, lastDoc?: DocumentSnapshot) => {
    if (communityIds.length === 0) {
      return { documents: [], lastDoc: null };
    }

    // Firestore 'in' soporta hasta 10 valores
    const chunkedIds = [];
    for (let i = 0; i < communityIds.length; i += 10) {
      chunkedIds.push(communityIds.slice(i, i + 10));
    }

    let allPosts: Post[] = [];
    for (const chunk of chunkedIds) {
      const posts = await firestoreService.getMany<Post>('posts',
        [{ field: 'communityId', operator: 'in', value: chunk }],
        'createdAt',
        'desc',
        limitCount * 2 // Get more to have proper sorting
      );
      allPosts = [...allPosts, ...posts];
    }

    // Ordenar por fecha y limitar
    const sortedPosts = allPosts
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
      .slice(0, limitCount);

    return {
      documents: sortedPosts,
      lastDoc: null // Pagination not fully supported for multi-community queries
    };
  },

  // Suscribirse a posts de una comunidad en tiempo real
  subscribeToCommunity: (communityId: string, callback: (posts: Post[]) => void, limitCount = 20) =>
    firestoreService.subscribeToCollection<Post>('posts', callback,
      [{ field: 'communityId', operator: '==', value: communityId }],
      'createdAt', 'desc', limitCount
    ),
};

export const usersService = {
  create: (data: Omit<UserProfile, 'id'>) => firestoreService.create<UserProfile>('users', data),
  getById: (id: string) => firestoreService.getById<UserProfile>('users', id),
  getByUid: async (uid: string) => {
    const users = await firestoreService.getMany<UserProfile>('users',
      [{ field: 'uid', operator: '==', value: uid }]
    );
    return users.length > 0 ? users[0] : null;
  },
  update: (id: string, data: Partial<UserProfile>) => firestoreService.update<UserProfile>('users', id, data),
  delete: (id: string) => firestoreService.delete('users', id),

  // === HIDI: Métodos para perfil HIDI ===
  getHidiProfile: async (realUid: string): Promise<UserProfile | null> => {
    const hidiUid = `hidi_${realUid}`;
    const users = await firestoreService.getMany<UserProfile>('users',
      [{ field: 'uid', operator: '==', value: hidiUid }]
    );
    return users.length > 0 ? users[0] : null;
  },

  createHidiProfile: async (realUid: string, data: {
    displayName: string;
    bio: string;
    avatarType?: 'predefined' | 'custom';
    avatarId?: string;
    photoURL?: string;
  }): Promise<string> => {
    const hidiUid = `hidi_${realUid}`;
    const hidiProfileData: Record<string, any> = {
      uid: hidiUid,
      displayName: data.displayName,
      email: '',
      bio: data.bio,
      avatarType: data.avatarType || 'predefined',
      avatarId: data.avatarId || 'male',
      followers: 0,
      following: 0,
      posts: 0,
      joinedCommunities: [],
      hasCompletedCommunityOnboarding: true,
      profileType: 'hidi',
      linkedAccountId: realUid,
    };

    // Only include photoURL if it has a value (Firestore rejects undefined)
    if (data.photoURL) {
      hidiProfileData.photoURL = data.photoURL;
    }

    const docId = await firestoreService.create<UserProfile>('users', hidiProfileData as any);
    return docId;
  },
};

export const commentsService = {
  create: (data: Omit<Comment, 'id'>) => firestoreService.create<Comment>('comments', data),
  getById: (id: string) => firestoreService.getById<Comment>('comments', id),
  getByPostId: (postId: string) => firestoreService.getMany<Comment>('comments',
    [{ field: 'postId', operator: '==', value: postId }],
    'createdAt', 'asc'
  ),
  update: (id: string, data: Partial<Comment>) => firestoreService.update<Comment>('comments', id, data),
  delete: (id: string) => firestoreService.delete('comments', id),
  subscribeToPost: (postId: string, callback: (comments: Comment[]) => void) =>
    firestoreService.subscribeToCollection<Comment>('comments', callback,
      [{ field: 'postId', operator: '==', value: postId }],
      'createdAt', 'asc'
    )
};

// Servicio para reposts
export const repostsService = {
  // Crear un repost (Twitter-style: referencia al original, no copia)
  createRepost: async (originalPostId: string, userId: string, comment?: string): Promise<string> => {
    try {
      // Verificar que el post original existe
      const originalPost = await postsService.getById(originalPostId);
      if (!originalPost) {
        throw new Error('Post original no encontrado');
      }

      // Crear el repost como una REFERENCIA al post original
      const repostData: any = {
        userId: userId, // El usuario que hace el repost
        content: '', // Los reposts no tienen contenido propio
        likes: 0,
        comments: 0,
        shares: 0,
        reposts: 0,
        views: 0,
        isPrivate: false,
        hashtags: [],
        isRepost: true,
        originalPostId: originalPostId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Agregar comentario opcional
      if (comment && typeof comment === 'string' && comment.trim().length > 0) {
        repostData.repostComment = comment.trim();
      }

      // Crear el repost
      const repostId = await postsService.create(repostData);

      // Incrementar el contador de reposts en el post original
      await updateDoc(doc(db, 'posts', originalPostId), {
        reposts: (originalPost.reposts || 0) + 1,
      });

      return repostId;
    } catch (error) {
      console.error('Error creating repost:', error);
      throw error;
    }
  },

  // Eliminar un repost
  deleteRepost: async (repostId: string, originalPostId: string): Promise<void> => {
    try {
      // Eliminar el repost
      await postsService.delete(repostId);

      // Decrementar el contador de reposts en el post original
      const originalPost = await postsService.getById(originalPostId);
      if (originalPost) {
        await updateDoc(doc(db, 'posts', originalPostId), {
          reposts: Math.max(0, (originalPost.reposts || 0) - 1),
        });
      }
    } catch (error) {
      console.error('Error deleting repost:', error);
      throw error;
    }
  },

  // Verificar si un usuario ya hizo repost de un post
  hasUserReposted: async (postId: string, userId: string): Promise<{ hasReposted: boolean; repostId?: string }> => {
    try {
      const reposts = await firestoreService.getMany<Post>('posts',
        [
          { field: 'originalPostId', operator: '==', value: postId },
          { field: 'userId', operator: '==', value: userId }, // Cambio: userId en lugar de repostedBy
          { field: 'isRepost', operator: '==', value: true }
        ],
        undefined,
        'desc',
        1
      );

      if (reposts.length > 0) {
        return { hasReposted: true, repostId: reposts[0].id };
      }

      return { hasReposted: false };
    } catch (error) {
      console.error('Error checking repost:', error);
      return { hasReposted: false };
    }
  },

  // Obtener todos los reposts de un usuario
  getUserReposts: async (userId: string, limitCount = 50): Promise<Post[]> => {
    try {
      const reposts = await firestoreService.getMany<Post>('posts',
        [
          { field: 'userId', operator: '==', value: userId }, // Cambio: userId en lugar de repostedBy
          { field: 'isRepost', operator: '==', value: true }
        ],
        undefined,
        'desc',
        limitCount
      );

      // Ordenar por fecha de creación
      return reposts.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
    } catch (error) {
      console.error('Error getting user reposts:', error);
      return [];
    }
  },
};

// === FUNCIONES DE BÚSQUEDA ===

// Buscar usuarios por displayName (búsqueda simple)
export const searchUsers = async (searchQuery: string, limitCount = 10): Promise<UserProfile[]> => {
  try {
    if (!searchQuery || searchQuery.trim().length < 2) return [];

    const searchLower = searchQuery.toLowerCase().trim();

    // Firebase no soporta búsqueda de texto completo, así que obtenemos usuarios y filtramos
    // En producción se usaría Algolia o Elasticsearch
    const snapshot = await getDocs(
      query(collection(db, 'users'), limit(100))
    );

    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as UserProfile));

    // Filtrar por displayName que contenga el query (case insensitive)
    const filtered = users.filter(user =>
      user.displayName?.toLowerCase().includes(searchLower) ||
      user.bio?.toLowerCase().includes(searchLower)
    );

    // Ordenar por relevancia (match exacto primero, luego por seguidores)
    filtered.sort((a, b) => {
      const aExact = a.displayName?.toLowerCase().startsWith(searchLower) ? 1 : 0;
      const bExact = b.displayName?.toLowerCase().startsWith(searchLower) ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      return (b.followers || 0) - (a.followers || 0);
    });

    return filtered.slice(0, limitCount);
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};

// Buscar posts por contenido
export const searchPosts = async (searchQuery: string, limitCount = 10): Promise<Post[]> => {
  try {
    if (!searchQuery || searchQuery.trim().length < 2) return [];

    const searchLower = searchQuery.toLowerCase().trim();

    // Firebase no soporta búsqueda de texto completo
    // Obtenemos posts recientes y filtramos
    const snapshot = await getDocs(
      query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(200)
      )
    );

    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Post));

    // Filtrar por contenido que contenga el query
    const filtered = posts.filter(post =>
      post.content?.toLowerCase().includes(searchLower) ||
      post.hashtags?.some(tag => tag.toLowerCase().includes(searchLower))
    );

    return filtered.slice(0, limitCount);
  } catch (error) {
    console.error('Error searching posts:', error);
    return [];
  }
};

// Obtener posts trending (más engagement: likes + comments)
export const getTrendingPosts = async (limitCount = 10): Promise<Post[]> => {
  try {
    // Obtener posts recientes (últimos 100)
    const snapshot = await getDocs(
      query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(100)
      )
    );

    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Post));

    // Ordenar por engagement (likes + comments)
    const sorted = posts.sort((a, b) => {
      const engagementA = (a.likes || 0) + (a.comments || 0) * 2;
      const engagementB = (b.likes || 0) + (b.comments || 0) * 2;
      return engagementB - engagementA;
    });

    return sorted.slice(0, limitCount);
  } catch (error) {
    console.error('Error getting trending posts:', error);
    return [];
  }
};

// Obtener hashtags populares
export interface PopularHashtag {
  tag: string;
  count: number;
}

export const getPopularHashtags = async (limitCount = 10): Promise<PopularHashtag[]> => {
  try {
    // Obtener posts recientes
    const snapshot = await getDocs(
      query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(200)
      )
    );

    // Contar hashtags
    const hashtagCounts: Record<string, number> = {};

    snapshot.docs.forEach(doc => {
      const post = doc.data() as Post;
      if (post.hashtags && Array.isArray(post.hashtags)) {
        post.hashtags.forEach(tag => {
          const normalizedTag = tag.toLowerCase().trim();
          if (normalizedTag) {
            hashtagCounts[normalizedTag] = (hashtagCounts[normalizedTag] || 0) + 1;
          }
        });
      }
    });

    // Convertir a array y ordenar por count
    const sorted = Object.entries(hashtagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limitCount);

    return sorted;
  } catch (error) {
    console.error('Error getting popular hashtags:', error);
    return [];
  }
};

// Buscar posts por hashtag
export const getPostsByHashtag = async (hashtag: string, limitCount = 20): Promise<Post[]> => {
  try {
    const normalizedTag = hashtag.toLowerCase().trim().replace('#', '');

    const snapshot = await getDocs(
      query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(200)
      )
    );

    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Post));

    // Filtrar por hashtag
    const filtered = posts.filter(post =>
      post.hashtags?.some(tag => tag.toLowerCase().trim() === normalizedTag)
    );

    return filtered.slice(0, limitCount);
  } catch (error) {
    console.error('Error getting posts by hashtag:', error);
    return [];
  }
};
