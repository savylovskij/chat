import { MessageType } from '@shared/enums/message-type.enum';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../hooks/use-theme-colors';
import { MediaAsset } from '../models/media-asset.interface';
import { MediaPickerProps } from '../models/media-picker-props.interface';
import { mediaService } from '../services/media.service';

export const MediaPicker = memo(function MediaPicker({
  visible,
  onSelect,
  onClose,
}: MediaPickerProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const handleImageLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      const pickedAsset = result.assets[0];
      const mimeType = pickedAsset.mimeType ?? 'image/jpeg';
      const asset: MediaAsset = {
        uri: pickedAsset.uri,
        fileName: pickedAsset.fileName ?? `media_${Date.now()}`,
        mimeType,
        fileSize: pickedAsset.fileSize ?? 0,
        width: pickedAsset.width,
        height: pickedAsset.height,
        duration: pickedAsset.duration ?? undefined,
        messageType: mediaService.getMessageTypeFromMime(mimeType),
      };
      onSelect(asset);
    }

    onClose();
  }, [onSelect, onClose]);

  const handleCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      onClose();
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      const pickedAsset = result.assets[0];
      const mimeType = pickedAsset.mimeType ?? 'image/jpeg';
      const asset: MediaAsset = {
        uri: pickedAsset.uri,
        fileName: pickedAsset.fileName ?? `photo_${Date.now()}.jpg`,
        mimeType,
        fileSize: pickedAsset.fileSize ?? 0,
        width: pickedAsset.width,
        height: pickedAsset.height,
        messageType: mediaService.getMessageTypeFromMime(mimeType),
      };
      onSelect(asset);
    }

    onClose();
  }, [onSelect, onClose]);

  const handleDocument = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const pickedAsset = result.assets[0];
      const mimeType = pickedAsset.mimeType ?? 'application/octet-stream';
      const asset: MediaAsset = {
        uri: pickedAsset.uri,
        fileName: pickedAsset.name,
        mimeType,
        fileSize: pickedAsset.size ?? 0,
        messageType: MessageType.FILE,
      };
      onSelect(asset);
    }

    onClose();
  }, [onSelect, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <Pressable
            style={[styles.option, { borderBottomColor: colors.border }]}
            onPress={() => void handleImageLibrary()}
          >
            <Text style={styles.optionIcon}>{'\u{1F5BC}'}</Text>
            <Text style={[styles.optionText, { color: colors.textPrimary }]}>Photo & Video</Text>
          </Pressable>

          <Pressable
            style={[styles.option, { borderBottomColor: colors.border }]}
            onPress={() => void handleCamera()}
          >
            <Text style={styles.optionIcon}>{'\u{1F4F7}'}</Text>
            <Text style={[styles.optionText, { color: colors.textPrimary }]}>
              {t('chat.camera')}
            </Text>
          </Pressable>

          <Pressable style={styles.option} onPress={() => void handleDocument()}>
            <Text style={styles.optionIcon}>{'\u{1F4C4}'}</Text>
            <Text style={[styles.optionText, { color: colors.textPrimary }]}>
              {t('chat.document')}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.cancelButton, { backgroundColor: colors.background }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: colors.accent }]}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
