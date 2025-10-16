import React from 'react';
import { View, StyleSheet, TouchableOpacity, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING, ICON_SIZE } from '../constants/design';

interface HeaderProps {
  onSearchPress: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSearchPress }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

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
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onSearchPress}
              activeOpacity={0.7}
            >
              <Ionicons
                name="search"
                size={ICON_SIZE.lg}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  logo: {
    height: 28,
    width: 100,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  actionButton: {
    padding: SPACING.xs,
  },
});

export default Header;
