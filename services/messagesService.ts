import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  arrayUnion,
  setDoc,
  or,
  and,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Tipos para mensajería
export interface Message {
  id?: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: Timestamp;
  read: boolean;
  type: 'text' | 'image' | 'file';
  imageUrl?: string;
  fileUrl?: string;
}

export interface ParticipantData {
  displayName: string;
  avatarType?: 'predefined' | 'custom';
  avatarId?: string;
  photoURL?: string;
  photoURLThumbnail?: string;
  lastSeen?: Timestamp;
}

export interface Conversation {
  id?: string;
  participants: string[]; // Array de user IDs
  participantsData: { [userId: string]: ParticipantData };
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: Timestamp;
    read: boolean;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

class MessagesService {
  /**
   * Obtener o crear una conversación entre dos usuarios
   */
  async getOrCreateConversation(
    currentUserId: string,
    otherUserId: string,
    currentUserData: ParticipantData,
    otherUserData: ParticipantData
  ): Promise<string> {
    try {
      // Buscar conversación existente
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', currentUserId)
      );

      const querySnapshot = await getDocs(q);

      // Buscar si existe una conversación con ambos usuarios
      let existingConversationId: string | null = null;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.participants.includes(otherUserId)) {
          existingConversationId = doc.id;
        }
      });

      // Si existe, retornar el ID
      if (existingConversationId) {
        return existingConversationId;
      }

      // Si no existe, crear nueva conversación
      // Filtrar campos undefined para evitar errores de Firestore
      const cleanUserData = (data: ParticipantData): ParticipantData => {
        const cleaned: any = {
          displayName: data.displayName,
        };
        if (data.avatarType) cleaned.avatarType = data.avatarType;
        if (data.avatarId) cleaned.avatarId = data.avatarId;
        if (data.photoURL) cleaned.photoURL = data.photoURL;
        if (data.lastSeen) cleaned.lastSeen = data.lastSeen;
        return cleaned;
      };

      const newConversation: Omit<Conversation, 'id'> = {
        participants: [currentUserId, otherUserId],
        participantsData: {
          [currentUserId]: cleanUserData(currentUserData),
          [otherUserId]: cleanUserData(otherUserData),
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(conversationsRef, newConversation);
      return docRef.id;
    } catch (error) {
      console.error('Error obteniendo o creando conversación:', error);
      throw error;
    }
  }

  /**
   * Enviar un mensaje en una conversación
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: 'text' | 'image' | 'file' = 'text',
    mediaUrl?: string
  ): Promise<string> {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');

      const newMessage: Omit<Message, 'id'> = {
        conversationId,
        senderId,
        content,
        timestamp: Timestamp.now(),
        read: false,
        type,
      };

      if (type === 'image' && mediaUrl) {
        newMessage.imageUrl = mediaUrl;
      } else if (type === 'file' && mediaUrl) {
        newMessage.fileUrl = mediaUrl;
      }

      // Agregar mensaje
      const messageDoc = await addDoc(messagesRef, newMessage);

      // Actualizar último mensaje en la conversación
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        lastMessage: {
          content,
          senderId,
          timestamp: Timestamp.now(),
          read: false,
        },
        updatedAt: Timestamp.now(),
      });

      return messageDoc.id;
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las conversaciones de un usuario
   */
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const conversations: Conversation[] = [];

      querySnapshot.forEach((doc) => {
        conversations.push({ id: doc.id, ...doc.data() } as Conversation);
      });

      return conversations;
    } catch (error) {
      console.error('Error obteniendo conversaciones:', error);
      throw error;
    }
  }

  /**
   * Obtener mensajes de una conversación
   */
  async getMessages(conversationId: string, limitCount = 50): Promise<Message[]> {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const q = query(
        messagesRef,
        orderBy('timestamp', 'asc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const messages: Message[] = [];

      querySnapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() } as Message);
      });

      return messages;
    } catch (error) {
      console.error('Error obteniendo mensajes:', error);
      throw error;
    }
  }

  /**
   * Marcar mensajes como leídos
   */
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      // Consulta simplificada para evitar índice compuesto
      // Filtramos por senderId en el cliente
      const q = query(
        messagesRef,
        where('read', '==', false)
      );

      const querySnapshot = await getDocs(q);

      // Filtrar mensajes que no son del usuario actual (client-side)
      const messagesToUpdate = querySnapshot.docs.filter(
        (document) => document.data().senderId !== userId
      );

      const updatePromises = messagesToUpdate.map((document) =>
        updateDoc(doc(db, 'conversations', conversationId, 'messages', document.id), {
          read: true,
        })
      );

      await Promise.all(updatePromises);

      // Actualizar también el lastMessage si es necesario
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);

      if (conversationSnap.exists()) {
        const data = conversationSnap.data();
        if (data.lastMessage && data.lastMessage.senderId !== userId && !data.lastMessage.read) {
          await updateDoc(conversationRef, {
            'lastMessage.read': true,
          });
        }
      }
    } catch (error) {
      console.error('Error marcando mensajes como leídos:', error);
      throw error;
    }
  }

  /**
   * Suscribirse a cambios en una conversación (tiempo real)
   */
  subscribeToMessages(
    conversationId: string,
    callback: (messages: Message[]) => void
  ): () => void {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'));

      return onSnapshot(q, (querySnapshot) => {
        const messages: Message[] = [];
        querySnapshot.forEach((doc) => {
          messages.push({ id: doc.id, ...doc.data() } as Message);
        });
        callback(messages);
      });
    } catch (error) {
      console.error('Error suscribiéndose a mensajes:', error);
      throw error;
    }
  }

  /**
   * Suscribirse a cambios en conversaciones (tiempo real)
   */
  subscribeToConversations(
    userId: string,
    callback: (conversations: Conversation[]) => void
  ): () => void {
    try {
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', userId)
        // Ordenar en el cliente temporalmente hasta que se cree el índice en Firebase
        // Para crear el índice, ve a: Firebase Console > Firestore > Indexes
      );

      return onSnapshot(q, (querySnapshot) => {
        const conversations: Conversation[] = [];
        querySnapshot.forEach((doc) => {
          conversations.push({ id: doc.id, ...doc.data() } as Conversation);
        });

        // Ordenar por updatedAt en el cliente
        conversations.sort((a, b) => {
          const timeA = a.updatedAt?.toMillis() || 0;
          const timeB = b.updatedAt?.toMillis() || 0;
          return timeB - timeA; // desc
        });

        callback(conversations);
      });
    } catch (error) {
      console.error('Error suscribiéndose a conversaciones:', error);
      throw error;
    }
  }

  /**
   * Eliminar una conversación
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      // Primero eliminar todos los mensajes
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);

      const deletePromises = messagesSnapshot.docs.map((document) =>
        updateDoc(doc(db, 'conversations', conversationId, 'messages', document.id), {})
      );

      await Promise.all(deletePromises);

      // Luego eliminar la conversación
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {});
    } catch (error) {
      console.error('Error eliminando conversación:', error);
      throw error;
    }
  }
}

export const messagesService = new MessagesService();
