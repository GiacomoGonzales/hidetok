import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, StatusBar, Text } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationService } from '../services/notificationService';
import { SPACING, ICON_SIZE, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

interface HeaderProps {
  onNotificationsPress?: () => void;
  showMessagesIcon?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onNotificationsPress, showMessagesIcon = false }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
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
    navigation.navigate('Home' as never);
  };

  return (
    <>
      <StatusBar
        backgroundColor={theme.colors.background}
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
      />
      <View style={[styles.container, {
        backgroundColor: theme.colors.background,
        paddingTop: insets.top,
        borderBottomColor: theme.colors.border,
      }]}>
        <View style={styles.content}>
          {/* Logo */}
          <TouchableOpacity onPress={handleLogoPress} activeOpacity={0.7}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              contentFit="contain"
              priority="high"
              cachePolicy="memory-disk"
            />
          </TouchableOpacity>

          {/* Center Icon - Messages */}
          {showMessagesIcon && (
            <View style={styles.centerIcon}>
              <Ionicons
                name="chatbubbles"
                size={scale(22)}
                color={theme.colors.accent}
                style={{ opacity: 0.7 }}
              />
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onNotificationsPress}
              activeOpacity={0.7}
            >
              <View>
                <Ionicons
                  name={unreadCount > 0 ? "notifications" : "notifications-outline"}
                  size={ICON_SIZE.lg}
                  color={unreadCount > 0 ? theme.colors.accent : theme.colors.text}
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
  logo: {
    height: scale(28),
    width: scale(100),
  },
  centerIcon: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
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
});

export default Header;
