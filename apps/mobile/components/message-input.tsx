import { memo, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useThemeColors } from '../hooks/use-theme-colors';
import { MediaAsset } from '../models/media-asset.interface';
import { MessageInputProps } from '../models/message-input-props.interface';
import { socketService } from '../services/socket.service';

import { MediaPicker } from './media-picker';
import { UploadProgress } from './upload-progress';
import { VoiceRecorder } from './voice-recorder';

export const MessageInput = memo(function MessageInput({
  onSend,
  onSendMedia,
  chatId,
  uploadProgress,
  uploadFileName,
}: MessageInputProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [text, setText] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
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

  const handleMediaSelect = useCallback(
    (asset: MediaAsset) => {
      onSendMedia(asset);
    },
    [onSendMedia],
  );

  const handleVoiceRecordComplete = useCallback(
    (asset: MediaAsset) => {
      onSendMedia(asset);
    },
    [onSendMedia],
  );

  const hasText = text.trim().length > 0;
  const isUploading = uploadProgress !== null;

  return (
    <View>
      {isUploading && uploadFileName !== null && (
        <UploadProgress percentage={uploadProgress} fileName={uploadFileName} />
      )}

      <View
        style={[
          styles.container,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <Pressable style={styles.attachButton} onPress={() => setPickerVisible(true)}>
          <Text style={[styles.attachIcon, { color: colors.accent }]}>+</Text>
        </Pressable>

        <TextInput
          style={[
            styles.input,
            { color: colors.textPrimary, backgroundColor: colors.inputBackground },
          ]}
          placeholder={t('chat.typeMessage')}
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
          <VoiceRecorder onRecordComplete={handleVoiceRecordComplete} />
        )}
      </View>

      <MediaPicker
        visible={pickerVisible}
        onSelect={handleMediaSelect}
        onClose={() => setPickerVisible(false)}
      />
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
});
