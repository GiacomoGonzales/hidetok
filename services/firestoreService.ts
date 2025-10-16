import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Tipos para las colecciones principales
export interface Post {
  id?: string;
  userId: string;
  content: string;
  imageUrl?: string;
  imageUrls?: string[]; // Para múltiples imágenes
  videoUrl?: string;
  likes: number;
  comments: number;
  shares: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isPrivate: boolean;
  hashtags: string[];
}

export interface UserProfile {
  id?: string;
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  avatarType?: 'predefined' | 'custom';
  avatarId?: string; // Para avatares predefinidos
  bio: string;
  followers: number;
  following: number;
  posts: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Comment {
  id?: string;
  postId: string;
  userId: string;
  content: string;
  likes: number;
  createdAt: Timestamp;
  parentCommentId?: string; // Para respuestas a comentarios
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
  create: (data: Omit<Post, 'id'>) => firestoreService.create<Post>('posts', data),
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
  update: (id: string, data: Partial<Post>) => firestoreService.update<Post>('posts', id, data),
  delete: (id: string) => firestoreService.delete('posts', id),
  subscribe: (callback: (posts: Post[]) => void, limitCount = 20) => 
    firestoreService.subscribeToCollection<Post>('posts', callback,
      undefined, // Sin filtros por ahora
      'createdAt', 'desc', limitCount
    )
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
