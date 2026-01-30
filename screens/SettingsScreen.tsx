import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useResponsive } from '../hooks/useResponsive';
import ResponsiveLayout from '../components/ResponsiveLayout';
import { ProfileStackParamList } from '../navigation/ProfileStackNavigator';

type SettingsNavigationProp = StackNavigationProp<ProfileStackParamList, 'Settings'>;

const SettingsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { logout } = useAuth();
  const { userProfile } = useUserProfile();
  const navigation = useNavigation<SettingsNavigationProp>();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
  const [allowPrivateReplies, setAllowPrivateReplies] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const joinedCommunitiesCount = userProfile?.joinedCommunities?.length || 0;

  const handleAbout = () => {
    Alert.alert(
      'Acerca de HideTok',
      'HideTok v1.0.0\n\nUna plataforma social anónima donde puedes expresarte libremente.\n\n© 2024 HideTok. Todos los derechos reservados.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      'Política de Privacidad',
      'Tu privacidad es importante para nosotros. Todos los datos se mantienen anónimos y seguros.\n\nEsta es una aplicación demo sin conexión a servidores reales.',
      [{ text: 'Entendido', style: 'default' }]
    );
  };

  const handleSupport = () => {
    Alert.alert(
      'Soporte',
      '¿Necesitas ayuda?\n\nEsta es una aplicación demo. En una versión real, aquí encontrarías:\n\n• FAQ\n• Contacto\n• Reportar problemas\n• Guías de uso',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handleCommunities = () => {
    navigation.navigate('CommunitiesManagement');
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'No se pudo cerrar la sesión');
            }
          },
        },
      ]
    );
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    rightComponent?: React.ReactNode,
    showArrow: boolean = true
  ) => (
    <TouchableOpacity
      style={[styles.settingItem, { 
        backgroundColor: theme.colors.card,
        borderBottomColor: theme.colors.border,
      }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name={icon as any} size={20} color={theme.colors.accent} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightComponent}
        {showArrow && onPress && (
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={theme.colors.textSecondary}
            style={styles.arrow}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, {
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.border,
        paddingTop: isDesktop ? 0 : insets.top + 8,
      }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Ajustes
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contenido */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Contenido
          </Text>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {renderSettingItem(
              'people',
              'Mis Comunidades',
              `${joinedCommunitiesCount} ${joinedCommunitiesCount === 1 ? 'comunidad' : 'comunidades'} unidas`,
              handleCommunities
            )}
          </View>
        </View>

        {/* Privacidad */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Privacidad
          </Text>
          
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {renderSettingItem(
              'lock-closed',
              'Respuestas privadas',
              'Permitir que otros te envíen mensajes privados',
              undefined,
              <Switch
                value={allowPrivateReplies}
                onValueChange={setAllowPrivateReplies}
                trackColor={{ false: theme.colors.border, true: theme.colors.accent + '40' }}
                thumbColor={allowPrivateReplies ? theme.colors.accent : theme.colors.textSecondary}
              />,
              false
            )}
            
            {renderSettingItem(
              'shield-checkmark',
              'Política de privacidad',
              'Lee nuestra política de privacidad',
              handlePrivacy
            )}
          </View>
        </View>

        {/* Notificaciones */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Notificaciones
          </Text>
          
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {renderSettingItem(
              'notifications',
              'Notificaciones push',
              'Recibe notificaciones de nuevos mensajes y actividad',
              undefined,
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: theme.colors.border, true: theme.colors.accent + '40' }}
                thumbColor={notificationsEnabled ? theme.colors.accent : theme.colors.textSecondary}
              />,
              false
            )}
          </View>
        </View>

        {/* Información */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Información
          </Text>
          
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {renderSettingItem(
              'information-circle',
              'Acerca de HideTok',
              'Versión, términos y información de la app',
              handleAbout
            )}
            
            {renderSettingItem(
              'help-circle',
              'Soporte',
              'Centro de ayuda y contacto',
              handleSupport
            )}
          </View>
        </View>

        {/* Cuenta */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Cuenta
          </Text>

          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity
              style={[styles.settingItem, {
                backgroundColor: 'transparent',
                borderBottomWidth: 0,
              }]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface }]}>
                  <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: '#EF4444' }]}>
                    Cerrar sesión
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                    Salir de tu cuenta
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>
            HideTok v1.0.0
          </Text>
          <Text style={[styles.versionSubtext, { color: theme.colors.textSecondary }]}>
            Aplicación demo • Sin conexión real
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrow: {
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  versionText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 12,
  },
});

export default SettingsScreen;
