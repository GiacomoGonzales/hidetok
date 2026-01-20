# Guía de Likes y Follows - Arquitectura Escalable

## 📋 Resumen

Esta aplicación implementa un sistema de likes y follows optimizado para redes sociales de alto alcance, siguiendo las mejores prácticas de Firebase.

## 🏗️ Arquitectura

### Estrategia: Denormalización + Colecciones Separadas

```
Firestore:
├── users/              (Colección principal)
│   └── {userId}
│       ├── followers: number    (contador denormalizado)
│       └── following: number    (contador denormalizado)
│
├── posts/              (Colección principal)
│   └── {postId}
│       └── likes: number        (contador denormalizado)
│
├── likes/              (Colección de relaciones)
│   └── {userId}_{postId}        (ID compuesto para performance)
│       ├── userId: string
│       ├── postId: string
│       └── createdAt: Timestamp
│
└── follows/            (Colección de relaciones)
    └── {followerId}_{followingId}  (ID compuesto)
        ├── followerId: string
        ├── followingId: string
        └── createdAt: Timestamp
```

### ✅ Ventajas de esta arquitectura:

1. **Performance**: Queries súper rápidas gracias a IDs compuestos
2. **Escalabilidad**: Maneja millones de usuarios sin problemas
3. **Consistencia**: Batch writes mantienen datos sincronizados
4. **Flexibilidad**: Fácil implementar features avanzadas (followers, analytics, etc.)

## 🚀 Pasos para Configurar

### 1. Crear Índices en Firebase Console

⚠️ **IMPORTANTE**: Sin estos índices, las queries fallarán.

#### Para `likes`:
```
Colección: likes
- userId (Ascending) + createdAt (Descending)
- postId (Ascending) + createdAt (Descending)
```

#### Para `follows`:
```
Colección: follows
- followerId (Ascending) + createdAt (Descending)
- followingId (Ascending) + createdAt (Descending)
```

**Cómo crear:**
1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. Ve a `Firestore Database` > `Indexes`
4. Click en `Create Index`
5. Crea cada índice según las especificaciones arriba

💡 **Tip**: También puedes esperar a que Firebase te sugiera crear los índices automáticamente cuando ejecutes las queries por primera vez.

### 2. Reglas de Seguridad de Firestore

Actualiza tus reglas de seguridad para permitir acceso a las nuevas colecciones:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Likes
    match /likes/{likeId} {
      // Solo el dueño puede crear/eliminar su like
      allow create: if request.auth != null
                    && request.resource.data.userId == request.auth.uid;
      allow delete: if request.auth != null
                    && resource.data.userId == request.auth.uid;
      // Todos pueden leer likes
      allow read: if true;
    }

    // Follows
    match /follows/{followId} {
      // Solo el seguidor puede crear/eliminar el follow
      allow create: if request.auth != null
                    && request.resource.data.followerId == request.auth.uid;
      allow delete: if request.auth != null
                    && resource.data.followerId == request.auth.uid;
      // Todos pueden leer follows
      allow read: if true;
    }

    // Posts - actualizar para permitir incrementos de likes
    match /posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null
                    && resource.data.userId == request.auth.uid;
    }

    // Users - actualizar para permitir incrementos de followers/following
    match /users/{userId} {
      allow read: if true;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null;
    }
  }
}
```

## 📚 Uso en el Código

### Likes

#### Usando el Hook (Recomendado):
```typescript
import { useLikes } from '../hooks/useLikes';

function PostCard({ post }) {
  const { isLiked, likesCount, toggleLike, isToggling } = useLikes(
    post.id,
    post.likes
  );

  return (
    <TouchableOpacity
      onPress={toggleLike}
      disabled={isToggling}
    >
      <Ionicons
        name={isLiked ? "heart" : "heart-outline"}
        color={isLiked ? "red" : "gray"}
      />
      <Text>{likesCount}</Text>
    </TouchableOpacity>
  );
}
```

#### Usando el Servicio Directamente:
```typescript
import { likesService } from '../services/likesService';

// Dar like
await likesService.likePost(userId, postId);

// Quitar like
await likesService.unlikePost(userId, postId);

// Toggle
const isNowLiked = await likesService.toggleLike(userId, postId);

// Verificar si usuario dio like
const hasLiked = await likesService.hasUserLiked(userId, postId);

// Obtener todos los posts con like del usuario
const likedPostIds = await likesService.getUserLikedPosts(userId);

// Obtener usuarios que dieron like a un post
const userIds = await likesService.getPostLikers(postId);
```

### Follows

#### Usando el Hook (Recomendado):
```typescript
import { useFollow } from '../hooks/useFollow';

function UserProfile({ userId }) {
  const { isFollowing, toggleFollow, isToggling } = useFollow(userId);

  return (
    <TouchableOpacity
      onPress={toggleFollow}
      disabled={isToggling}
    >
      <Text>{isFollowing ? "Siguiendo" : "Seguir"}</Text>
    </TouchableOpacity>
  );
}
```

#### Usando el Servicio Directamente:
```typescript
import { followsService } from '../services/followsService';

// Seguir usuario
await followsService.followUser(followerId, followingId);

// Dejar de seguir
await followsService.unfollowUser(followerId, followingId);

// Toggle
const isNowFollowing = await followsService.toggleFollow(followerId, followingId);

// Verificar si sigue
const isFollowing = await followsService.isFollowing(followerId, followingId);

// Obtener lista de following
const followingIds = await followsService.getFollowing(userId);

// Obtener lista de followers
const followerIds = await followsService.getFollowers(userId);

// Obtener amigos mutuos
const mutualIds = await followsService.getMutualFollows(userId);
```

## 🔄 Subscripciones en Tiempo Real

### Likes en tiempo real:
```typescript
import { likesService } from '../services/likesService';

const unsubscribe = likesService.subscribeToPostLikes(
  postId,
  (likesCount, userIds) => {
    console.log(`Post tiene ${likesCount} likes de:`, userIds);
  }
);

// Cleanup
unsubscribe();
```

### Follows en tiempo real:
```typescript
import { followsService } from '../services/followsService';

// Suscribirse a followers
const unsubFollowers = followsService.subscribeToFollowers(
  userId,
  (followerIds) => {
    console.log('Nuevos followers:', followerIds);
  }
);

// Suscribirse a following
const unsubFollowing = followsService.subscribeToFollowing(
  userId,
  (followingIds) => {
    console.log('Siguiendo a:', followingIds);
  }
);
```

## 🛠️ Funciones de Mantenimiento

### Recalcular contadores (útil si hay inconsistencias):

```typescript
import { likesService } from '../services/likesService';
import { followsService } from '../services/followsService';

// Recalcular likes de un post
const actualLikes = await likesService.recalculatePostLikes(postId);

// Recalcular followers/following de un usuario
const counts = await followsService.recalculateUserFollowCounts(userId);
console.log(`Followers: ${counts.followers}, Following: ${counts.following}`);
```

### Limpiar datos al borrar usuario/post:

```typescript
// Al borrar un post, eliminar sus likes
await likesService.deletePostLikes(postId);

// Al borrar un usuario, eliminar todos sus likes
await likesService.deleteUserLikes(userId);

// Al borrar un usuario, eliminar todos sus follows
await followsService.deleteUserFollows(userId);
```

## 📊 Consideraciones de Performance

### Para feeds con muchos posts:

Usa `useMultipleLikes` para verificar likes en batch:

```typescript
import { useMultipleLikes } from '../hooks/useLikes';

function Feed({ posts }) {
  const postIds = posts.map(p => p.id);
  const { likesMap } = useMultipleLikes(postIds);

  return posts.map(post => (
    <PostCard
      key={post.id}
      post={post}
      isLiked={likesMap.get(post.id)}
    />
  ));
}
```

### Optimistic Updates

Los hooks ya implementan optimistic updates:
- UI se actualiza instantáneamente
- Si falla, se revierte automáticamente
- Mejor UX, especialmente en conexiones lentas

## 🚨 Troubleshooting

### "Missing or insufficient permissions"
- Verifica que las reglas de Firestore estén configuradas correctamente
- Asegúrate de que el usuario esté autenticado

### "FAILED_PRECONDITION: The query requires an index"
- Crea los índices necesarios en Firebase Console (ver sección 1)
- O espera y sigue el link que Firebase muestra en el error

### Contadores inconsistentes
- Usa las funciones de recálculo
- Considera implementar Cloud Functions para validación

## 🎯 Próximos Pasos Recomendados

1. **Notificaciones**: Crear servicio de notificaciones para likes y follows
2. **Cloud Functions**: Automatizar limpieza de datos huérfanos
3. **Analytics**: Trackear métricas de engagement
4. **Caching**: Implementar Redux/Context para cachear datos frecuentes
5. **Feed Personalizado**: Algoritmo para mostrar posts de usuarios seguidos

## 📱 Archivos Creados

- `services/likesService.ts` - Servicio completo de likes
- `services/followsService.ts` - Servicio completo de follows
- `hooks/useLikes.ts` - Hook personalizado para likes
- `hooks/useFollow.ts` - Hook personalizado para follows

## 📝 Integración Completada

Los siguientes componentes ya están integrados con los nuevos servicios:

- ✅ `components/PostCard.tsx` - Usa `useLikes`
- ✅ `screens/PostDetailScreen.tsx` - Usa `useLikes`

### Para integrar follows en perfiles de usuario:

```typescript
// En UserProfileScreen.tsx o similar
import { useFollow } from '../hooks/useFollow';

const { isFollowing, toggleFollow, canFollow } = useFollow(profileUserId);

// Mostrar botón solo si no es tu propio perfil
{canFollow && (
  <Button
    title={isFollowing ? "Siguiendo" : "Seguir"}
    onPress={toggleFollow}
  />
)}
```

---

🎉 **¡Todo listo!** Tu app ahora tiene un sistema de likes y follows escalable y optimizado.

Para dudas o mejoras, consulta la documentación de Firebase o los comentarios en el código de los servicios.
