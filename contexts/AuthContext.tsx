import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously as firebaseSignInAnonymously,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../config/firebase';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// Solo importar módulos de web cuando estemos en plataforma web
let signInWithPopup: any;
let GoogleAuthProvider: any;

if (Platform.OS === 'web') {
  const webAuth = require('firebase/auth');
  signInWithPopup = webAuth.signInWithPopup;
  GoogleAuthProvider = webAuth.GoogleAuthProvider;
}

if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Verificar si hay una sesión guardada en localStorage
    const checkPersistedSession = () => {
      if (Platform.OS === 'web') {
        try {
          // Firebase persiste la sesión automáticamente en localStorage
          const persistedAuth = localStorage.getItem('firebase:authUser:' + auth.app.options.apiKey + ':[DEFAULT]');
          return !!persistedAuth;
        } catch (error) {
          return false;
        }
      }
      return false;
    };

    const hasPersistedSession = checkPersistedSession();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔐 Auth state changed:', {
        hasUser: !!user,
        email: user?.email,
        initializing
      });

      setUser(user);

      // Solo marcar como no loading después de la primera verificación
      if (initializing) {
        setInitializing(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [initializing]);

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName?: string): Promise<void> => {
    try {
      // Solo crear el usuario, NO actualizar el displayName aquí
      // El displayName se configurará en el onboarding
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    console.log('🟢 AuthContext: logout function called');
    try {
      console.log('🟢 AuthContext: Calling Firebase signOut...');
      await signOut(auth);
      console.log('🟢 AuthContext: Firebase signOut completed successfully');
    } catch (error) {
      console.error('🟢 AuthContext: Error during logout:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error;
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    try {
      // En Web, usar signInWithPopup directamente
      if (Platform.OS === 'web') {
        console.log('🔵 Iniciando Google Sign-In en Web...');
        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');

        // Usar popup para mejor experiencia en web
        const result = await signInWithPopup(auth, provider);
        console.log('✅ Google Sign-In exitoso:', result.user.email);
        return;
      }

      // En Mobile (iOS/Android), usar AuthSession con Expo
      console.log('📱 Iniciando Google Sign-In en Mobile...');
      const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

      // Verificar que esté configurado el Client ID
      if (!googleClientId || googleClientId === 'your_google_client_id_here') {
        throw new Error('Google Client ID no está configurado. Por favor configura EXPO_PUBLIC_GOOGLE_CLIENT_ID en tu archivo env.local');
      }

      // Configuración para Expo
      const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });

      const request = new AuthSession.AuthRequest({
        clientId: googleClientId,
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.IdToken,
      });

      const result = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      });

      if (result.type === 'success' && result.params.id_token) {
        const credential = GoogleAuthProvider.credential(result.params.id_token);
        await signInWithCredential(auth, credential);
        console.log('✅ Google Sign-In exitoso');
      } else if (result.type === 'cancel') {
        console.log('⚠️ Usuario canceló Google Sign-In');
        // Usuario canceló, no es un error
        return;
      } else {
        throw new Error('Error en la autenticación con Google');
      }
    } catch (error) {
      console.error('❌ Error en Google Sign-In:', error);
      throw error;
    }
  };

  const signInAnonymouslyHandler = async (): Promise<void> => {
    try {
      console.log('👤 Iniciando sesión anónima...');
      await firebaseSignInAnonymously(auth);
      console.log('✅ Sesión anónima iniciada');
    } catch (error) {
      console.error('❌ Error en autenticación anónima:', error);
      throw error;
    }
  };

  const updateUserProfile = async (displayName: string, photoURL?: string): Promise<void> => {
    try {
      if (user) {
        await updateProfile(user, {
          displayName,
          photoURL
        });
      }
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInAnonymously: signInAnonymouslyHandler,
    logout,
    resetPassword,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
