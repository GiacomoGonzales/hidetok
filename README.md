# HideTok 🎭

Una plataforma social anónima donde puedes expresarte libremente. Construida con React Native, Expo y Firebase.

![HideTok](./assets/logo.png)

## 🚀 Características

- **Autenticación Anónima**: Regístrate sin necesidad de email
- **Google Sign-In**: Opción de inicio de sesión con Google
- **Posts Anónimos**: Comparte contenido de forma privada
- **Feed en Tiempo Real**: Ver publicaciones de todos los usuarios
- **Subida de Imágenes**: Comparte fotos con tus posts
- **Búsqueda**: Encuentra usuarios, hashtags y contenido
- **Perfil Personalizable**: Avatar predefinido o foto personalizada
- **Temas Claro/Oscuro**: Cambia entre modos de visualización
- **Responsive Design**: Funciona perfectamente en móvil, tablet y desktop

## 🛠️ Tecnologías

- **Frontend**: React Native + Expo
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Navegación**: React Navigation
- **Estilos**: React Native StyleSheet
- **Estado**: React Context API
- **Deployment**: Vercel / Netlify / Firebase Hosting

## 📱 Plataformas Soportadas

- ✅ Web
- ✅ iOS (vía Expo)
- ✅ Android (vía Expo)

## 🔧 Instalación Local

1. Clona el repositorio:
```bash
git clone https://github.com/GiacomoGonzales/hidetok.git
cd hidetok
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp .env.example env.local
```
Edita `env.local` con tus credenciales de Firebase.

4. Inicia el servidor de desarrollo:

**Para Web:**
```bash
npx expo start --web
```

**Para iOS:**
```bash
npx expo start --ios
```

**Para Android:**
```bash
npx expo start --android
```

## 🔥 Configuración de Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilita Authentication (Anonymous y Google Sign-In)
3. Crea una base de datos Firestore
4. Crea un bucket de Storage
5. Copia las credenciales a `env.local`

Ver [DEPLOY_WEB.md](./DEPLOY_WEB.md) para instrucciones detalladas.

## 🌐 Despliegue en Producción

### Vercel (Recomendado)

1. Importa el repositorio en [Vercel](https://vercel.com)
2. Configura las variables de entorno
3. Deploy automático con cada push

### Firebase Hosting

```bash
npx expo export:web
firebase deploy --only hosting
```

Ver [DEPLOY_WEB.md](./DEPLOY_WEB.md) para más opciones de despliegue.

## 📁 Estructura del Proyecto

```
hidetok-simple/
├── components/          # Componentes reutilizables
│   ├── avatars/        # Sistema de avatares
│   ├── ErrorBoundary.tsx
│   ├── Header.tsx
│   ├── PostCard.tsx
│   ├── Sidebar.tsx
│   └── ...
├── config/             # Configuración (Firebase)
├── constants/          # Constantes de diseño
├── contexts/           # Context API (Auth, Theme)
├── hooks/              # Custom hooks
├── navigation/         # Navegación (Stack, Tab)
├── screens/            # Pantallas de la app
├── services/           # Servicios (Firestore, Storage)
├── App.tsx            # Componente principal
└── ...
```

## 🔒 Seguridad

- Las reglas de seguridad de Firestore y Storage están configuradas
- Las credenciales de Firebase están en variables de entorno
- El archivo `env.local` está en `.gitignore`
- Autenticación requerida para todas las operaciones

## 🎨 Características de Diseño

- **Responsive**: Se adapta a móvil, tablet y desktop
- **Layout de 3 Columnas**: En desktop (Sidebar, Feed, Trending)
- **Tema Oscuro/Claro**: Sistema de temas completo
- **Animaciones Suaves**: Transiciones y efectos visuales
- **Diseño Moderno**: Inspirado en redes sociales populares

## 📝 Scripts Disponibles

```bash
# Desarrollo
npm start              # Inicia Expo
npm run web            # Inicia solo web
npm run android        # Inicia Android
npm run ios            # Inicia iOS

# Build
npx expo export:web    # Build para web
npx expo build:android # Build para Android
npx expo build:ios     # Build para iOS

# Firebase
firebase deploy        # Deploy a Firebase Hosting
```

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 👤 Autor

**Giacomo Gonzales**
- GitHub: [@GiacomoGonzales](https://github.com/GiacomoGonzales)

## 🙏 Agradecimientos

- Expo team por el increíble framework
- Firebase por el backend
- Claude Code por la asistencia en el desarrollo

---

⭐️ Si te gusta este proyecto, dale una estrella en GitHub!
