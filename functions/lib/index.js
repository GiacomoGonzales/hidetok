"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessagePushNotification = exports.sendPushNotification = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const expo_server_sdk_1 = require("expo-server-sdk");
// Inicializar Firebase Admin
admin.initializeApp();
const db = admin.firestore();
// Crear cliente de Expo
const expo = new expo_server_sdk_1.Expo();
// Tipos de notificación y sus mensajes
const notificationMessages = {
    like: (senderName) => ({
        title: 'Nuevo like',
        body: `${senderName} le dio like a tu post`,
    }),
    comment: (senderName) => ({
        title: 'Nuevo comentario',
        body: `${senderName} comentó en tu post`,
    }),
    follow: (senderName) => ({
        title: 'Nuevo seguidor',
        body: `${senderName} comenzó a seguirte`,
    }),
    mention: (senderName) => ({
        title: 'Te mencionaron',
        body: `${senderName} te mencionó en un post`,
    }),
    repost: (senderName) => ({
        title: 'Nuevo repost',
        body: `${senderName} reposteó tu publicación`,
    }),
    reply: (senderName) => ({
        title: 'Nueva respuesta',
        body: `${senderName} respondió a tu comentario`,
    }),
    message: (senderName) => ({
        title: 'Nuevo mensaje',
        body: `${senderName} te envió un mensaje`,
    }),
};
// Cloud Function que se dispara cuando se crea una notificación
exports.sendPushNotification = functions.firestore
    .document('notifications/{notificationId}')
    .onCreate(async (snapshot, context) => {
    var _a;
    const notification = snapshot.data();
    const { recipientId, senderId, senderName, type, postId, commentId, conversationId } = notification;
    try {
        // Obtener el push token del destinatario
        const recipientDoc = await db.collection('users').doc(recipientId).get();
        if (!recipientDoc.exists) {
            console.log('Usuario destinatario no encontrado');
            return null;
        }
        const recipientData = recipientDoc.data();
        const pushToken = recipientData === null || recipientData === void 0 ? void 0 : recipientData.pushToken;
        if (!pushToken) {
            console.log('El usuario no tiene push token registrado');
            return null;
        }
        // Verificar que el token es válido para Expo
        if (!expo_server_sdk_1.Expo.isExpoPushToken(pushToken)) {
            console.error('Token de push inválido:', pushToken);
            return null;
        }
        // Obtener el mensaje según el tipo de notificación
        const messageGenerator = notificationMessages[type];
        if (!messageGenerator) {
            console.log('Tipo de notificación no soportado:', type);
            return null;
        }
        const { title, body } = messageGenerator(senderName || 'Alguien');
        // Construir el mensaje de push
        const message = {
            to: pushToken,
            sound: 'default',
            title,
            body,
            data: {
                type,
                postId: postId || null,
                commentId: commentId || null,
                senderId: senderId || null,
                conversationId: conversationId || null,
                notificationId: context.params.notificationId,
            },
            badge: 1,
            priority: 'high',
        };
        // Enviar la notificación
        const chunks = expo.chunkPushNotifications([message]);
        const tickets = [];
        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
                console.log('Push notification enviada:', ticketChunk);
            }
            catch (error) {
                console.error('Error enviando push notification:', error);
            }
        }
        // Verificar errores en los tickets
        for (const ticket of tickets) {
            if (ticket.status === 'error') {
                console.error('Error en ticket:', ticket.message);
                // Si el token es inválido, eliminarlo del usuario
                if (((_a = ticket.details) === null || _a === void 0 ? void 0 : _a.error) === 'DeviceNotRegistered') {
                    await db.collection('users').doc(recipientId).update({
                        pushToken: admin.firestore.FieldValue.delete(),
                    });
                    console.log('Token inválido eliminado del usuario');
                }
            }
        }
        return { success: true, tickets };
    }
    catch (error) {
        console.error('Error en sendPushNotification:', error);
        return { success: false, error };
    }
});
// Cloud Function para enviar push de nuevos mensajes
exports.sendMessagePushNotification = functions.firestore
    .document('conversations/{conversationId}/messages/{messageId}')
    .onCreate(async (snapshot, context) => {
    const message = snapshot.data();
    const { senderId, text } = message;
    const { conversationId } = context.params;
    try {
        // Obtener la conversación para saber los participantes
        const conversationDoc = await db.collection('conversations').doc(conversationId).get();
        if (!conversationDoc.exists) {
            return null;
        }
        const conversationData = conversationDoc.data();
        const participants = (conversationData === null || conversationData === void 0 ? void 0 : conversationData.participants) || [];
        // Obtener datos del sender
        const senderDoc = await db.collection('users').doc(senderId).get();
        const senderData = senderDoc.data();
        const senderName = (senderData === null || senderData === void 0 ? void 0 : senderData.displayName) || 'Alguien';
        // Enviar push a todos los participantes excepto al sender
        const messages = [];
        for (const participantId of participants) {
            if (participantId === senderId)
                continue;
            const participantDoc = await db.collection('users').doc(participantId).get();
            const participantData = participantDoc.data();
            const pushToken = participantData === null || participantData === void 0 ? void 0 : participantData.pushToken;
            if (pushToken && expo_server_sdk_1.Expo.isExpoPushToken(pushToken)) {
                messages.push({
                    to: pushToken,
                    sound: 'default',
                    title: senderName,
                    body: (text === null || text === void 0 ? void 0 : text.substring(0, 100)) || 'Te envió un mensaje',
                    data: {
                        type: 'message',
                        conversationId,
                        senderId,
                    },
                    badge: 1,
                    priority: 'high',
                });
            }
        }
        if (messages.length === 0) {
            return null;
        }
        // Enviar las notificaciones
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
            await expo.sendPushNotificationsAsync(chunk);
        }
        console.log(`Push notifications de mensaje enviadas a ${messages.length} usuarios`);
        return { success: true };
    }
    catch (error) {
        console.error('Error en sendMessagePushNotification:', error);
        return { success: false, error };
    }
});
//# sourceMappingURL=index.js.map