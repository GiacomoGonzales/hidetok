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

const RegisterScreen: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { signUp, signInWithGoogle, signInAnonymously } = useAuth();
  const navigation = useNavigation();

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    const { email, password, confirmPassword } = formData;

    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu email');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return false;
    }

    if (!password) {
      Alert.alert('Error', 'Por favor ingresa tu contraseña');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return false;
    }

    return true;
  };

  const handleEmailRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { email, password } = formData;
      await signUp(email, password);
      // La navegación se manejará automáticamente por el estado de autenticación
      // NO poner loading = false aquí, mantener el spinner hasta que la redirección ocurra
    } catch (error: any) {
      // Solo en caso de error, volver a mostrar el formulario
      setLoading(false);

      let errorMessage = 'Error al crear la cuenta';

      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Ya existe una cuenta con este email';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        case 'auth/weak-password':
          errorMessage = 'La contraseña es muy débil';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Registro con email no permitido';
          break;
        default:
          errorMessage = error.message;
      }

      Alert.alert('Error de Registro', errorMessage);
    }
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // NO poner loading = false aquí, mantener el spinner hasta que la redirección ocurra
    } catch (error: any) {
      // Solo en caso de error, volver a mostrar el formulario
      setLoading(false);
      Alert.alert('Error', 'Error al registrarse con Google: ' + error.message);
    }
  };

  const handleAnonymousAccess = async () => {
    setLoading(true);
    try {
      await signInAnonymously();
      // NO poner loading = false aquí, mantener el spinner hasta que la redirección ocurra
    } catch (error: any) {
      // Solo en caso de error, volver a mostrar el formulario
      setLoading(false);
      Alert.alert('Error', 'Error al acceder de forma anónima: ' + error.message);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login' as never);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Creando cuenta...</Text>
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
            <Text style={styles.title}>Crea tu cuenta</Text>
            <Text style={styles.subtitle}>Únete a la comunidad HideTok</Text>
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
                value={formData.email}
                onChangeText={(value) => updateFormData('email', value)}
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
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#9CA3AF"
                  value={formData.password}
                  onChangeText={(value) => updateFormData('password', value)}
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

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirmar contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor="#9CA3AF"
                  value={formData.confirmPassword}
                  onChangeText={(value) => updateFormData('confirmPassword', value)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity style={styles.primaryButton} onPress={handleEmailRegister}>
              <Text style={styles.primaryButtonText}>Crear Cuenta</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>O regístrate con</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Register Button */}
            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleRegister}>
              <Image
                source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                style={styles.googleLogo}
                resizeMode="contain"
              />
              <Text style={styles.googleButtonText}>Continuar con Google</Text>
            </TouchableOpacity>

            {/* Anonymous Access Button */}
            <TouchableOpacity style={styles.anonymousButton} onPress={handleAnonymousAccess}>
              <Ionicons name="person-outline" size={20} color="#FFF" style={styles.anonymousIcon} />
              <Text style={styles.anonymousButtonText}>Iniciar sesión anónimamente</Text>
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
              <TouchableOpacity onPress={navigateToLogin}>
                <Text style={styles.loginLink}>Inicia sesión aquí</Text>
              </TouchableOpacity>
            </View>

            {/* Terms Notice */}
            <Text style={styles.termsText}>
              Al crear una cuenta, aceptas nuestros{' '}
              <Text style={styles.termsLink}>Términos de Servicio</Text>
              {' '}y{' '}
              <Text style={styles.termsLink}>Política de Privacidad</Text>
            </Text>
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
    paddingVertical: 16,
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
    marginTop: 10,
    fontSize: 14,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 70,
    height: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
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
    padding: 10,
    fontSize: 13,
    color: '#FFF',
  },
  eyeButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: '#9CA3AF',
    paddingHorizontal: 10,
    fontSize: 11,
  },
  googleButton: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  googleLogo: {
    width: 15,
    height: 15,
    marginRight: 8,
  },
  googleButtonText: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '600',
  },
  anonymousButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  anonymousIcon: {
    marginRight: 8,
  },
  anonymousButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  loginText: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  loginLink: {
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: '600',
  },
  termsText: {
    color: '#9CA3AF',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
  termsLink: {
    color: '#8B5CF6',
    fontWeight: '500',
  },
});

export default RegisterScreen;
