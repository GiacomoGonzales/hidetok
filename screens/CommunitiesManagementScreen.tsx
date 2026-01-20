import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { communityService, Community } from '../services/communityService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const CommunitiesManagementScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile, updateLocalProfile } = useUserProfile();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningCommunity, setJoiningCommunity] = useState<string | null>(null);

  // Comunidades a las que el usuario pertenece
  const joinedCommunityIds = userProfile?.joinedCommunities || [];

  const loadCommunities = useCallback(async () => {
    try {
      console.log('🔄 Cargando comunidades...');
      console.log('📋 joinedCommunityIds del perfil:', joinedCommunityIds);

      // Usar getOfficialCommunities que no requiere índice compuesto
      const allCommunities = await communityService.getOfficialCommunities();
      console.log('✅ Comunidades cargadas:', allCommunities.length);
      console.log('📋 IDs de comunidades:', allCommunities.map(c => c.id));

      // Verificar si hay match con los IDs del usuario
      const matches = allCommunities.filter(c => c.id && joinedCommunityIds.includes(c.id));
      console.log('🔗 Comunidades que coinciden:', matches.length);

      setCommunities(allCommunities);
    } catch (error) {
      console.error('Error loading communities:', error);
      Alert.alert('Error', 'No se pudieron cargar las comunidades');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [joinedCommunityIds]);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadCommunities();
  };

  const handleToggleCommunity = async (community: Community) => {
    if (!user || !community.id) return;

    const isJoined = joinedCommunityIds.includes(community.id);
    setJoiningCommunity(community.id);

    try {
      if (isJoined) {
        // Confirmar antes de salir
        Alert.alert(
          'Salir de comunidad',
          `¿Estás seguro de que quieres salir de "${community.name}"?`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => setJoiningCommunity(null) },
            {
              text: 'Salir',
              style: 'destructive',
              onPress: async () => {
                try {
                  await communityService.leaveCommunity(user.uid, community.id!);
                  // Actualizar estado local
                  const newJoinedCommunities = joinedCommunityIds.filter(id => id !== community.id);
                  updateLocalProfile({ joinedCommunities: newJoinedCommunities });
                  // Actualizar memberCount en la lista local
                  setCommunities(prev => prev.map(c =>
                    c.id === community.id
                      ? { ...c, memberCount: Math.max(0, c.memberCount - 1) }
                      : c
                  ));
                } catch (error) {
                  console.error('Error leaving community:', error);
                  Alert.alert('Error', 'No se pudo salir de la comunidad');
                } finally {
                  setJoiningCommunity(null);
                }
              },
            },
          ]
        );
      } else {
        // Unirse directamente
        await communityService.joinCommunity(user.uid, community.id);
        // Actualizar estado local
        const newJoinedCommunities = [...joinedCommunityIds, community.id];
        updateLocalProfile({ joinedCommunities: newJoinedCommunities });
        // Actualizar memberCount en la lista local
        setCommunities(prev => prev.map(c =>
          c.id === community.id
            ? { ...c, memberCount: c.memberCount + 1 }
            : c
        ));
        setJoiningCommunity(null);
      }
    } catch (error) {
      console.error('Error toggling community:', error);
      Alert.alert('Error', 'No se pudo completar la acción');
      setJoiningCommunity(null);
    }
  };

  const renderCommunityItem = ({ item }: { item: Community }) => {
    const isJoined = item.id ? joinedCommunityIds.includes(item.id) : false;
    const isToggling = joiningCommunity === item.id;

    return (
      <View style={[styles.communityItem, { backgroundColor: theme.colors.card }]}>
        <View style={[styles.communityIcon, { backgroundColor: theme.colors.surface }]}>
          <Ionicons
            name={item.icon as any || 'people'}
            size={24}
            color={theme.colors.accent}
          />
        </View>

        <View style={styles.communityInfo}>
          <View style={styles.communityHeader}>
            <Text style={[styles.communityName, { color: theme.colors.text }]}>
              {item.name}
            </Text>
            {item.isOfficial && (
              <View style={[styles.officialBadge, { backgroundColor: theme.colors.accent + '20' }]}>
                <Ionicons name="checkmark-circle" size={12} color={theme.colors.accent} />
                <Text style={[styles.officialText, { color: theme.colors.accent }]}>Oficial</Text>
              </View>
            )}
          </View>
          <Text
            style={[styles.communityDescription, { color: theme.colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
          <View style={styles.communityStats}>
            <Ionicons name="people-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.memberCount, { color: theme.colors.textSecondary }]}>
              {item.memberCount} {item.memberCount === 1 ? 'miembro' : 'miembros'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.joinButton,
            isJoined
              ? { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }
              : { backgroundColor: theme.colors.accent }
          ]}
          onPress={() => handleToggleCommunity(item)}
          disabled={isToggling}
          activeOpacity={0.7}
        >
          {isToggling ? (
            <ActivityIndicator size="small" color={isJoined ? theme.colors.text : 'white'} />
          ) : (
            <>
              <Ionicons
                name={isJoined ? 'checkmark' : 'add'}
                size={16}
                color={isJoined ? theme.colors.text : 'white'}
              />
              <Text style={[
                styles.joinButtonText,
                { color: isJoined ? theme.colors.text : 'white' }
              ]}>
                {isJoined ? 'Unido' : 'Unirse'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderSectionHeader = (title: string, count: number) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {title}
      </Text>
      <View style={[styles.countBadge, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
          {count}
        </Text>
      </View>
    </View>
  );

  // Separar comunidades unidas y disponibles
  const joinedCommunities = communities.filter(c => c.id && joinedCommunityIds.includes(c.id));
  const availableCommunities = communities.filter(c => c.id && !joinedCommunityIds.includes(c.id));

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Cargando comunidades...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, {
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.border,
        paddingTop: insets.top + SPACING.sm,
      }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Mis Comunidades
        </Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={[
          { type: 'header-joined', count: joinedCommunities.length },
          ...joinedCommunities.map(c => ({ type: 'community', data: c })),
          { type: 'header-available', count: availableCommunities.length },
          ...availableCommunities.map(c => ({ type: 'community', data: c })),
        ]}
        renderItem={({ item }) => {
          if (item.type === 'header-joined') {
            return renderSectionHeader('Comunidades unidas', item.count as number);
          }
          if (item.type === 'header-available') {
            return renderSectionHeader('Descubrir comunidades', item.count as number);
          }
          return renderCommunityItem({ item: (item as any).data });
        }}
        keyExtractor={(item, index) => {
          if (item.type === 'header-joined' || item.type === 'header-available') {
            return item.type;
          }
          return (item as any).data?.id || `community-${index}`;
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No hay comunidades disponibles
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 0.5,
  },
  backButton: {
    padding: SPACING.xs,
    width: 40,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.3,
  },
  headerRight: {
    width: 40,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.base,
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  countText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  communityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.md,
  },
  communityIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityInfo: {
    flex: 1,
    gap: 4,
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  communityName: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    gap: 2,
  },
  officialText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.medium,
  },
  communityDescription: {
    fontSize: FONT_SIZE.sm,
    lineHeight: 18,
  },
  communityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  memberCount: {
    fontSize: FONT_SIZE.xs,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: 4,
    minWidth: scale(80),
  },
  joinButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
    paddingHorizontal: SPACING.lg,
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.base,
    textAlign: 'center',
  },
});

export default CommunitiesManagementScreen;
