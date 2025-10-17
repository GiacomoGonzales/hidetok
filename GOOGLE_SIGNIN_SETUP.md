# Configuración de Google Sign-In

## ✅ Para Web (Ya está listo)

El inicio de sesión con Google en **web** ya está completamente funcional y **NO necesita configuración adicional** porque usa `signInWithPopup` de Firebase Authentication.

### Cómo funciona en Web:
1. El usuario hace clic en "Continuar con Google"
2. Se abre un popup de Google
3. El usuario selecciona su cuenta de Google
4. Firebase maneja automáticamente la autenticación
5. El usuario es redirigido a la app

**¡Eso es todo! En web ya funciona sin configuración extra.**

---

## 📱 Para Mobile (iOS/Android) - Configuración Adicional Necesaria

Para que Google Sign-In funcione en **iOS** y **Android**, necesitas configurar un **Google Client ID**.

### Paso 1: Obtener Google Client ID

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto o crea uno nuevo
3. Ve a **APIs & Services** → **Credentials**
4. Haz clic en **Create Credentials** → **OAuth 2.0 Client ID**

#### Para iOS:
- **Application type**: iOS
- **Bundle ID**: El bundle ID de tu app (ej: `com.hidetoksimple.app`)
- Haz clic en **Create**
- Copia el **Client ID** que se genera

#### Para Android:
- **Application type**: Android
- **Package name**: El package name de tu app (ej: `com.hidetoksimple.app`)
- **SHA-1 certificate fingerprint**: Obtén tu SHA-1 con:
  ```bash
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
  ```
- Haz clic en **Create**
- Copia el **Client ID** que se genera

### Paso 2: Configurar en tu proyecto

Agrega el Client ID en tu archivo `env.local`:

```bash
# Google Client ID para Mobile (iOS/Android)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=tu-client-id-aqui.apps.googleusercontent.com
```

### Paso 3: Rebuild de la app

Después de agregar el Client ID, necesitas hacer rebuild:

```bash
# Para iOS
npx expo run:ios

# Para Android
npx expo run:android
```

---

## 🔍 Verificar que Firebase esté configurado

Ya configuraste Google Sign-In en Firebase Console, pero verifica:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **hidetok-9a642**
3. Ve a **Authentication** → **Sign-in method**
4. Verifica que **Google** esté **Enabled** ✅

Si no está habilitado:
1. Haz clic en **Google**
2. Activa el toggle **Enable**
3. Configura:
   - **Project support email**: Tu email
   - **Project public-facing name**: HideTok
4. Haz clic en **Save**

---

## 🧪 Probar Google Sign-In

### En Web (localhost):
1. Inicia el servidor: `npx expo start --web`
2. Abre http://localhost:8082
3. Haz clic en "Continuar con Google"
4. Se abrirá popup de Google
5. Selecciona tu cuenta
6. ✅ Deberías iniciar sesión exitosamente

### En Web (Producción - Vercel):
1. Asegúrate de que las variables de entorno de Firebase estén configuradas en Vercel
2. Haz deploy
3. Abre tu URL de Vercel
4. Haz clic en "Continuar con Google"
5. ✅ Debería funcionar igual que en localhost

### En Mobile:
1. Necesitas configurar el `EXPO_PUBLIC_GOOGLE_CLIENT_ID` primero
2. Rebuild de la app
3. Abre la app en tu dispositivo
4. Haz clic en "Continuar con Google"
5. Se abrirá la pantalla de Google
6. ✅ Deberías poder seleccionar tu cuenta

---

## 🐛 Troubleshooting

### Error: "popup_closed_by_user"
**Causa**: El usuario cerró el popup antes de completar el inicio de sesión.
**Solución**: Es normal, no es un error. El usuario simplemente canceló.

### Error: "auth/popup-blocked"
**Causa**: El navegador bloqueó el popup.
**Solución**:
1. Verifica que tu navegador permita popups
2. Agrega tu sitio a las excepciones

### Error: "Google Client ID no está configurado"
**Causa**: Falta configurar `EXPO_PUBLIC_GOOGLE_CLIENT_ID` para mobile.
**Solución**:
1. Solo aplica para iOS/Android
2. En **web NO necesitas esto**
3. Configura el Client ID en `env.local`

### Error: "auth/unauthorized-domain"
**Causa**: Tu dominio no está autorizado en Firebase.
**Solución**:
1. Ve a Firebase Console → Authentication → Settings
2. En **Authorized domains**, agrega:
   - `localhost`
   - Tu dominio de Vercel (ej: `tu-app.vercel.app`)

### El popup se abre pero no pasa nada
**Causa**: Puede ser un problema de CORS o dominio no autorizado.
**Solución**:
1. Verifica la consola del navegador para ver errores
2. Asegúrate de que tu dominio esté en **Authorized domains** en Firebase

---

## 📝 Resumen

- ✅ **Web**: Ya funciona, no necesitas hacer nada
- 📱 **Mobile**: Necesitas configurar `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
- 🔧 Firebase: Asegúrate de que Google esté habilitado en Authentication
- 🌐 Dominios: Agrega tu dominio de Vercel a **Authorized domains**

---

## 🎯 Estado Actual

**Plataforma Web**: ✅ **LISTO PARA USAR**
- Login con Google funciona con `signInWithPopup`
- No requiere configuración adicional
- Compatible con localhost y Vercel

**Plataforma Mobile**: ⚠️ **Requiere configuración adicional**
- Necesitas obtener Google Client ID de Google Cloud Console
- Agregar `EXPO_PUBLIC_GOOGLE_CLIENT_ID` a env.local
- Rebuild de la app

---

¡El inicio de sesión con Google en **Web** ya está completamente funcional! 🎉
