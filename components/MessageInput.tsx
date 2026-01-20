import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, ICON_SIZE } from '../constants/design';

interface MessageInputProps {
  onSend: (message: string) => void;
  onImagePress?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onImagePress,
  placeholder = '¿Qué quieres decir?',
  disabled = false,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingBottom: Platform.OS === 'ios' ? SPACING.sm : SPACING.md,
        },
      ]}
    >
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.text,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
          editable={!disabled}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />

        <TouchableOpacity
          style={styles.imageButton}
          activeOpacity={0.7}
          disabled={disabled}
          onPress={onImagePress}
        >
          <Ionicons
            name="image-outline"
            size={ICON_SIZE.md}
            color={disabled ? theme.colors.textSecondary : theme.colors.text}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.sendButton,
          {
            backgroundColor: message.trim() && !disabled ? theme.colors.accent : theme.colors.surface,
            shadowColor: message.trim() && !disabled ? theme.colors.accent : 'transparent',
          },
        ]}
        onPress={handleSend}
        disabled={!message.trim() || disabled}
        activeOpacity={0.8}
      >
        <Ionicons
          name="send"
          size={ICON_SIZE.sm}
          color={message.trim() && !disabled ? '#FFFFFF' : theme.colors.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    minHeight: 44,
    maxHeight: 100,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
    letterSpacing: -0.1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    outlineStyle: 'none',
  },
  imageButton: {
    padding: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default MessageInput;
