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

// Tags predefinidos por categoría
export const CATEGORY_TAGS: { [slug: string]: string[] } = {
  'noticias': ['Política', 'Internacional', 'Economía', 'Tecnología', 'Deportes', 'Entretenimiento', 'Ciencia', 'Local'],
  'relaciones-amor': ['Parejas', 'Citas', 'Ruptura', 'Familia', 'Amistad', 'Consejos', 'Experiencias', 'Tóxico'],
  'finanzas-dinero': ['Inversiones', 'Ahorro', 'Emprendimiento', 'Cripto', 'Impuestos', 'Deudas', 'Presupuesto', 'Ingresos'],
  'laboral': ['Jefes', 'Compañeros', 'Oficina', 'Empleo', 'Despidos', 'Salario', 'Entrevistas', 'Freelance'],
  'salud-bienestar': ['Salud mental', 'Fitness', 'Nutrición', 'Autocuidado', 'Ansiedad', 'Depresión', 'Motivación', 'Hábitos'],
  'entretenimiento': ['Películas', 'Series', 'Música', 'Celebridades', 'Memes', 'Viral', 'Streaming', 'Eventos'],
  'gaming-tech': ['PC', 'Consolas', 'Mobile', 'Esports', 'Reviews', 'Noticias tech', 'Apps', 'Gadgets'],
  'educacion-carrera': ['Universidad', 'Cursos', 'Carrera', 'Estudios', 'Becas', 'Consejos', 'Experiencias', 'Oportunidades'],
  'deportes': ['Fútbol', 'Básquet', 'Tenis', 'F1', 'Boxeo', 'Olimpiadas', 'Fichajes', 'Resultados'],
  'confesiones': ['Secretos', 'Desahogo', 'Arrepentimiento', 'Culpa', 'Alivio', 'Anónimo', 'Verdades', 'Historias'],
  'debates-calientes': ['Controversial', 'Unpopular opinion', 'Hot take', 'Debate', 'Polémica', 'Crítica', 'Rant', 'Discusión'],
  'viajes-lugares': ['Destinos', 'Tips', 'Experiencias', 'Budget', 'Aventura', 'Playas', 'Ciudades', 'Naturaleza'],
  'comida-cocina': ['Recetas', 'Restaurantes', 'Tips', 'Postres', 'Saludable', 'Rápido', 'Internacional', 'Casero'],
  'moda-estilo': ['Outfits', 'Tendencias', 'Tips', 'Marcas', 'Casual', 'Formal', 'Accesorios', 'Skincare'],
  'espiritualidad': ['Religión', 'Meditación', 'Filosofía', 'Creencias', 'Energía', 'Propósito', 'Reflexión', 'Paz'],
  'anime-manga': ['Shonen', 'Seinen', 'Shojo', 'Recomendaciones', 'Cosplay', 'Noticias', 'Teorías', 'Waifus'],
  'criptomonedas': ['Bitcoin', 'Ethereum', 'Altcoins', 'Trading', 'NFTs', 'DeFi', 'Noticias', 'Análisis'],
  'kpop-kdrama': ['Grupos', 'Idols', 'Doramas', 'Comebacks', 'Concerts', 'Noticias', 'Ships', 'Fandom'],
};

// Comunidades oficiales iniciales
export const OFFICIAL_COMMUNITIES: Omit<Community, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // === CATEGORIAS PRINCIPALES ===
  {
    name: 'Noticias',
    slug: 'noticias',
    description: 'Noticias, actualidad, eventos y lo que está pasando en el mundo. Mantente informado.',
    icon: 'newspaper',
    rules: [
      { id: '1', text: 'Comparte fuentes confiables', order: 1 },
      { id: '2', text: 'No desinformación', order: 2 },
      { id: '3', text: 'Debate con respeto', order: 3 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
  },
  {
    name: 'Relaciones & Amor',
    slug: 'relaciones-amor',
    description: 'Parejas, citas, rupturas, consejos amorosos y temas de familia. Comparte tu experiencia.',
    icon: 'heart',
    rules: [
      { id: '1', text: 'Se empatico y respetuoso', order: 1 },
      { id: '2', text: 'No juzgues las decisiones de otros', order: 2 },
      { id: '3', text: 'Respeta la privacidad', order: 3 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
  },
  {
    name: 'Finanzas & Dinero',
    slug: 'finanzas-dinero',
    description: 'Inversiones, ahorro, emprendimiento, finanzas personales. Todo sobre el dinero.',
    icon: 'cash',
    rules: [
      { id: '1', text: 'No consejos financieros como verdad absoluta', order: 1 },
      { id: '2', text: 'Comparte experiencias reales', order: 2 },
      { id: '3', text: 'No promociones ni esquemas', order: 3 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
  },
  {
    name: 'Laboral',
    slug: 'laboral',
    description: 'Trabajo, jefes, compañeros, oficina, empleo. Historias y experiencias laborales.',
    icon: 'briefcase',
    rules: [
      { id: '1', text: 'No expongas empresas sin fundamento', order: 1 },
      { id: '2', text: 'Respeta la privacidad', order: 2 },
      { id: '3', text: 'Comparte consejos útiles', order: 3 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
  },
  {
    name: 'Salud & Bienestar',
    slug: 'salud-bienestar',
    description: 'Salud mental, fitness, nutricion, autocuidado. Apoyate en la comunidad.',
    icon: 'fitness',
    rules: [
      { id: '1', text: 'No des consejos medicos profesionales', order: 1 },
      { id: '2', text: 'Se empatico con problemas de salud mental', order: 2 },
      { id: '3', text: 'No promuevas dietas peligrosas', order: 3 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
  },
  {
    name: 'Entretenimiento',
    slug: 'entretenimiento',
    description: 'Peliculas, series, musica, celebridades, memes. Todo lo que te entretiene.',
    icon: 'film',
    rules: [
      { id: '1', text: 'Usa advertencias de spoilers', order: 1 },
      { id: '2', text: 'Respeta los gustos de otros', order: 2 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
  },
  {
    name: 'Gaming & Tech',
    slug: 'gaming-tech',
    description: 'Videojuegos, tecnologia, gadgets, apps, internet. Para gamers y techies.',
    icon: 'game-controller',
    rules: [
      { id: '1', text: 'No spoilers sin advertencia', order: 1 },
      { id: '2', text: 'Evita guerras de consolas innecesarias', order: 2 },
      { id: '3', text: 'Se constructivo en tus criticas', order: 3 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
  },
  {
    name: 'Educacion & Carrera',
    slug: 'educacion-carrera',
    description: 'Estudios, universidad, cursos, desarrollo profesional. Consejos academicos.',
    icon: 'school',
    rules: [
      { id: '1', text: 'Comparte recursos utiles', order: 1 },
      { id: '2', text: 'No hagas tareas por otros', order: 2 },
      { id: '3', text: 'Respeta todas las carreras', order: 3 },
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
    description: 'Futbol, basquet, F1, equipos, atletas. Analisis, predicciones y debates.',
    icon: 'football',
    rules: [
      { id: '1', text: 'Respeta a todos los equipos', order: 1 },
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
    name: 'Confesiones',
    slug: 'confesiones',
    description: 'Secretos, desahogos, experiencias personales anonimas. Sin juicios.',
    icon: 'eye-off',
    rules: [
      { id: '1', text: 'Respeta el anonimato de todos', order: 1 },
      { id: '2', text: 'No juzgues, solo escucha', order: 2 },
      { id: '3', text: 'No expongas informacion personal', order: 3 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
  },
  {
    name: 'Debates Calientes',
    slug: 'debates-calientes',
    description: 'Temas polemicos, opiniones impopulares, controversias. Debate intenso.',
    icon: 'flame',
    rules: [
      { id: '1', text: 'Argumenta, no insultes', order: 1 },
      { id: '2', text: 'Acepta opiniones diferentes', order: 2 },
      { id: '3', text: 'No incitacion a odio', order: 3 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
    isUnfiltered: true,
    warningMessage: 'Esta comunidad contiene debates intensos. Entra con mente abierta.',
  },
  // === CATEGORIAS ADICIONALES ===
  {
    name: 'Viajes & Lugares',
    slug: 'viajes-lugares',
    description: 'Destinos, experiencias de viaje, recomendaciones, tips de viajero.',
    icon: 'airplane',
    rules: [
      { id: '1', text: 'Comparte experiencias reales', order: 1 },
      { id: '2', text: 'Da recomendaciones honestas', order: 2 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
  },
  {
    name: 'Comida & Cocina',
    slug: 'comida-cocina',
    description: 'Recetas, restaurantes, criticas gastronomicas, tips de cocina.',
    icon: 'restaurant',
    rules: [
      { id: '1', text: 'Comparte recetas con instrucciones claras', order: 1 },
      { id: '2', text: 'Respeta todas las dietas', order: 2 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
  },
  {
    name: 'Moda & Estilo',
    slug: 'moda-estilo',
    description: 'Ropa, tendencias, looks, consejos de estilo. Expresa tu moda.',
    icon: 'shirt',
    rules: [
      { id: '1', text: 'No critiques el estilo de otros', order: 1 },
      { id: '2', text: 'Se constructivo en tus opiniones', order: 2 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
  },
  {
    name: 'Espiritualidad',
    slug: 'espiritualidad',
    description: 'Religion, filosofia, creencias, preguntas existenciales. Debate con respeto.',
    icon: 'sparkles',
    rules: [
      { id: '1', text: 'Respeta todas las creencias', order: 1 },
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
    name: 'Anime & Manga',
    slug: 'anime-manga',
    description: 'Anime, manga, light novels, cosplay. Para otakus y fans del entretenimiento japones.',
    icon: 'sparkles',
    rules: [
      { id: '1', text: 'Usa advertencias de spoilers', order: 1 },
      { id: '2', text: 'Respeta todos los gustos', order: 2 },
      { id: '3', text: 'No pirateria ni links ilegales', order: 3 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
  },
  {
    name: 'Criptomonedas',
    slug: 'criptomonedas',
    description: 'Bitcoin, altcoins, blockchain, NFTs, trading. Debate sobre el mundo crypto.',
    icon: 'logo-bitcoin',
    rules: [
      { id: '1', text: 'No consejos financieros como verdad absoluta', order: 1 },
      { id: '2', text: 'No promocion de scams o esquemas', order: 2 },
      { id: '3', text: 'Comparte con responsabilidad', order: 3 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
  },
  {
    name: 'K-Pop & K-Drama',
    slug: 'kpop-kdrama',
    description: 'K-pop, doramas coreanos, idols, cultura coreana. Para fans del hallyu.',
    icon: 'musical-notes',
    rules: [
      { id: '1', text: 'Respeta a todos los artistas y fandoms', order: 1 },
      { id: '2', text: 'No fanwars ni toxicidad', order: 2 },
      { id: '3', text: 'Usa advertencias de spoilers para dramas', order: 3 },
    ],
    memberCount: 0,
    postCount: 0,
    isOfficial: true,
    moderators: [],
    status: 'active',
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

  // Obtener comunidades creadas por usuarios (no oficiales, activas)
  getUserCommunities: async (): Promise<Community[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'communities'));
      const allCommunities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Community));

      // Filtrar: no oficiales y activas
      return allCommunities
        .filter(c => !c.isOfficial && c.status === 'active')
        .sort((a, b) => b.memberCount - a.memberCount);
    } catch (error) {
      console.error('Error getting user communities:', error);
      return [];
    }
  },

  // Obtener comunidades pendientes de aprobación (para admin)
  getPendingCommunities: async (): Promise<Community[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'communities'));
      const allCommunities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Community));

      return allCommunities
        .filter(c => c.status === 'pending')
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
    } catch (error) {
      console.error('Error getting pending communities:', error);
      return [];
    }
  },

  // Aprobar una comunidad (para admin)
  approveCommunity: async (communityId: string): Promise<void> => {
    try {
      const communityRef = doc(db, 'communities', communityId);
      await updateDoc(communityRef, {
        status: 'active',
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error approving community:', error);
      throw error;
    }
  },

  // Rechazar una comunidad (para admin)
  rejectCommunity: async (communityId: string): Promise<void> => {
    try {
      const communityRef = doc(db, 'communities', communityId);
      await updateDoc(communityRef, {
        status: 'rejected',
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error rejecting community:', error);
      throw error;
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

  // Obtener comunidades a las que el usuario se ha unido
  getJoinedCommunities: async (userId: string): Promise<Community[]> => {
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
        status: 'active', // Categorías creadas por usuarios quedan activas inmediatamente
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
