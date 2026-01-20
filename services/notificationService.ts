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
  writeBatch,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Tipos de notificación
export type NotificationType =
  | 'like'           // Alguien dio like a tu post
  | 'comment'        // Alguien comentó en tu post
  | 'follow'         // Alguien te siguió
  | 'mention'        // Alguien te mencionó
  | 'repost'         // Alguien reposteó tu post
  | 'reply'          // Alguien respondió a tu comentario
  | 'community_post'; // Nuevo post en una comunidad que sigues

export interface Notification {
  id?: string;
  type: NotificationType;
  recipientId: string;      // Usuario que recibe la notificación
  senderId: string;         // Usuario que generó la acción
  senderName: string;       // Nombre del sender (para mostrar sin query extra)
  senderAvatar?: string;    // Avatar del sender
  senderAvatarType?: 'predefined' | 'custom';
  senderAvatarId?: string;
  postId?: string;          // ID del post relacionado (si aplica)
  postContent?: string;     // Preview del contenido del post
  commentId?: string;       // ID del comentario (si aplica)
  commentContent?: string;  // Preview del comentario
  communityId?: string;     // ID de la comunidad (si aplica)
  communityName?: string;   // Nombre de la comunidad
  read: boolean;
  createdAt: Timestamp;
}

// Crear notificación genérica
const createNotification = async (
  notification: Omit<Notification, 'id' | 'createdAt' | 'read'>
): Promise<string | null> => {
  try {
    // No crear notificación si el sender es el mismo que el recipient
    if (notification.senderId === notification.recipientId) {
      return null;
    }

    const notificationData: Omit<Notification, 'id'> = {
      ...notification,
      read: false,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'notifications'), notificationData);
    console.log('🔔 Notificación creada:', notification.type);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

export const notificationService = {
  // Crear notificación de like
  createLikeNotification: async (
    postOwnerId: string,
    senderId: string,
    senderName: string,
    senderAvatar: { type?: string; id?: string; url?: string },
    postId: string,
    postContent: string
  ): Promise<string | null> => {
    return createNotification({
      type: 'like',
      recipientId: postOwnerId,
      senderId,
      senderName,
      senderAvatar: senderAvatar.url,
      senderAvatarType: senderAvatar.type as 'predefined' | 'custom',
      senderAvatarId: senderAvatar.id,
      postId,
      postContent: postContent.substring(0, 100), // Limitar preview
    });
  },

  // Crear notificación de comentario
  createCommentNotification: async (
    postOwnerId: string,
    senderId: string,
    senderName: string,
    senderAvatar: { type?: string; id?: string; url?: string },
    postId: string,
    postContent: string,
    commentId: string,
    commentContent: string
  ): Promise<string | null> => {
    return createNotification({
      type: 'comment',
      recipientId: postOwnerId,
      senderId,
      senderName,
      senderAvatar: senderAvatar.url,
      senderAvatarType: senderAvatar.type as 'predefined' | 'custom',
      senderAvatarId: senderAvatar.id,
      postId,
      postContent: postContent.substring(0, 100),
      commentId,
      commentContent: commentContent.substring(0, 100),
    });
  },

  // Crear notificación de follow
  createFollowNotification: async (
    followedUserId: string,
    senderId: string,
    senderName: string,
    senderAvatar: { type?: string; id?: string; url?: string }
  ): Promise<string | null> => {
    return createNotification({
      type: 'follow',
      recipientId: followedUserId,
      senderId,
      senderName,
      senderAvatar: senderAvatar.url,
      senderAvatarType: senderAvatar.type as 'predefined' | 'custom',
      senderAvatarId: senderAvatar.id,
    });
  },

  // Crear notificación de repost
  createRepostNotification: async (
    postOwnerId: string,
    senderId: string,
    senderName: string,
    senderAvatar: { type?: string; id?: string; url?: string },
    postId: string,
    postContent: string
  ): Promise<string | null> => {
    return createNotification({
      type: 'repost',
      recipientId: postOwnerId,
      senderId,
      senderName,
      senderAvatar: senderAvatar.url,
      senderAvatarType: senderAvatar.type as 'predefined' | 'custom',
      senderAvatarId: senderAvatar.id,
      postId,
      postContent: postContent.substring(0, 100),
    });
  },

  // Crear notificación de mención
  createMentionNotification: async (
    mentionedUserId: string,
    senderId: string,
    senderName: string,
    senderAvatar: { type?: string; id?: string; url?: string },
    postId: string,
    postContent: string
  ): Promise<string | null> => {
    return createNotification({
      type: 'mention',
      recipientId: mentionedUserId,
      senderId,
      senderName,
      senderAvatar: senderAvatar.url,
      senderAvatarType: senderAvatar.type as 'predefined' | 'custom',
      senderAvatarId: senderAvatar.id,
      postId,
      postContent: postContent.substring(0, 100),
    });
  },

  // Crear notificación de respuesta a comentario
  createReplyNotification: async (
    commentOwnerId: string,
    senderId: string,
    senderName: string,
    senderAvatar: { type?: string; id?: string; url?: string },
    postId: string,
    commentId: string,
    replyContent: string
  ): Promise<string | null> => {
    return createNotification({
      type: 'reply',
      recipientId: commentOwnerId,
      senderId,
      senderName,
      senderAvatar: senderAvatar.url,
      senderAvatarType: senderAvatar.type as 'predefined' | 'custom',
      senderAvatarId: senderAvatar.id,
      postId,
      commentId,
      commentContent: replyContent.substring(0, 100),
    });
  },

  // Obtener notificaciones del usuario
  getNotifications: async (
    userId: string,
    limitCount: number = 20,
    lastDoc?: DocumentSnapshot
  ): Promise<{ notifications: Notification[]; lastDoc: DocumentSnapshot | null }> => {
    try {
      let q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));

      const newLastDoc = snapshot.docs.length > 0
        ? snapshot.docs[snapshot.docs.length - 1]
        : null;

      return { notifications, lastDoc: newLastDoc };
    } catch (error) {
      console.error('Error getting notifications:', error);
      return { notifications: [], lastDoc: null };
    }
  },

  // Obtener conteo de notificaciones no leídas
  getUnreadCount: async (userId: string): Promise<number> => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  },

  // Escuchar notificaciones en tiempo real
  subscribeToNotifications: (
    userId: string,
    callback: (notifications: Notification[]) => void,
    limitCount: number = 20
  ): (() => void) => {
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));
      callback(notifications);
    }, (error) => {
      console.error('Error subscribing to notifications:', error);
    });
  },

  // Escuchar conteo de no leídas en tiempo real
  subscribeToUnreadCount: (
    userId: string,
    callback: (count: number) => void
  ): (() => void) => {
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      where('read', '==', false)
    );

    return onSnapshot(q, (snapshot) => {
      callback(snapshot.size);
    }, (error) => {
      console.error('Error subscribing to unread count:', error);
      callback(0);
    });
  },

  // Marcar notificación como leída
  markAsRead: async (notificationId: string): Promise<void> => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  // Marcar todas como leídas
  markAllAsRead: async (userId: string): Promise<void> => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) return;

      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { read: true });
      });
      await batch.commit();
      console.log('✅ Todas las notificaciones marcadas como leídas');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  },

  // Eliminar notificación
  deleteNotification: async (notificationId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  },

  // Eliminar notificaciones antiguas (más de 30 días)
  cleanOldNotifications: async (userId: string): Promise<void> => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId),
        where('createdAt', '<', Timestamp.fromDate(thirtyDaysAgo))
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) return;

      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`🗑️ ${snapshot.size} notificaciones antiguas eliminadas`);
    } catch (error) {
      console.error('Error cleaning old notifications:', error);
    }
  },

  // Eliminar notificación de like (cuando se quita el like)
  deleteLikeNotification: async (
    postOwnerId: string,
    senderId: string,
    postId: string
  ): Promise<void> => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', postOwnerId),
        where('senderId', '==', senderId),
        where('postId', '==', postId),
        where('type', '==', 'like')
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        await deleteDoc(snapshot.docs[0].ref);
        console.log('🗑️ Notificación de like eliminada');
      }
    } catch (error) {
      console.error('Error deleting like notification:', error);
    }
  },

  // Eliminar notificación de follow (cuando se deja de seguir)
  deleteFollowNotification: async (
    followedUserId: string,
    senderId: string
  ): Promise<void> => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', followedUserId),
        where('senderId', '==', senderId),
        where('type', '==', 'follow')
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        await deleteDoc(snapshot.docs[0].ref);
        console.log('🗑️ Notificación de follow eliminada');
      }
    } catch (error) {
      console.error('Error deleting follow notification:', error);
    }
  },
};

export default notificationService;
