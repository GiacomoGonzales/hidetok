import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import AvatarDisplay from './avatars/AvatarDisplay';
import { SPACING, FONT_SIZE, FONT_WEIGHT, ICON_SIZE, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.667;

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
}

interface MenuItem {
  label: string;
  icon: string;
  action: () => void;
  separator?: boolean;
}

const DrawerMenu: React.FC<DrawerMenuProps> = ({ visible, onClose }) => {
  const { theme, setThemeMode } = useTheme();
  const { user, logout } = useAuth();
  const { userProfile, activeProfileType, hasHidiProfile, switchIdentity } = useUserProfile();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleNavigate = (screen: string) => {
    closeDrawer();
    // Small delay to let the drawer close animation play
    setTimeout(() => {
      const tabNav = navigation.getParent();
      if (tabNav) {
        tabNav.navigate(screen);
      } else {
        navigation.navigate(screen);
      }
    }, 220);
  };

  const handleExploreCommunities = () => {
    closeDrawer();
    setTimeout(() => {
      navigation.navigate('ExploreCommunities');
    }, 220);
  };

  const handleLogout = () => {
    closeDrawer();
    setTimeout(async () => {
      try {
        await logout();
      } catch (error) {
        console.error('Error during logout:', error);
      }
    }, 220);
  };

  const showComingSoon = () => {
    closeDrawer();
    setTimeout(() => {
      Alert.alert('Próximamente', 'Esta función estará disponible pronto.');
    }, 220);
  };

  const menuItems: MenuItem[] = [
    { label: 'Perfil / Hidi', icon: 'person-outline', action: () => handleNavigate('Profile') },
    { label: 'Créditos', icon: 'wallet-outline', action: showComingSoon },
    { label: 'Recarga', icon: 'card-outline', action: showComingSoon },
    { label: 'Destacado', icon: 'star-outline', action: showComingSoon },
    { label: 'Mensajes', icon: 'chatbubble-outline', action: () => handleNavigate('Inbox') },
    { label: 'Contactos', icon: 'people-outline', action: showComingSoon },
    { label: 'Comunidades', icon: 'globe-outline', action: handleExploreCommunities },
    { label: 'Páginas biz', icon: 'business-outline', action: showComingSoon },
    { label: 'Términos y condiciones', icon: 'document-text-outline', action: showComingSoon, separator: true },
    { label: 'Cerrar sesión', icon: 'log-out-outline', action: handleLogout },
  ];

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]} pointerEvents="box-none">
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={closeDrawer}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawer,
          {
            width: DRAWER_WIDTH,
            backgroundColor: theme.colors.background,
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={[styles.drawerContent, { paddingTop: insets.top + SPACING.lg }]}>
          {/* User header - tap to switch identity */}
          <TouchableOpacity
            style={[styles.userHeader, { borderBottomColor: theme.colors.border }]}
            activeOpacity={hasHidiProfile ? 0.7 : 1}
            onPress={() => {
              if (!hasHidiProfile) return;
              switchIdentity();
              const nextType = activeProfileType === 'real' ? 'hidi' : 'real';
              setThemeMode(nextType === 'hidi' ? 'dark' : 'light');
            }}
          >
            <AvatarDisplay
              size={scale(56)}
              avatarType={userProfile?.avatarType || 'predefined'}
              avatarId={userProfile?.avatarId || 'male'}
              photoURL={typeof userProfile?.photoURL === 'string' ? userProfile.photoURL : undefined}
              photoURLThumbnail={typeof userProfile?.photoURLThumbnail === 'string' ? userProfile.photoURLThumbnail : undefined}
              backgroundColor="#8B5CF6"
            />
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>
                {userProfile?.displayName || user?.displayName || 'Usuario'}
              </Text>
              <View style={styles.profileBadgeRow}>
                <View style={[styles.profileBadge, {
                  backgroundColor: activeProfileType === 'hidi' ? theme.colors.accent + '20' : theme.colors.surface,
                }]}>
                  <Text style={[styles.profileBadgeText, {
                    color: activeProfileType === 'hidi' ? theme.colors.accent : theme.colors.textSecondary,
                  }]}>
                    {activeProfileType === 'hidi' ? 'HIDI' : 'Real'}
                  </Text>
                </View>
                {hasHidiProfile && (
                  <Ionicons name="swap-horizontal" size={scale(14)} color={theme.colors.textSecondary} />
                )}
              </View>
            </View>
          </TouchableOpacity>

          {/* Menu items */}
          <View style={styles.menuList}>
            {menuItems.map((item, index) => (
              <React.Fragment key={item.label}>
                {item.separator && <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={item.action}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={ICON_SIZE.lg}
                    color={item.label === 'Cerrar sesión' ? theme.colors.error : (activeProfileType === 'hidi' ? '#22C55E' : theme.colors.text)}
                  />
                  <Text style={[
                    styles.menuItemText,
                    { color: item.label === 'Cerrar sesión' ? theme.colors.error : theme.colors.text },
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 20,
  },
  drawerContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingBottom: SPACING.lg,
    marginBottom: SPACING.sm,
    borderBottomWidth: 1,
  },
  userInfo: {
    flex: 1,
    gap: SPACING.xs,
  },
  userName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
  },
  profileBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  profileBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(2),
    borderRadius: BORDER_RADIUS.sm,
  },
  profileBadgeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  menuList: {
    paddingTop: SPACING.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  menuItemText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
  },
  separator: {
    height: 1,
    marginVertical: SPACING.sm,
  },
});

export default DrawerMenu;
