import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../services/firestoreService';
import { formatNumber } from '../data/mockData';
import AvatarDisplay from './avatars/AvatarDisplay';
import { Timestamp } from 'firebase/firestore';

interface ShareablePostCardProps {
  post: Post;
  authorName: string;
  authorAvatarType?: string;
  authorAvatarId?: string;
  authorPhotoURL?: string;
  communityName?: string;
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = Math.min(screenWidth - 40, 400);

// Función para obtener tiempo relativo de forma segura
const getTimeAgo = (createdAt: any): string => {
  try {
    let date: Date;

    if (!createdAt) return '';

    // Manejar Firestore Timestamp
    if (createdAt instanceof Timestamp) {
      date = createdAt.toDate();
    } else if (createdAt?.toDate && typeof createdAt.toDate === 'function') {
      date = createdAt.toDate();
    } else if (createdAt instanceof Date) {
      date = createdAt;
    } else if (typeof createdAt === 'number') {
      date = new Date(createdAt);
    } else {
      return '';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'ahora';
    if (diffMins < 60) return `hace ${diffMins}m`;
    if (diffHours < 24) return `hace ${diffHours}h`;
    if (diffDays < 7) return `hace ${diffDays}d`;

    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  } catch (error) {
    console.error('Error parsing date:', error);
    return '';
  }
};

const ShareablePostCard: React.FC<ShareablePostCardProps> = ({
  post,
  authorName,
  authorAvatarType,
  authorAvatarId,
  authorPhotoURL,
  communityName,
}) => {
  const timeAgo = getTimeAgo(post.createdAt);

  return (
    <View style={styles.container}>
      {/* Gradient background */}
      <View style={styles.gradientBg}>
        {/* Card */}
        <View style={styles.card}>
          {/* Header with logo */}
          <View style={styles.brandHeader}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/icon.png')}
                style={styles.logo}
                contentFit="contain"
              />
              <Text style={styles.brandName}>HideTok</Text>
            </View>
            {communityName && (
              <View style={styles.communityBadge}>
                <Text style={styles.communityText}>{communityName}</Text>
              </View>
            )}
          </View>

          {/* Author info */}
          <View style={styles.authorSection}>
            <AvatarDisplay
              size={44}
              avatarType={authorAvatarType || 'predefined'}
              avatarId={authorAvatarId || 'male'}
              photoURL={authorPhotoURL}
              backgroundColor="#8B5CF6"
              showBorder={false}
            />
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{authorName}</Text>
              <Text style={styles.timeAgo}>{timeAgo}</Text>
            </View>
          </View>

          {/* Content */}
          <Text style={styles.content} numberOfLines={8}>
            {post.content}
          </Text>

          {/* Image if exists */}
          {post.imageUrls && post.imageUrls.length > 0 && (
            <Image
              source={{ uri: post.imageUrlsThumbnails?.[0] || post.imageUrls[0] }}
              style={styles.postImage}
              contentFit="cover"
            />
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {post.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Ionicons name="thumbs-up" size={16} color="#22C55E" />
              <Text style={styles.statText}>{formatNumber(post.agreementCount || 0)}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="thumbs-down" size={16} color="#EF4444" />
              <Text style={styles.statText}>{formatNumber(post.disagreementCount || 0)}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="chatbubble" size={16} color="#6B7280" />
              <Text style={styles.statText}>{formatNumber(post.comments || 0)}</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerCta}>Opina de forma anónima en HideTok</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    alignSelf: 'center',
  },
  gradientBg: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 16,
    // Simulated gradient with overlay
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B5CF6',
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  communityBadge: {
    backgroundColor: '#8B5CF6' + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  communityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorInfo: {
    marginLeft: 12,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  timeAgo: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1F2937',
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tagChip: {
    backgroundColor: '#8B5CF6' + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  footer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  footerCta: {
    fontSize: 13,
    color: '#8B5CF6',
    fontWeight: '600',
  },
});

export default ShareablePostCard;
