import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { signIn, signInWithGoogle, signInAnonymously, resetPassword } = useAuth();
  const navigation = useNavigation();

  const handleEmailLogin = async () => {
    if (!email || !password) {
      if (Platform.OS === 'web') {
        alert('Por favor completa todos los campos');
      } else {
        Alert.alert('Error', 'Por favor completa todos los campos');
      }
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      // NO poner loading = false aquí, mantener el spinner hasta que la redirección ocurra
    } catch (error: any) {
      // Solo en caso de error, volver a mostrar el formulario
      setLoading(false);

      let errorMessage = 'Error al iniciar sesión';

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No existe una cuenta con este email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Contraseña incorrecta';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Esta cuenta ha sido deshabilitada';
          break;
        default:
          errorMessage = error.message;
      }

      if (Platform.OS === 'web') {
        alert(errorMessage);
      } else {
        Alert.alert('Error de Autenticación', errorMessage);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // NO poner loading = false aquí, mantener el spinner hasta que la redirección ocurra
    } catch (error: any) {
      // Solo en caso de error, volver a mostrar el formulario
      setLoading(false);

      const message = 'Error al iniciar sesión con Google: ' + error.message;
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    }
  };

  const handleAnonymousLogin = async () => {
    setLoading(true);
    try {
      await signInAnonymously();
      // NO poner loading = false aquí, mantener el spinner hasta que la redirección ocurra
    } catch (error: any) {
      // Solo en caso de error, volver a mostrar el formulario
      setLoading(false);

      const message = 'Error al acceder de forma anónima: ' + error.message;
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      const message = 'Por favor ingresa tu email para restablecer la contraseña';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Email requerido', message);
      }
      return;
    }

    try {
      await resetPassword(email);
      const message = 'Revisa tu correo electrónico para restablecer tu contraseña';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Email enviado', message);
      }
    } catch (error: any) {
      const message = 'Error al enviar email de restablecimiento: ' + error.message;
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register' as never);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Iniciando sesión...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
            {/* Logo y título */}
            <View style={styles.header}>
              <Image
                source={require('../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>Bienvenido a HideTok</Text>
              <Text style={styles.subtitle}>Inicia sesión para continuar</Text>
            </View>

            {/* Formulario */}
            <View style={styles.form}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="tu@email.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Contraseña</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Tu contraseña"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity style={styles.primaryButton} onPress={handleEmailLogin}>
                <Text style={styles.primaryButtonText}>Iniciar Sesión</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>O continúa con</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Login Button */}
              <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
                <Image
                  source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                  style={styles.googleLogo}
                  resizeMode="contain"
                />
                <Text style={styles.googleButtonText}>Continuar con Google</Text>
              </TouchableOpacity>

              {/* Anonymous Login Button */}
              <TouchableOpacity style={styles.anonymousButton} onPress={handleAnonymousLogin}>
                <Ionicons name="person-outline" size={20} color="#FFF" style={styles.anonymousIcon} />
                <Text style={styles.anonymousButtonText}>Iniciar sesión anónimamente</Text>
              </TouchableOpacity>

              {/* Register Link */}
              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>¿No tienes cuenta? </Text>
                <TouchableOpacity onPress={navigateToRegister}>
                  <Text style={styles.registerLink}>Regístrate aquí</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'center',
    maxWidth: 408,
    width: '100%',
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 14,
    fontSize: 14,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 85,
    height: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#FFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#FFF',
  },
  eyeButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: '#9CA3AF',
    paddingHorizontal: 12,
    fontSize: 12,
  },
  googleButton: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  googleLogo: {
    width: 17,
    height: 17,
    marginRight: 10,
  },
  googleButtonText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '600',
  },
  anonymousButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  anonymousIcon: {
    marginRight: 10,
  },
  anonymousButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  registerText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  registerLink: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default LoginScreen;
