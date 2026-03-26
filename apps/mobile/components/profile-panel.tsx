import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../hooks/use-theme-colors';
import { ProfilePanelProps } from '../models/profile-panel-props.interface';
import { useChatStore } from '../stores/chat.store';
import { usePresenceStore } from '../stores/presence.store';

import { Avatar } from './avatar';

export const ProfilePanel = memo(function ProfilePanel({
  chatId,
  width,
  onClose,
}: ProfilePanelProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const chat = useChatStore((state) => state.chats.find((item) => item.id === chatId));
  const onlineUsers = usePresenceStore((state) => state.onlineUsers);

  if (!chat) {
    return null;
  }

  const isOnline = chat.createdBy ? onlineUsers.has(chat.createdBy) : false;

  return (
    <View
      style={[
        styles.container,
        {
          width,
          backgroundColor: colors.background,
          borderLeftColor: colors.border,
        },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t('profile.title')}
        </Text>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={[styles.closeIcon, { color: colors.textSecondary }]}>✕</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <Avatar uri={chat.avatarUrl} name={chat.name ?? '?'} size={80} />
          <Text style={[styles.name, { color: colors.textPrimary }]}>{chat.name ?? 'Chat'}</Text>
          {isOnline && (
            <Text style={[styles.status, { color: colors.onlineIndicator }]}>
              {t('chat.online')}
            </Text>
          )}
        </View>

        <View style={[styles.section, { borderTopColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              {t('profile.e2ee')}
            </Text>
            <Text style={[styles.infoValue, { color: colors.onlineIndicator }]}>🔒</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 18,
  },
  content: {
    padding: 16,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
  },
  status: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
  },
});
