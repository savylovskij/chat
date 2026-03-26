import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../hooks/use-theme-colors';
import { SidebarSheetProps } from '../models/sidebar-sheet-props.interface';

import { ChatSidebar } from './chat-sidebar';

export const SidebarSheet = memo(function SidebarSheet({
  visible,
  onClose,
  onChatPress,
}: SidebarSheetProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const handleChatPress = useCallback(
    (chatId: string) => {
      onClose();
      onChatPress(chatId);
    },
    [onClose, onChatPress],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.handle} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('chat.title')}</Text>
          </View>

          <ChatSidebar onChatPress={handleChatPress} />
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    height: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginTop: -16,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#808080',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});
