import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, ICON_SIZE } from '../constants/design';

const RightSidebar: React.FC = () => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const navigation = useNavigation();

  const trendingTopics = [
    { topic: 'Tecnología', posts: '15.2K' },
    { topic: 'Deportes', posts: '8.9K' },
    { topic: 'Entretenimiento', posts: '12.5K' },
    { topic: 'Noticias', posts: '6.3K' },
  ];

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigation.navigate('Search' as never);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Search Box */}
      <View style={[
        styles.searchContainer,
        {
          backgroundColor: theme.colors.surface,
          shadowColor: theme.colors.border,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
        }
      ]}>
        <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="Buscar en HideTok"
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
      </View>

      {/* Trending Topics */}
      <View style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          shadowColor: theme.dark ? theme.colors.glow : '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: theme.dark ? 0.1 : 0.05,
          shadowRadius: 3,
        }
      ]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          Tendencias
        </Text>

        {trendingTopics.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.trendItem,
              index !== trendingTopics.length - 1 && {
                borderBottomWidth: 0.5,
                borderBottomColor: theme.colors.border
              }
            ]}
            activeOpacity={0.7}
          >
            <View style={styles.trendInfo}>
              <Text style={[styles.trendTopic, { color: theme.colors.text }]}>
                #{item.topic}
              </Text>
              <Text style={[styles.trendCount, { color: theme.colors.textSecondary }]}>
                {item.posts} publicaciones
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.showMore}
          activeOpacity={0.7}
        >
          <Text style={[styles.showMoreText, { color: theme.colors.accent }]}>
            Ver más
          </Text>
        </TouchableOpacity>
      </View>

      {/* Who to Follow */}
      <View style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          shadowColor: theme.dark ? theme.colors.glow : '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: theme.dark ? 0.1 : 0.05,
          shadowRadius: 3,
        }
      ]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          Usuarios sugeridos
        </Text>

        {[1, 2, 3].map((_, index) => (
          <View
            key={index}
            style={[
              styles.suggestedUser,
              index !== 2 && {
                borderBottomWidth: 0.5,
                borderBottomColor: theme.colors.border
              }
            ]}
          >
            <View style={[styles.suggestedAvatar, { backgroundColor: theme.colors.accent }]}>
              <Ionicons name="person" size={20} color="white" />
            </View>
            <View style={styles.suggestedInfo}>
              <Text style={[styles.suggestedName, { color: theme.colors.text }]}>
                Usuario {index + 1}
              </Text>
              <Text style={[styles.suggestedHandle, { color: theme.colors.textSecondary }]}>
                @usuario{index + 1}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.followButton,
                {
                  backgroundColor: theme.colors.accent,
                  shadowColor: theme.colors.accent,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                }
              ]}
              activeOpacity={0.8}
            >
              <Text style={styles.followButtonText}>Seguir</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={styles.showMore}
          activeOpacity={0.7}
        >
          <Text style={[styles.showMoreText, { color: theme.colors.accent }]}>
            Ver más
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer Links */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
          Términos · Privacidad · © 2025 HideTok
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.xl,
    paddingTop: SPACING.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
    outlineStyle: 'none',
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 0.5,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
    letterSpacing: -0.3,
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  trendInfo: {
    flex: 1,
  },
  trendTopic: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  trendCount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
  },
  suggestedUser: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  suggestedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestedInfo: {
    flex: 1,
  },
  suggestedName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  suggestedHandle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
  },
  followButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  followButtonText: {
    color: 'white',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: -0.1,
  },
  showMore: {
    padding: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  showMoreText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
  },
  footer: {
    padding: SPACING.lg,
  },
  footerText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: 18,
  },
});

export default RightSidebar;
