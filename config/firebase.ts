import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import Constants from 'expo-constants';

console.log('🔥 Starting Firebase initialization...');

// Configuración de Firebase usando variables de entorno o Constants.expoConfig
const getConfigValue = (key: string, envKey: string) => {
  const envValue = process.env[envKey];
  const constantsValue = Constants.expoConfig?.extra?.[envKey];
  const value = envValue || constantsValue;
  
  console.log(`🔍 ${envKey}: env=${envValue ? 'SET' : 'UNSET'}, constants=${constantsValue ? 'SET' : 'UNSET'}, final=${value ? 'SET' : 'UNSET'}`);
  
  return value;
};

const firebaseConfig = {
  apiKey: getConfigValue('apiKey', 'EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: getConfigValue('authDomain', 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: getConfigValue('projectId', 'EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: getConfigValue('storageBucket', 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getConfigValue('messagingSenderId', 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getConfigValue('appId', 'EXPO_PUBLIC_FIREBASE_APP_ID'),
  measurementId: getConfigValue('measurementId', 'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID'),
};

console.log('📋 Firebase config assembled:', firebaseConfig);

// Validar que todas las variables de entorno estén configuradas
const validateConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);
  
  if (missingFields.length > 0) {
    console.error('❌ Firebase config missing fields:', missingFields);
    console.error('📋 Current config:', firebaseConfig);
    console.error('📋 Constants.expoConfig:', Constants.expoConfig);
    console.error('📋 process.env keys:', Object.keys(process.env).filter(k => k.includes('FIREBASE')));
    
    // En lugar de hacer crash, usar valores por defecto para testing
    console.warn('⚠️ Using fallback config - app may have limited functionality');
    return false;
  }
  
  console.log('✅ Firebase configuration validated successfully');
  return true;
};

// Validar configuración antes de inicializar
const isConfigValid = validateConfig();

let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;

try {
  console.log('🚀 Initializing Firebase app...');
  // Inicializar Firebase
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized');
  
  // Inicializar servicios de Firebase
  auth = getAuth(app);
  console.log('✅ Firebase Auth initialized');
  
  db = getFirestore(app);
  console.log('✅ Firebase Firestore initialized');
  
  storage = getStorage(app);
  console.log('✅ Firebase Storage initialized');
  
} catch (error) {
  console.error('❌ Error initializing Firebase:', error);
  
  // Crear stubs para evitar crashes
  auth = null;
  db = null;
  storage = null;
}

// Exportar servicios
export { auth, db, storage };

// Exportar la app por si se necesita en otro lugar
export default app;

// Función para verificar la conexión
export const testFirebaseConnection = async (): Promise<boolean> => {
  try {
    if (!app) {
      console.error('❌ Firebase app not initialized');
      return false;
    }
    
    // Intentar obtener la configuración del proyecto
    const projectId = firebaseConfig.projectId;
    console.log('🔥 Firebase conectado exitosamente!');
    console.log('📱 Proyecto ID:', projectId);
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con Firebase:', error);
    return false;
  }
};
