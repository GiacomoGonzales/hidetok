import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useRoute, useNavigationState, CommonActions } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import AvatarDisplay from './avatars/AvatarDisplay';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, ICON_SIZE } from '../constants/design';

interface SidebarItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, onPress }) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.sidebarItem,
        active && {
          backgroundColor: theme.colors.surface,
          shadowColor: theme.colors.accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon}
        size={ICON_SIZE.lg}
        color={active ? theme.colors.accent : theme.colors.text}
      />
      <Text style={[
        styles.sidebarLabel,
        { color: active ? theme.colors.accent : theme.colors.text }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const Sidebar: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { logout } = useAuth();
  const { userProfile } = useUserProfile();

  // Obtener la ruta activa desde el navigation state
  const currentRouteName = useNavigationState(state => {
    if (!state) return undefined;
    const route = state.routes[state.index];
    if (route.state) {
      // Si estamos en Main (TabNavigator), obtener el tab activo
      const tabState = route.state as any;
      return tabState.routes[tabState.index]?.name;
    }
    return route.name;
  });

  const handleNavigate = (screen: string) => {
    if (screen === 'Search' || screen === 'Settings') {
      navigation.navigate(screen as never);
    } else {
      navigation.navigate('Main' as never, { screen } as never);
    }
  };

  const handleLogout = async () => {
    console.log('🔴 handleLogout called');
    try {
      console.log('🔴 Calling logout...');
      await logout();
      console.log('🔴 Logout successful');
    } catch (error) {
      console.error('🔴 Error signing out:', error);
    }
  };

  // Detectar la ruta activa
  const isActive = (routeName: string) => {
    return currentRouteName === routeName;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Logo */}
        <TouchableOpacity
          style={styles.logoContainer}
          onPress={() => handleNavigate('Home')}
          activeOpacity={0.7}
        >
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.privacyBadge}>
            <Ionicons name="shield-checkmark" size={12} color={theme.colors.accent} />
            <Text style={[styles.privacyText, { color: theme.colors.textSecondary }]}>
              Privado
            </Text>
          </View>
        </TouchableOpacity>

        {/* Navigation Items */}
        <View style={styles.nav}>
          <SidebarItem
            icon="home"
            label="Inicio"
            active={isActive('Home')}
            onPress={() => handleNavigate('Home')}
          />
          <SidebarItem
            icon="search"
            label="Buscar"
            active={isActive('Search')}
            onPress={() => handleNavigate('Search')}
          />
          <SidebarItem
            icon="mail"
            label="Mensajes"
            active={isActive('Inbox')}
            onPress={() => handleNavigate('Inbox')}
          />
          <SidebarItem
            icon="person"
            label="Perfil"
            active={isActive('Profile')}
            onPress={() => handleNavigate('Profile')}
          />
          <SidebarItem
            icon="settings"
            label="Configuración"
            active={isActive('Settings')}
            onPress={() => handleNavigate('Settings')}
          />
        </View>

        {/* Botón Crear Post */}
        <TouchableOpacity
          style={[
            styles.createButton,
            {
              backgroundColor: theme.colors.accent,
              shadowColor: theme.colors.accent,
            }
          ]}
          onPress={() => handleNavigate('Create')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.createButtonText}>Crear</Text>
        </TouchableOpacity>

        {/* User Info */}
        <View style={styles.spacer} />
        <TouchableOpacity
          style={[styles.userInfo, { backgroundColor: theme.colors.surface }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          {userProfile ? (
            <AvatarDisplay
              size={40}
              avatarType={userProfile.avatarType || 'predefined'}
              avatarId={userProfile.avatarId || 'male'}
              photoURL={typeof userProfile.photoURL === 'string' ? userProfile.photoURL : undefined}
              photoURLThumbnail={typeof userProfile.photoURLThumbnail === 'string' ? userProfile.photoURLThumbnail : undefined}
              backgroundColor={theme.colors.accent}
              showBorder={false}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
              <Ionicons name="person" size={20} color="white" />
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>
              {userProfile?.displayName || 'Usuario'}
            </Text>
            <Text style={[styles.userAction, { color: theme.colors.textSecondary }]}>
              Cerrar sesión
            </Text>
          </View>
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  logoContainer: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  logo: {
    height: 36,
    width: 36,
    marginBottom: SPACING.xs,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs,
  },
  privacyText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.regular,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  nav: {
    gap: 2,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.lg,
  },
  sidebarLabel: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.regular,
    letterSpacing: -0.3,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  createButtonText: {
    color: 'white',
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: -0.2,
  },
  spacer: {
    flex: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  userAction: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
  },
});

export default Sidebar;
