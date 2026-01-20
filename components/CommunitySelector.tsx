import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { communityService, Community } from '../services/communityService';
import { scale } from '../utils/scale';

interface CommunitySelectorProps {
  selectedCommunities: string[];
  onSelectionChange: (communityIds: string[]) => void;
  minSelection?: number;
  maxSelection?: number;
  showWarnings?: boolean;
}

const CommunitySelector: React.FC<CommunitySelectorProps> = ({
  selectedCommunities,
  onSelectionChange,
  minSelection = 1,
  maxSelection = 10,
  showWarnings = true,
}) => {
  const { theme } = useTheme();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warningShown, setWarningShown] = useState<string | null>(null);

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      setLoading(true);
      let comms = await communityService.getOfficialCommunities();

      // Si no hay comunidades, intentar hacer seed
      if (comms.length === 0) {
        console.log('No hay comunidades, ejecutando seed...');
        await communityService.seedOfficialCommunities();
        comms = await communityService.getOfficialCommunities();
      }

      setCommunities(comms);
    } catch (err) {
      console.error('Error loading communities:', err);
      setError('Error al cargar comunidades');
    } finally {
      setLoading(false);
    }
  };

  const toggleCommunity = (community: Community) => {
    if (!community.id) return;

    // Si tiene advertencia y no se ha mostrado, mostrarla primero
    if (showWarnings && community.warningMessage && !warningShown) {
      setWarningShown(community.id);
      return;
    }

    const isSelected = selectedCommunities.includes(community.id);

    if (isSelected) {
      // Deseleccionar
      if (selectedCommunities.length > minSelection) {
        onSelectionChange(selectedCommunities.filter(id => id !== community.id));
      }
    } else {
      // Seleccionar
      if (selectedCommunities.length < maxSelection) {
        onSelectionChange([...selectedCommunities, community.id]);
      }
    }

    // Reset warning
    setWarningShown(null);
  };

  const confirmWarning = (community: Community) => {
    if (!community.id) return;

    const isSelected = selectedCommunities.includes(community.id);
    if (!isSelected && selectedCommunities.length < maxSelection) {
      onSelectionChange([...selectedCommunities, community.id]);
    }
    setWarningShown(null);
  };

  const renderCommunityItem = ({ item }: { item: Community }) => {
    const isSelected = item.id ? selectedCommunities.includes(item.id) : false;
    const showingWarning = warningShown === item.id;

    return (
      <View>
        <TouchableOpacity
          style={[
            styles.communityCard,
            {
              backgroundColor: isSelected ? `${theme.colors.accent}15` : theme.colors.surface,
              borderColor: isSelected ? theme.colors.accent : theme.colors.border,
            },
          ]}
          onPress={() => toggleCommunity(item)}
          activeOpacity={0.7}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.accent}20` }]}>
            <Ionicons name={item.icon as any} size={scale(22)} color={theme.colors.accent} />
          </View>

          {/* Info */}
          <View style={styles.communityInfo}>
            <Text style={[styles.communityName, { color: theme.colors.text }]}>
              {item.name}
            </Text>
            <Text
              style={[styles.communityDescription, { color: theme.colors.textSecondary }]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
            <View style={styles.communityStats}>
              <Ionicons name="people-outline" size={scale(12)} color={theme.colors.textSecondary} />
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                {item.memberCount} miembros
              </Text>
            </View>
          </View>

          {/* Checkbox */}
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: isSelected ? theme.colors.accent : 'transparent',
                borderColor: isSelected ? theme.colors.accent : theme.colors.border,
              },
            ]}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={scale(14)} color="white" />
            )}
          </View>

          {/* Warning indicator */}
          {item.isUnfiltered && (
            <View style={[styles.warningBadge, { backgroundColor: '#f59e0b' }]}>
              <Ionicons name="warning" size={scale(10)} color="white" />
            </View>
          )}
        </TouchableOpacity>

        {/* Warning Modal */}
        {showingWarning && item.warningMessage && (
          <View style={[styles.warningContainer, { backgroundColor: `${theme.colors.warning || '#f59e0b'}15`, borderColor: theme.colors.warning || '#f59e0b' }]}>
            <View style={styles.warningContent}>
              <Ionicons name="warning" size={scale(20)} color={theme.colors.warning || '#f59e0b'} />
              <Text style={[styles.warningText, { color: theme.colors.text }]}>
                {item.warningMessage}
              </Text>
            </View>
            <View style={styles.warningButtons}>
              <TouchableOpacity
                style={[styles.warningButton, { borderColor: theme.colors.border }]}
                onPress={() => setWarningShown(null)}
              >
                <Text style={[styles.warningButtonText, { color: theme.colors.text }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.warningButton, styles.warningButtonPrimary, { backgroundColor: theme.colors.accent }]}
                onPress={() => confirmWarning(item)}
              >
                <Text style={[styles.warningButtonText, { color: 'white' }]}>
                  Entiendo, unirme
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Cargando comunidades...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={scale(40)} color={theme.colors.error || '#ef4444'} />
        <Text style={[styles.errorText, { color: theme.colors.text }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}
          onPress={loadCommunities}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Selection counter */}
      <View style={styles.header}>
        <Text style={[styles.selectionCount, { color: theme.colors.textSecondary }]}>
          {selectedCommunities.length} de {maxSelection} seleccionadas
          {selectedCommunities.length < minSelection && (
            <Text style={{ color: theme.colors.error || '#ef4444' }}>
              {' '}(mínimo {minSelection})
            </Text>
          )}
        </Text>
      </View>

      {/* Community list */}
      <FlatList
        data={communities}
        renderItem={renderCommunityItem}
        keyExtractor={(item) => item.id || item.slug}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: scale(10) }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: scale(12),
  },
  selectionCount: {
    fontSize: scale(13),
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: scale(20),
  },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(12),
    borderRadius: scale(12),
    borderWidth: 1,
    position: 'relative',
  },
  iconContainer: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityIcon: {
    fontSize: scale(22),
  },
  communityInfo: {
    flex: 1,
    marginLeft: scale(12),
    marginRight: scale(8),
  },
  communityName: {
    fontSize: scale(15),
    fontWeight: '600',
    marginBottom: scale(2),
  },
  communityDescription: {
    fontSize: scale(12),
    lineHeight: scale(16),
    marginBottom: scale(4),
  },
  communityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  statText: {
    fontSize: scale(11),
  },
  checkbox: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBadge: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    width: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningContainer: {
    marginTop: scale(8),
    padding: scale(12),
    borderRadius: scale(10),
    borderWidth: 1,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(10),
    marginBottom: scale(12),
  },
  warningText: {
    flex: 1,
    fontSize: scale(13),
    lineHeight: scale(18),
  },
  warningButtons: {
    flexDirection: 'row',
    gap: scale(10),
  },
  warningButton: {
    flex: 1,
    paddingVertical: scale(10),
    borderRadius: scale(8),
    alignItems: 'center',
    borderWidth: 1,
  },
  warningButtonPrimary: {
    borderWidth: 0,
  },
  warningButtonText: {
    fontSize: scale(13),
    fontWeight: '600',
  },
  loadingContainer: {
    padding: scale(40),
    alignItems: 'center',
    gap: scale(12),
  },
  loadingText: {
    fontSize: scale(14),
  },
  errorContainer: {
    padding: scale(40),
    alignItems: 'center',
    gap: scale(12),
  },
  errorText: {
    fontSize: scale(14),
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: scale(10),
    paddingHorizontal: scale(20),
    borderRadius: scale(8),
  },
  retryButtonText: {
    color: 'white',
    fontSize: scale(14),
    fontWeight: '600',
  },
});

export default CommunitySelector;
