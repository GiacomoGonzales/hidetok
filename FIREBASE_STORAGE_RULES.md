# Configuración de Reglas de Firebase Storage

## Problema común: Error al subir imágenes

Si experimentas errores al subir imágenes, probablemente sea porque las **reglas de Firebase Storage** están muy restrictivas.

## Solución: Configurar reglas de Storage

### 1. Ve a Firebase Console
- Abre https://console.firebase.google.com
- Selecciona tu proyecto: `hidetok-9a642`
- Ve a **Storage** en el menú lateral

### 2. Configura las reglas
- Haz clic en la pestaña **Rules**
- Reemplaza las reglas existentes con:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Permitir lectura y escritura para usuarios autenticados
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
    
    // Reglas específicas para imágenes de posts
    match /images/posts/{userId}/{fileName} {
      allow read: if true; // Cualquiera puede leer (posts públicos)
      allow write: if request.auth != null 
                   && request.auth.uid == userId
                   && resource == null // Solo crear, no sobrescribir
                   && request.resource.size < 5 * 1024 * 1024 // Max 5MB
                   && request.resource.contentType.matches('image/.*');
    }
    
    // Reglas específicas para imágenes de perfil
    match /images/profile/{userId}/{fileName} {
      allow read: if true; // Cualquiera puede leer avatares
      allow write: if request.auth != null 
                   && request.auth.uid == userId
                   && request.resource.size < 2 * 1024 * 1024 // Max 2MB
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

### 3. Publica las reglas
- Haz clic en **Publish** para aplicar las nuevas reglas

## Reglas explicadas:

- **`request.auth != null`**: Solo usuarios autenticados pueden subir
- **`request.auth.uid == userId`**: Solo puedes subir a tu propia carpeta
- **`resource == null`**: Solo crear archivos nuevos (no sobrescribir)
- **`request.resource.size < 5MB`**: Limitar tamaño de archivos
- **`contentType.matches('image/.*')`**: Solo permitir imágenes

## Reglas temporales (solo para testing):

Si quieres probar rápidamente sin restricciones:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **ADVERTENCIA**: Estas reglas permiten a cualquiera subir/leer archivos. Solo úsalas para testing.

## Verificar configuración:

1. Las reglas deben estar publicadas
2. Tu usuario debe estar autenticado
3. La conexión a internet debe funcionar
4. El Storage debe estar habilitado en tu proyecto Firebase
