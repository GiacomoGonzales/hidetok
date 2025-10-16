# Configuración de Variables de Entorno en Vercel

## 🚨 Problema Actual

Las variables de entorno NO están siendo incluidas en el build de producción. Los logs muestran:
```
EXPO_PUBLIC_FIREBASE_API_KEY: UNSET
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: UNSET
...
```

## ✅ Solución: Configurar Variables en Vercel

### Paso 1: Ir a Configuración de Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto: **hidetok**
3. Haz clic en **Settings** (en la barra superior)
4. En el menú lateral, haz clic en **Environment Variables**

### Paso 2: Agregar TODAS las Variables

Debes agregar **7 variables** en total. Para cada una:

1. Haz clic en **"Add New"** o **"+ Add Variable"**
2. En **"Key"**, escribe el nombre EXACTO de la variable
3. En **"Value"**, pega el valor real de Firebase
4. **MUY IMPORTANTE**: Marca el checkbox **"Production"** ✅
5. (Opcional) También puedes marcar **"Preview"** para testing
6. Haz clic en **"Save"**

### Variables a Agregar:

#### 1. EXPO_PUBLIC_FIREBASE_API_KEY
```
Key: EXPO_PUBLIC_FIREBASE_API_KEY
Value: [Tu API Key de Firebase Console]
Environment: ✅ Production
```

#### 2. EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
```
Key: EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
Value: hidetok-9a642.firebaseapp.com
Environment: ✅ Production
```

#### 3. EXPO_PUBLIC_FIREBASE_PROJECT_ID
```
Key: EXPO_PUBLIC_FIREBASE_PROJECT_ID
Value: hidetok-9a642
Environment: ✅ Production
```

#### 4. EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
```
Key: EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
Value: hidetok-9a642.firebasestorage.app
Environment: ✅ Production
```

#### 5. EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
```
Key: EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
Value: [Tu Sender ID de Firebase Console]
Environment: ✅ Production
```

#### 6. EXPO_PUBLIC_FIREBASE_APP_ID
```
Key: EXPO_PUBLIC_FIREBASE_APP_ID
Value: [Tu App ID de Firebase Console - formato: 1:XXXXXX:web:XXXXXX]
Environment: ✅ Production
```

#### 7. EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
```
Key: EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
Value: [Tu Measurement ID de Firebase Console - formato: G-XXXXXXXXXX]
Environment: ✅ Production
```

### Paso 3: Obtener los Valores desde Firebase Console

Si no tienes los valores a mano:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona el proyecto: **hidetok-9a642**
3. Haz clic en el ícono de engranaje ⚙️ → **Project Settings**
4. Scroll down hasta la sección **"Your apps"**
5. Deberías ver una app web (ícono `</>`)
6. Los valores estarán en el objeto `firebaseConfig`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",                           // ← EXPO_PUBLIC_FIREBASE_API_KEY
  authDomain: "hidetok-9a642.firebaseapp.com",   // ← EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
  projectId: "hidetok-9a642",                     // ← EXPO_PUBLIC_FIREBASE_PROJECT_ID
  storageBucket: "hidetok-9a642.firebasestorage.app", // ← EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "600935858829",              // ← EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  appId: "1:600935858829:web:...",                // ← EXPO_PUBLIC_FIREBASE_APP_ID
  measurementId: "G-..."                          // ← EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};
```

### Paso 4: Forzar un Nuevo Deploy

Una vez que hayas agregado TODAS las variables:

**Opción A: Desde el Dashboard**
1. Ve a la pestaña **"Deployments"** en Vercel
2. Encuentra el último deployment
3. Haz clic en los tres puntos **"..."**
4. Selecciona **"Redeploy"**
5. Asegúrate de marcar **"Use existing Build Cache"** como **OFF** (desactivado)
6. Haz clic en **"Redeploy"**

**Opción B: Push a GitHub** (Más fácil)
1. Haz cualquier cambio pequeño en el código (por ejemplo, agrega un comentario)
2. Commit y push:
   ```bash
   git add .
   git commit -m "trigger redeploy with env vars"
   git push
   ```
3. Vercel automáticamente iniciará un nuevo deployment

### Paso 5: Verificar el Deployment

1. Espera a que el deployment termine (2-5 minutos)
2. Abre tu app en producción
3. Abre la **Consola del Navegador** (F12)
4. Busca el log que dice: `🔍 Firebase config values:`
5. Deberías ver todos los valores como **"SET"** en lugar de **"UNSET"**

**Ejemplo de log exitoso:**
```
🔍 Firebase config values: {
  apiKey: 'SET',
  authDomain: 'SET',
  projectId: 'SET',
  storageBucket: 'SET',
  messagingSenderId: 'SET',
  appId: 'SET',
  measurementId: 'SET'
}
```

## 🔍 Troubleshooting

### Las variables siguen apareciendo como UNSET

**Problema**: No marcaste "Production" al agregar las variables
**Solución**:
1. Ve a Settings → Environment Variables
2. Para cada variable, haz clic en el ícono de editar (lápiz)
3. Asegúrate que **"Production"** esté marcado ✅
4. Haz un nuevo deploy

### Error: "Firebase: Error (auth/invalid-api-key)"

**Problema**: El valor de `EXPO_PUBLIC_FIREBASE_API_KEY` está vacío o incorrecto
**Solución**:
1. Verifica que copiaste el API Key completo desde Firebase Console
2. Asegúrate de que no haya espacios al inicio o final
3. Vuelve a pegar el valor en Vercel

### Error: "Cannot read properties of null (reading 'onAuthStateChanged')"

**Problema**: Firebase no se inicializó porque falta alguna variable
**Solución**:
1. Verifica que **TODAS** las 7 variables estén configuradas
2. Verifica que no haya typos en los nombres de las variables
3. Los nombres deben ser EXACTAMENTE como se muestran arriba (sensibles a mayúsculas)

## 📋 Checklist Final

- [ ] Agregué las 7 variables de entorno en Vercel
- [ ] Todas las variables tienen el prefijo `EXPO_PUBLIC_`
- [ ] Marqué "Production" para todas las variables
- [ ] Verifiqué que los valores sean los correctos desde Firebase Console
- [ ] Hice un nuevo deployment (Redeploy o Push)
- [ ] Esperé a que el deployment termine
- [ ] Abrí la app en producción y revisé la consola
- [ ] Los logs muestran todos los valores como "SET"
- [ ] La app carga sin errores
- [ ] Puedo hacer login

---

## 💡 Nota Importante

Las variables con el prefijo `EXPO_PUBLIC_*` son **incluidas en el bundle durante el build**, NO en runtime. Esto significa que:

1. ✅ Las variables deben estar en Vercel ANTES del build
2. ✅ Si cambias las variables, DEBES hacer un nuevo deployment
3. ✅ Las variables estarán disponibles en `process.env` durante el build
4. ✅ Expo las inyecta automáticamente en el código compilado

Por eso es crucial que estén configuradas en Vercel con el ambiente "Production" marcado.
