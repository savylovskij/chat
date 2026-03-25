import * as ImagePicker from 'expo-image-picker';
import { memo, useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useThemeColors } from '../hooks/use-theme-colors';
import { MessageInputProps } from '../models/message-input-props.interface';
import { socketService } from '../services/socket.service';

export const MessageInput = memo(function MessageInput({ onSend, chatId }: MessageInputProps) {
  const colors = useThemeColors();
  const [text, setText] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const handleChangeText = useCallback(
    (value: string) => {
      setText(value);

      if (!isTypingRef.current && value.length > 0) {
        isTypingRef.current = true;
        socketService.startTyping(chatId);
      }

      if (typingTimeoutRef.current !== null) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (isTypingRef.current) {
          isTypingRef.current = false;
          socketService.stopTyping(chatId);
        }
      }, 2000);
    },
    [chatId],
  );

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    onSend(trimmed);
    setText('');

    if (isTypingRef.current) {
      isTypingRef.current = false;
      socketService.stopTyping(chatId);
    }
  }, [text, onSend, chatId]);

  const handleAttach = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      // Upload and send media message — handled by parent
    }
  }, []);

  const hasText = text.trim().length > 0;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}
    >
      <Pressable style={styles.attachButton} onPress={() => void handleAttach()}>
        <Text style={[styles.attachIcon, { color: colors.accent }]}>+</Text>
      </Pressable>

      <TextInput
        style={[
          styles.input,
          { color: colors.textPrimary, backgroundColor: colors.inputBackground },
        ]}
        placeholder="Message..."
        placeholderTextColor={colors.textSecondary}
        value={text}
        onChangeText={handleChangeText}
        multiline
        maxLength={4096}
      />

      {hasText ? (
        <Pressable
          style={[styles.sendButton, { backgroundColor: colors.accent }]}
          onPress={handleSend}
        >
          <Text style={styles.sendIcon}>{'\u2191'}</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.micButton}>
          <Text style={[styles.micIcon, { color: colors.accent }]}>{'\u{1F3A4}'}</Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  attachIcon: {
    fontSize: 24,
    fontWeight: '300',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 120,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  micButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  micIcon: {
    fontSize: 20,
  },
});
