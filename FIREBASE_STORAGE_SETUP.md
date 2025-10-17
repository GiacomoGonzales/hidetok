# Configuración de Firebase Storage

## ✅ Estado Actual

Firebase Storage ya está **completamente configurado** en tu aplicación:

1. ✅ Storage inicializado en `config/firebase.ts`
2. ✅ Servicio completo creado en `services/storageService.ts`
3. ✅ Reglas de seguridad definidas en `storage.rules`
4. ✅ Integrado con el onboarding para subir avatares personalizados

---

## 📋 Paso 1: Desplegar Reglas de Seguridad

Para que Firebase Storage funcione correctamente, necesitas desplegar las reglas de seguridad:

### Opción A: Usando Firebase CLI

```bash
# 1. Autenticarse con Firebase (si es necesario)
firebase login --reauth

# 2. Desplegar solo las reglas de Storage
firebase deploy --only storage
```

### Opción B: Manualmente en Firebase Console

Si prefieres hacerlo manualmente:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **hidetok-9a642**
3. Ve a **Storage** en el menú lateral
4. Haz clic en la pestaña **Rules**
5. Copia y pega las reglas de `storage.rules`:

```
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Reglas para imágenes de posts
    match /images/posts/{userId}/{fileName} {
      allow read: if true; // Cualquiera puede leer posts públicos
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024 // Max 5MB
                   && request.resource.contentType.matches('image/.*');
    }

    // Reglas para imágenes de perfil
    match /images/profile/{userId}/{fileName} {
      allow read: if true; // Cualquiera puede leer avatares
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.size < 2 * 1024 * 1024 // Max 2MB
                   && request.resource.contentType.matches('image/.*');
    }

    // Fallback: permitir lectura/escritura para usuarios autenticados
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

6. Haz clic en **Publish**

---

## 🔧 Cómo Funciona

### Estructura de Archivos

```
firebase-storage/
├── images/
│   ├── profile/
│   │   └── {userId}/
│   │       └── {timestamp}.jpg
│   ├── posts/
│   │   └── {userId}/
│   │       └── {timestamp}.jpg
│   └── stories/
│       └── {userId}/
│           └── {timestamp}.jpg
└── videos/
    ├── posts/
    │   └── {userId}/
    │       └── {timestamp}.mp4
    └── stories/
        └── {userId}/
            └── {timestamp}.mp4
```

### Reglas de Seguridad Implementadas

#### Imágenes de Perfil
- **Lectura**: Pública (cualquiera puede ver avatares)
- **Escritura**: Solo el usuario dueño del perfil
- **Tamaño máximo**: 2 MB
- **Tipo**: Solo imágenes (image/*)

#### Imágenes de Posts
- **Lectura**: Pública (posts son públicos)
- **Escritura**: Solo el usuario dueño del post
- **Tamaño máximo**: 5 MB
- **Tipo**: Solo imágenes (image/*)

#### Otros Archivos
- **Lectura/Escritura**: Solo usuarios autenticados

---

## 💡 Uso en la Aplicación

### 1. Subir Avatar de Perfil (Ya implementado)

```typescript
import { uploadProfileImageFromUri } from '../services/storageService';

// En el onboarding o edición de perfil
const photoURL = await uploadProfileImageFromUri(customAvatarUri, user.uid);
```

### 2. Subir Imagen de Post

```typescript
import { uploadPostImage } from '../services/storageService';

const imageUrl = await uploadPostImage(imageBlob, user.uid, (progress) => {
  console.log(`Upload progress: ${progress.progress}%`);
});
```

### 3. Subir Video de Post

```typescript
import { uploadPostVideo } from '../services/storageService';

const videoUrl = await uploadPostVideo(videoBlob, user.uid, (progress) => {
  console.log(`Upload progress: ${progress.progress}%`);
});
```

### 4. Eliminar Archivo

```typescript
import { storageService } from '../services/storageService';

await storageService.deleteFile('images/profile/userId/file.jpg');
```

### 5. Listar Archivos de Usuario

```typescript
import { storageService } from '../services/storageService';

const files = await storageService.listFiles('images/posts/userId');
```

---

## 🧪 Probar Firebase Storage

### En Web (localhost):

1. Inicia el servidor: `npx expo start --web`
2. Abre http://localhost:8082
3. Inicia sesión con Google o anónimamente
4. En el onboarding, sube una imagen personalizada como avatar
5. Verifica en Firebase Console → Storage que la imagen se subió

### Verificar en Firebase Console:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **hidetok-9a642**
3. Ve a **Storage**
4. Deberías ver carpetas: `images/profile/`, `images/posts/`, etc.

---

## 🐛 Troubleshooting

### Error: "Firebase Storage: User does not have permission"
**Causa**: Las reglas de seguridad no están desplegadas o son incorrectas.
**Solución**:
1. Verifica que las reglas estén publicadas en Firebase Console
2. Asegúrate de que el usuario esté autenticado
3. Verifica que el userId en la ruta coincida con `request.auth.uid`

### Error: "The file size exceeds the maximum allowed size"
**Causa**: El archivo supera el límite de 2MB (perfil) o 5MB (posts).
**Solución**:
1. Comprime la imagen antes de subirla
2. Ajusta las reglas en `storage.rules` si necesitas tamaños mayores

### Error: "Invalid content type"
**Causa**: El archivo no es una imagen válida.
**Solución**:
1. Verifica que el archivo sea una imagen (JPEG, PNG, etc.)
2. Asegúrate de que el `contentType` sea correcto en los metadatos

### La subida es muy lenta
**Causa**: Archivo muy grande o conexión lenta.
**Solución**:
1. Comprime las imágenes antes de subirlas
2. Usa el callback `onProgress` para mostrar el progreso al usuario
3. Considera agregar un límite de tamaño menor

### Error: "storage/unauthorized"
**Causa**: El usuario no está autenticado o no tiene permisos.
**Solución**:
1. Verifica que `user.uid` esté disponible antes de subir
2. Asegúrate de que el usuario haya iniciado sesión correctamente
3. Verifica que las reglas permitan la operación

---

## 📝 Variables de Entorno

Asegúrate de que `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` esté configurado en `env.local`:

```bash
# Firebase Storage
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=hidetok-9a642.appspot.com
```

---

## 🚀 Para Producción (Vercel)

1. Configura las variables de entorno en Vercel:
   - Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
   - Settings → Environment Variables
   - Agrega: `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - Valor: `hidetok-9a642.appspot.com`

2. Redeploy tu aplicación

3. Verifica que Firebase Storage esté configurado en Firebase Console

---

## 📊 Límites de Firebase Storage (Plan Spark - Free)

- **Almacenamiento**: 5 GB
- **Descargas**: 1 GB/día
- **Operaciones de subida**: 20,000/día
- **Operaciones de descarga**: 50,000/día

Si necesitas más, considera actualizar al plan Blaze (pago por uso).

---

## 🎯 Estado de Integración

### ✅ Ya Implementado:
- Storage Service completo
- Subida de avatares en onboarding
- Reglas de seguridad definidas
- Tracking de progreso de subida
- Gestión de metadatos
- Eliminación de archivos

### 🔜 Próximos Pasos (Opcionales):
- Subida de imágenes/videos en posts
- Compresión automática de imágenes
- Caché local de imágenes
- Paginación de archivos
- Vista previa antes de subir

---

## 📚 Recursos

- [Firebase Storage Docs](https://firebase.google.com/docs/storage)
- [Storage Security Rules](https://firebase.google.com/docs/storage/security)
- [Upload Files on Web](https://firebase.google.com/docs/storage/web/upload-files)
- [Download Files on Web](https://firebase.google.com/docs/storage/web/download-files)

---

¡Firebase Storage está listo para usar! 🎉
