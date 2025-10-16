# 🔍 Configuración de Google Sign-In para HideTok

## ⚠️ Error actual
Si ves "Missing required parameter: client_id", significa que necesitas configurar las credenciales de Google.

## 📋 Pasos para configurar Google Sign-In

### 1. Acceder a Google Cloud Console
- Ve a: [https://console.cloud.google.com/](https://console.cloud.google.com/)
- Inicia sesión con tu cuenta de Google

### 2. Seleccionar o crear proyecto
- Si ya tienes un proyecto de Firebase, selecciónalo
- Si no, crea un nuevo proyecto:
  - Clic en "Seleccionar proyecto" → "Proyecto nuevo"
  - Nombre: `hidetok-simple` (o el que prefieras)
  - Clic en "Crear"

### 3. Habilitar APIs necesarias
- Ve a **"APIs y servicios"** → **"Biblioteca"**
- Busca: `Google Sign-In API` o `Google+ API`
- Clic en la API → **"Habilitar"**

### 4. Configurar pantalla de consentimiento OAuth
- Ve a **"APIs y servicios"** → **"Pantalla de consentimiento de OAuth"**
- Selecciona **"Externo"** → "Crear"
- Completa la información básica:
  - **Nombre de la aplicación**: HideTok
  - **Correo electrónico de asistencia**: tu email
  - **Logotipo**: opcional
  - **Dominio autorizado**: opcional (puedes dejarlo vacío)
  - **Correo de contacto del desarrollador**: tu email
- Guarda y continúa

### 5. Crear credenciales OAuth 2.0
- Ve a **"APIs y servicios"** → **"Credenciales"**
- Clic en **"+ Crear credenciales"** → **"ID de cliente de OAuth 2.0"**
- Configuración:
  - **Tipo de aplicación**: Aplicación web
  - **Nombre**: HideTok Web Client
  - **URIs de origen autorizados**: `https://auth.expo.io`
  - **URIs de redirección autorizados**: 
    ```
    https://auth.expo.io/@TU_USERNAME/hidetok-simple
    ```
    > ⚠️ Reemplaza `TU_USERNAME` con tu username de Expo

### 6. Obtener el Client ID
- Una vez creado, verás una ventana con las credenciales
- **Copia el "ID de cliente"** (algo como: `123456789-abc.apps.googleusercontent.com`)

### 7. Actualizar archivo de configuración
- Abre el archivo `env.local` en tu proyecto
- Reemplaza la línea:
  ```
  EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
  ```
  Por:
  ```
  EXPO_PUBLIC_GOOGLE_CLIENT_ID=tu_client_id_real_aqui
  ```

### 8. Reiniciar la aplicación
- Detén el servidor de Expo (Ctrl+C)
- Ejecuta: `npm start`
- Vuelve a probar Google Sign-In

## 🔧 Configuración alternativa para desarrollo

Si quieres probar más rápidamente, también puedes:

### Opción A: Deshabilitar temporalmente Google Sign-In
1. Puedes comentar o quitar los botones de Google de las pantallas
2. Usar solo email/password y acceso anónimo mientras configuras Google

### Opción B: Usar solo Firebase Auth
1. En la consola de Firebase, ve a "Authentication" → "Sign-in method"
2. Habilita "Google" como proveedor
3. Firebase te dará automáticamente las credenciales Web

## 📱 Para obtener tu Username de Expo
Si no sabes tu username de Expo:
1. Ejecuta: `npx expo whoami`
2. O ve a: [https://expo.dev/](https://expo.dev/) y revisa tu perfil

## ✅ Verificar que funciona
Después de configurar:
1. Reinicia la app
2. Toca "Continuar con Google"
3. Debería abrir la página de autorización de Google
4. Autoriza la aplicación
5. Debería regresar a tu app autenticado

## ❓ Problemas comunes

### Error: "URI de redirección no válida"
- Verifica que la URI de redirección sea exactamente: `https://auth.expo.io/@TU_USERNAME/hidetok-simple`
- Asegúrate de que tu username de Expo sea correcto

### Error: "Este proyecto no está autorizado"
- Verifica que hayas habilitado la Google Sign-In API
- Revisa que el Client ID esté correctamente copiado

### Error: "Pantalla de consentimiento no configurada"
- Completa la configuración de la pantalla de consentimiento OAuth

## 🚀 ¡Listo!
Una vez configurado, Google Sign-In debería funcionar perfectamente.
