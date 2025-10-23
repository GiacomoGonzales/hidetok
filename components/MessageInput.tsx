import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, ICON_SIZE } from '../constants/design';

interface MessageInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  placeholder = '¿Qué quieres decir?',
  disabled = false,
}) => {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.card,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.7}
            disabled={disabled}
          >
            <Ionicons
              name="happy-outline"
              size={ICON_SIZE.md}
              color={disabled ? theme.colors.textSecondary : theme.colors.text}
            />
          </TouchableOpacity>

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
            style={styles.iconButton}
            activeOpacity={0.7}
            disabled={disabled}
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 0.5,
    gap: SPACING.sm,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : 0,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
    letterSpacing: -0.1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    maxHeight: 90,
    outlineStyle: 'none',
  },
  iconButton: {
    padding: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
});

export default MessageInput;
