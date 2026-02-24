import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, StatusBar, Text } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useScroll } from '../contexts/ScrollContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationService } from '../services/notificationService';
import { SPACING, ICON_SIZE, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

interface HeaderProps {
  onNotificationsPress?: () => void;
  onMenuPress?: () => void;
  transparent?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onNotificationsPress, onMenuPress, transparent }) => {
  const { theme, setThemeMode } = useTheme();
  const { user } = useAuth();
  const { hasHidiProfile, activeProfileType, switchIdentity } = useUserProfile();

  const handleSwitchIdentity = () => {
    switchIdentity();
    // Cambiar tema: HIDI = oscuro, Real = claro
    const nextType = activeProfileType === 'real' ? 'hidi' : 'real';
    setThemeMode(nextType === 'hidi' ? 'dark' : 'light');
  };
  const { triggerScrollToTop } = useScroll();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [unreadCount, setUnreadCount] = useState(0);

  // Suscripción en tiempo real al conteo de notificaciones no leídas
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const unsubscribe = notificationService.subscribeToUnreadCount(
      user.uid,
      (count) => {
        setUnreadCount(count);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleLogoPress = () => {
    // Trigger scroll to top
    triggerScrollToTop();
    // Also navigate to Home in case we're not there
    navigation.navigate('Home' as never);
  };

  const handleLoginPress = () => {
    // Navigate to login screen
    const parent = navigation.getParent()?.getParent();
    if (parent) {
      parent.navigate('Login');
    }
  };

  const textColor = transparent ? 'white' : theme.colors.text;

  return (
    <>
      <StatusBar
        backgroundColor={transparent ? 'transparent' : theme.colors.background}
        barStyle={transparent ? 'light-content' : (theme.dark ? 'light-content' : 'dark-content')}
        translucent={transparent}
      />
      <View style={[styles.container, {
        backgroundColor: transparent ? 'transparent' : theme.colors.background,
        paddingTop: insets.top,
        borderBottomColor: transparent ? 'transparent' : theme.colors.border,
        borderBottomWidth: transparent ? 0 : scale(0.5),
      }]}>
        <View style={styles.content}>
          <View style={styles.leftSection}>
            {/* Hamburger menu */}
            {onMenuPress && (
              <TouchableOpacity onPress={onMenuPress} activeOpacity={0.7} style={styles.menuButton}>
                <Ionicons name="menu-outline" size={ICON_SIZE.lg} color={textColor} />
              </TouchableOpacity>
            )}

            {/* Logo */}
            <TouchableOpacity onPress={handleLogoPress} activeOpacity={0.7} style={styles.logoContainer}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              contentFit="contain"
              priority="high"
              cachePolicy="memory-disk"
            />
            <Text style={[styles.logoText, { color: textColor }]}>HideTok</Text>
          </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {/* Switch Identity Button - solo visible si tiene perfil HIDI */}
            {user && hasHidiProfile && (
              <TouchableOpacity
                style={[styles.switchButton, {
                  backgroundColor: transparent
                    ? 'rgba(255,255,255,0.15)'
                    : (activeProfileType === 'hidi' ? theme.colors.accent + '20' : theme.colors.surface),
                  borderColor: transparent
                    ? 'rgba(255,255,255,0.3)'
                    : (activeProfileType === 'hidi' ? theme.colors.accent : theme.colors.border),
                }]}
                onPress={handleSwitchIdentity}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={activeProfileType === 'hidi' ? 'eye-off' : 'eye'}
                  size={ICON_SIZE.md}
                  color={transparent ? 'white' : (activeProfileType === 'hidi' ? theme.colors.accent : textColor)}
                />
                <Text style={[styles.switchButtonText, {
                  color: transparent ? 'white' : (activeProfileType === 'hidi' ? theme.colors.accent : textColor),
                }]}>
                  {activeProfileType === 'hidi' ? 'HIDI' : 'Real'}
                </Text>
              </TouchableOpacity>
            )}

            {user ? (
              // Usuario autenticado: mostrar notificaciones
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onNotificationsPress}
                activeOpacity={0.7}
              >
                <View>
                  <Ionicons
                    name={unreadCount > 0 ? "notifications" : "notifications-outline"}
                    size={ICON_SIZE.lg}
                    color={transparent ? 'white' : (unreadCount > 0 ? theme.colors.accent : theme.colors.text)}
                  />
                  {unreadCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: theme.colors.accent }]}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ) : (
              // Usuario no autenticado: mostrar botón de iniciar sesión
              <TouchableOpacity
                style={[styles.loginButton, { backgroundColor: theme.colors.accent }]}
                onPress={handleLoginPress}
                activeOpacity={0.7}
              >
                <Text style={styles.loginButtonText}>Iniciar sesión</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: scale(0.5),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  menuButton: {
    padding: SPACING.xs,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  logo: {
    height: scale(32),
    width: scale(32),
  },
  logoText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  actionButton: {
    padding: SPACING.xs,
  },
  badge: {
    position: 'absolute',
    top: -scale(4),
    right: -scale(6),
    minWidth: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(4),
  },
  badgeText: {
    color: 'white',
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.bold,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  switchButtonText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  loginButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  loginButtonText: {
    color: 'white',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
});

export default Header;
