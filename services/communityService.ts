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
  increment,
  Timestamp,
  arrayUnion,
  arrayRemove,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Tipos para comunidades
export interface CommunityRule {
  id: string;
  text: string;
  order: number;
}

export interface Community {
  id?: string;
  name: string;
  slug: string;
  description: string;
  icon: string; // Nombre de Ionicons (ej: 'game-controller', 'football')
  rules: CommunityRule[];
  memberCount: number;
  postCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isOfficial: boolean;
  moderators: string[]; // Array de userIds
  createdBy?: string; // userId del creador (para comunidades de usuario)
  status: 'active' | 'pending' | 'rejected';
  // Configuracion especial
  isUnfiltered?: boolean; // Para comunidades como "haters"
  warningMessage?: string; // Mensaje de advertencia al entrar
}

// Comunidades oficiales iniciales
export const OFFICIAL_COMMUNITIES: Omit<Community, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Gamers',
    slug: 'gamers',
    description: 'Comunidad para amantes de los videojuegos. Comparte tus opiniones sobre juegos, consolas y la industria gaming.',
    icon: 'game-controller',
    rules: [
      { id: '1', text: 'Respeta las opiniones de otros jugadores', order: 1 },
      { id: '2', text: 'No spoilers sin advertencia', order: 2 },
      { id: '3', text: 'Evita guerras de consolas innecesarias', order: 3 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
  },
  {
    name: 'Politica',
    slug: 'politica',
    description: 'Debate politico sin censura. Expresa tus opiniones sobre gobierno, leyes y sociedad.',
    icon: 'business',
    rules: [
      { id: '1', text: 'Argumenta con hechos, no insultos', order: 1 },
      { id: '2', text: 'Respeta todas las ideologias', order: 2 },
      { id: '3', text: 'No incitacion a violencia', order: 3 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
  },
  {
    name: 'Deportes',
    slug: 'deportes',
    description: 'Todo sobre deportes: futbol, basquet, tenis y mas. Comparte analisis, predicciones y opiniones.',
    icon: 'football',
    rules: [
      { id: '1', text: 'Respeta a todos los equipos y aficiones', order: 1 },
      { id: '2', text: 'No discriminacion', order: 2 },
      { id: '3', text: 'Manten el debate deportivo', order: 3 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
  },
  {
    name: 'Religion y Filosofia',
    slug: 'religion-filosofia',
    description: 'Espacio para discutir creencias, espiritualidad y preguntas existenciales con respeto.',
    icon: 'book',
    rules: [
      { id: '1', text: 'Respeta todas las creencias y no creencias', order: 1 },
      { id: '2', text: 'No proselitismo agresivo', order: 2 },
      { id: '3', text: 'Debate con apertura mental', order: 3 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
  },
  {
    name: 'Recreacion',
    slug: 'recreacion',
    description: 'Hobbies, viajes, entretenimiento y tiempo libre. Comparte tus pasatiempos favoritos.',
    icon: 'color-palette',
    rules: [
      { id: '1', text: 'Comparte experiencias positivas', order: 1 },
      { id: '2', text: 'Se constructivo en tus criticas', order: 2 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
  },
  {
    name: 'Denuncias e Injusticias',
    slug: 'denuncias-injusticias',
    description: 'Espacio seguro para denunciar injusticias, abusos y situaciones que deben ser visibilizadas.',
    icon: 'megaphone',
    rules: [
      { id: '1', text: 'Se honesto en tus denuncias', order: 1 },
      { id: '2', text: 'No difames sin pruebas', order: 2 },
      { id: '3', text: 'Apoya a las victimas', order: 3 },
      { id: '4', text: 'No expongas datos personales de terceros', order: 4 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
  },
  {
    name: 'Consejos y Psicologia',
    slug: 'consejos-psicologia',
    description: 'Pide consejos, comparte experiencias y apoya a otros. Salud mental y bienestar emocional.',
    icon: 'heart',
    rules: [
      { id: '1', text: 'Se empatico y comprensivo', order: 1 },
      { id: '2', text: 'No des consejos medicos profesionales', order: 2 },
      { id: '3', text: 'Respeta la privacidad de todos', order: 3 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
  },
  {
    name: 'Gastronomia',
    slug: 'gastronomia',
    description: 'Recetas, restaurantes, criticas gastronomicas y todo sobre comida.',
    icon: 'restaurant',
    rules: [
      { id: '1', text: 'Comparte recetas con instrucciones claras', order: 1 },
      { id: '2', text: 'Respeta todas las dietas y preferencias', order: 2 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
  },
  {
    name: 'Haters',
    slug: 'haters',
    description: 'Contenedor de toxicidad. Desahogate aqui. Contenido sin filtrar.',
    icon: 'flame',
    rules: [
      { id: '1', text: 'No amenazas reales de violencia', order: 1 },
      { id: '2', text: 'No contenido ilegal', order: 2 },
      { id: '3', text: 'Lo que pasa en Haters, se queda en Haters', order: 3 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
    isUnfiltered: true,
    warningMessage: '⚠️ Esta comunidad contiene contenido sin filtrar. Entra bajo tu propio riesgo.',
  },
];

// Servicio de comunidades
export const communityService = {
  // Obtener todas las comunidades activas
  getCommunities: async (): Promise<Community[]> => {
    try {
      const q = query(
        collection(db, 'communities'),
        where('status', '==', 'active'),
        orderBy('memberCount', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Community));
    } catch (error) {
      console.error('Error getting communities:', error);
      // Fallback: obtener todas y filtrar en JS (no requiere índice)
      console.log('🔄 Usando fallback sin índice compuesto...');
      try {
        const snapshot = await getDocs(collection(db, 'communities'));
        const allCommunities = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Community));
        return allCommunities
          .filter(c => c.status === 'active')
          .sort((a, b) => b.memberCount - a.memberCount);
      } catch (fallbackError) {
        console.error('Error in fallback:', fallbackError);
        throw fallbackError;
      }
    }
  },

  // Obtener comunidades oficiales
  getOfficialCommunities: async (): Promise<Community[]> => {
    try {
      const q = query(
        collection(db, 'communities'),
        where('isOfficial', '==', true),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Community));
    } catch (error) {
      console.error('Error getting official communities:', error);
      // Fallback: obtener todas y filtrar en JS (no requiere índice)
      console.log('🔄 Usando fallback sin índice compuesto...');
      return communityService.getAllCommunitiesFallback();
    }
  },

  // Fallback que no requiere índices compuestos
  getAllCommunitiesFallback: async (): Promise<Community[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'communities'));
      const allCommunities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Community));

      // Filtrar en JavaScript
      return allCommunities
        .filter(c => c.isOfficial && c.status === 'active')
        .sort((a, b) => b.memberCount - a.memberCount);
    } catch (error) {
      console.error('Error in fallback communities:', error);
      throw error;
    }
  },

  // Obtener comunidad por slug
  getCommunityBySlug: async (slug: string): Promise<Community | null> => {
    try {
      const q = query(
        collection(db, 'communities'),
        where('slug', '==', slug),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Community;
    } catch (error) {
      console.error('Error getting community by slug:', error);
      throw error;
    }
  },

  // Obtener comunidad por ID
  getCommunityById: async (id: string): Promise<Community | null> => {
    try {
      const docRef = doc(db, 'communities', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() } as Community;
    } catch (error) {
      console.error('Error getting community by id:', error);
      throw error;
    }
  },

  // Unirse a una comunidad
  joinCommunity: async (userId: string, communityId: string): Promise<void> => {
    try {
      const batch = writeBatch(db);

      // Incrementar memberCount en la comunidad
      const communityRef = doc(db, 'communities', communityId);
      batch.update(communityRef, {
        memberCount: increment(1),
        updatedAt: Timestamp.now(),
      });

      // Agregar communityId al array del usuario
      const userQuery = query(
        collection(db, 'users'),
        where('uid', '==', userId),
        limit(1)
      );
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        batch.update(userDoc.ref, {
          joinedCommunities: arrayUnion(communityId),
          updatedAt: Timestamp.now(),
        });
      }

      // Crear membership en subcolección (opcional, para más datos)
      const membershipRef = doc(db, `communities/${communityId}/members`, userId);
      batch.set(membershipRef, {
        userId: userId,
        joinedAt: Timestamp.now(),
        postCount: 0,
        reputation: 0,
      });

      await batch.commit();
    } catch (error) {
      console.error('Error joining community:', error);
      throw error;
    }
  },

  // Salir de una comunidad
  leaveCommunity: async (userId: string, communityId: string): Promise<void> => {
    try {
      const batch = writeBatch(db);

      // Decrementar memberCount
      const communityRef = doc(db, 'communities', communityId);
      batch.update(communityRef, {
        memberCount: increment(-1),
        updatedAt: Timestamp.now(),
      });

      // Remover communityId del array del usuario
      const userQuery = query(
        collection(db, 'users'),
        where('uid', '==', userId),
        limit(1)
      );
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        batch.update(userDoc.ref, {
          joinedCommunities: arrayRemove(communityId),
          updatedAt: Timestamp.now(),
        });
      }

      // Eliminar membership
      const membershipRef = doc(db, `communities/${communityId}/members`, userId);
      batch.delete(membershipRef);

      await batch.commit();
    } catch (error) {
      console.error('Error leaving community:', error);
      throw error;
    }
  },

  // Verificar si usuario es miembro
  isMember: async (userId: string, communityId: string): Promise<boolean> => {
    try {
      const membershipRef = doc(db, `communities/${communityId}/members`, userId);
      const membershipSnap = await getDoc(membershipRef);
      return membershipSnap.exists();
    } catch (error) {
      console.error('Error checking membership:', error);
      return false;
    }
  },

  // Obtener comunidades del usuario
  getUserCommunities: async (userId: string): Promise<Community[]> => {
    try {
      // Obtener el usuario para ver sus comunidades
      const userQuery = query(
        collection(db, 'users'),
        where('uid', '==', userId),
        limit(1)
      );
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) return [];

      const userData = userSnapshot.docs[0].data();
      const communityIds = userData.joinedCommunities || [];

      if (communityIds.length === 0) return [];

      // Obtener las comunidades
      const communities: Community[] = [];
      for (const id of communityIds) {
        const community = await communityService.getCommunityById(id);
        if (community) communities.push(community);
      }

      return communities;
    } catch (error) {
      console.error('Error getting user communities:', error);
      return [];
    }
  },

  // Crear nueva comunidad (usuario)
  createCommunity: async (data: {
    name: string;
    description: string;
    icon: string;
    rules: string[];
    createdBy: string;
  }): Promise<string> => {
    try {
      // Generar slug
      const slug = data.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Verificar que el slug no exista
      const existing = await communityService.getCommunityBySlug(slug);
      if (existing) {
        throw new Error('Ya existe una comunidad con ese nombre');
      }

      const communityData: Omit<Community, 'id'> = {
        name: data.name,
        slug,
        description: data.description,
        icon: data.icon,
        rules: data.rules.map((text, index) => ({
          id: String(index + 1),
          text,
          order: index + 1,
        })),
        memberCount: 1, // El creador es el primer miembro
        postCount: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isOfficial: false,
        moderators: [data.createdBy],
        createdBy: data.createdBy,
        status: 'pending', // Requiere aprobación (o 'active' para auto-aprobar)
      };

      const docRef = await addDoc(collection(db, 'communities'), communityData);

      // El creador se une automáticamente
      await communityService.joinCommunity(data.createdBy, docRef.id);

      return docRef.id;
    } catch (error) {
      console.error('Error creating community:', error);
      throw error;
    }
  },

  // Incrementar contador de posts
  incrementPostCount: async (communityId: string): Promise<void> => {
    try {
      const communityRef = doc(db, 'communities', communityId);
      await updateDoc(communityRef, {
        postCount: increment(1),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error incrementing post count:', error);
    }
  },

  // Decrementar contador de posts
  decrementPostCount: async (communityId: string): Promise<void> => {
    try {
      const communityRef = doc(db, 'communities', communityId);
      await updateDoc(communityRef, {
        postCount: increment(-1),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error decrementing post count:', error);
    }
  },

  // Seed de comunidades oficiales (solo ejecutar una vez)
  seedOfficialCommunities: async (): Promise<void> => {
    try {
      console.log('🌱 Iniciando seed de comunidades oficiales...');

      for (const community of OFFICIAL_COMMUNITIES) {
        // Verificar si ya existe
        const existing = await communityService.getCommunityBySlug(community.slug);
        if (existing) {
          console.log(`⏭️ Comunidad "${community.name}" ya existe, saltando...`);
          continue;
        }

        // Crear la comunidad
        const docRef = await addDoc(collection(db, 'communities'), {
          ...community,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        console.log(`✅ Comunidad "${community.name}" creada con ID: ${docRef.id}`);
      }

      console.log('🎉 Seed completado!');
    } catch (error) {
      console.error('❌ Error en seed:', error);
      throw error;
    }
  },

  // Migrar iconos de emojis a Ionicons
  migrateIcons: async (): Promise<void> => {
    try {
      console.log('🔄 Migrando iconos de comunidades...');

      // Mapa de slug a nuevo icono
      const iconMap: Record<string, string> = {
        'gamers': 'game-controller',
        'politica': 'business',
        'deportes': 'football',
        'religion-filosofia': 'book',
        'recreacion': 'color-palette',
        'denuncias-injusticias': 'megaphone',
        'consejos-psicologia': 'heart',
        'gastronomia': 'restaurant',
        'haters': 'flame',
      };

      // Obtener todas las comunidades oficiales
      const communities = await communityService.getOfficialCommunities();

      for (const community of communities) {
        if (!community.id) continue;

        const newIcon = iconMap[community.slug];
        if (newIcon && community.icon !== newIcon) {
          const communityRef = doc(db, 'communities', community.id);
          await updateDoc(communityRef, {
            icon: newIcon,
            updatedAt: Timestamp.now(),
          });
          console.log(`✅ Icono actualizado para "${community.name}": ${community.icon} -> ${newIcon}`);
        }
      }

      console.log('🎉 Migración de iconos completada!');
    } catch (error) {
      console.error('❌ Error en migración:', error);
      throw error;
    }
  },
};

export default communityService;
