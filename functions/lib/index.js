"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessagePushNotification = exports.sendPushNotification = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Inicializar Firebase Admin solo si no está inicializado
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
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
// Verificar si es un token válido de Expo
function isExpoPushToken(token) {
    return typeof token === 'string' &&
        (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));
}
// Función helper para enviar push via Expo API directamente
async function sendExpoPush(pushToken, title, body, data) {
    if (!isExpoPushToken(pushToken)) {
        console.error('Token de push inválido:', pushToken);
        return null;
    }
    const message = {
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
        badge: 1,
        priority: 'high',
    };
    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });
        const result = await response.json();
        console.log('Expo push response:', result);
        return result;
    }
    catch (error) {
        console.error('Error enviando push:', error);
        return null;
    }
}
// Cloud Function que se dispara cuando se crea una notificación
exports.sendPushNotification = functions
    .region('us-central1')
    .firestore.document('notifications/{notificationId}')
    .onCreate(async (snapshot, context) => {
    var _a, _b;
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
        // Obtener el mensaje según el tipo de notificación
        const messageGenerator = notificationMessages[type];
        if (!messageGenerator) {
            console.log('Tipo de notificación no soportado:', type);
            return null;
        }
        const { title, body } = messageGenerator(senderName || 'Alguien');
        const data = {
            type,
            postId: postId || null,
            commentId: commentId || null,
            senderId: senderId || null,
            conversationId: conversationId || null,
            notificationId: context.params.notificationId,
        };
        const result = await sendExpoPush(pushToken, title, body, data);
        if (((_a = result === null || result === void 0 ? void 0 : result.data) === null || _a === void 0 ? void 0 : _a.status) === 'error') {
            console.error('Error en push:', result.data.message);
            if (((_b = result.data.details) === null || _b === void 0 ? void 0 : _b.error) === 'DeviceNotRegistered') {
                await db.collection('users').doc(recipientId).update({
                    pushToken: admin.firestore.FieldValue.delete(),
                });
                console.log('Token inválido eliminado del usuario');
            }
        }
        console.log('Push notification enviada para:', type);
        return { success: true };
    }
    catch (error) {
        console.error('Error en sendPushNotification:', error);
        return { success: false, error };
    }
});
// Cloud Function para enviar push de nuevos mensajes
exports.sendMessagePushNotification = functions
    .region('us-central1')
    .firestore.document('conversations/{conversationId}/messages/{messageId}')
    .onCreate(async (snapshot, context) => {
    const messageData = snapshot.data();
    const { senderId, content } = messageData;
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
        for (const participantId of participants) {
            if (participantId === senderId)
                continue;
            const participantDoc = await db.collection('users').doc(participantId).get();
            const participantData = participantDoc.data();
            const pushToken = participantData === null || participantData === void 0 ? void 0 : participantData.pushToken;
            if (pushToken) {
                await sendExpoPush(pushToken, senderName, (content === null || content === void 0 ? void 0 : content.substring(0, 100)) || 'Te envió un mensaje', { type: 'message', conversationId, senderId });
            }
        }
        console.log('Push notifications de mensaje enviadas');
        return { success: true };
    }
    catch (error) {
        console.error('Error en sendMessagePushNotification:', error);
        return { success: false, error };
    }
});
//# sourceMappingURL=index.js.map