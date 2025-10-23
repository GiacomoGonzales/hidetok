import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Message } from '../services/messagesService';
import { formatRelativeTime } from '../utils/dateUtils';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isCurrentUser }) => {
  const { theme } = useTheme();

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <View
      style={[
        styles.container,
        isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isCurrentUser ? theme.colors.accent : theme.colors.surface,
            borderTopRightRadius: isCurrentUser ? 4 : BORDER_RADIUS.lg,
            borderTopLeftRadius: isCurrentUser ? BORDER_RADIUS.lg : 4,
          },
        ]}
      >
        {message.type === 'image' && message.imageUrl && (
          <Image
            source={{ uri: message.imageUrl }}
            style={[styles.messageImage, { backgroundColor: theme.colors.background }]}
            resizeMode="cover"
          />
        )}

        {message.content && (
          <Text
            style={[
              styles.messageText,
              {
                color: isCurrentUser ? '#FFFFFF' : theme.colors.text,
              },
            ]}
          >
            {message.content}
          </Text>
        )}

        <View style={styles.messageFooter}>
          <Text
            style={[
              styles.timestamp,
              {
                color: isCurrentUser
                  ? 'rgba(255, 255, 255, 0.7)'
                  : theme.colors.textSecondary,
              },
            ]}
          >
            {formatTime(message.timestamp)}
          </Text>
          {isCurrentUser && (
            <Text
              style={[
                styles.readStatus,
                { color: 'rgba(255, 255, 255, 0.7)' },
              ]}
            >
              {message.read ? '✓✓' : '✓'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.xs,
    paddingHorizontal: SPACING.lg,
  },
  currentUserContainer: {
    alignItems: 'flex-end',
  },
  otherUserContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
  },
  messageText: {
    fontSize: FONT_SIZE.base,
    lineHeight: 20,
    fontWeight: FONT_WEIGHT.regular,
    letterSpacing: -0.1,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: 4,
  },
  timestamp: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.regular,
  },
  readStatus: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.regular,
  },
});

export default MessageBubble;
