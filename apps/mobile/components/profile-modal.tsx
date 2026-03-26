import { format } from 'date-fns';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../hooks/use-theme-colors';
import { ProfileModalProps } from '../models/profile-modal-props.interface';
import { useChatStore } from '../stores/chat.store';
import { usePresenceStore } from '../stores/presence.store';

import { Avatar } from './avatar';

export const ProfileModal = memo(function ProfileModal({
  visible,
  chatId,
  onClose,
}: ProfileModalProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const chat = useChatStore((state) => state.chats.find((item) => item.id === chatId));
  const onlineUsers = usePresenceStore((state) => state.onlineUsers);
  const lastSeen = usePresenceStore((state) => state.lastSeen);

  if (!chat) {
    return null;
  }

  const contactId = chat.createdBy ?? '';
  const isOnline = contactId !== '' ? onlineUsers.has(contactId) : false;
  const contactLastSeen = contactId !== '' ? lastSeen[contactId] : undefined;

  const feedItems: { label: string; color: string; time: string }[] = [];

  if (isOnline) {
    feedItems.push({
      label: t('chat.online'),
      color: colors.onlineIndicator,
      time: format(new Date(), 'HH:mm'),
    });
  } else if (contactLastSeen !== undefined) {
    feedItems.push({
      label: t('chat.lastSeen', { time: format(new Date(contactLastSeen), 'HH:mm') }),
      color: colors.textSecondary,
      time: format(new Date(contactLastSeen), 'dd.MM'),
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeIcon, { color: colors.accent }]}>{'\u2039'}</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('profile.title')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.avatarSection}>
            <Avatar uri={chat.avatarUrl} name={chat.name ?? '?'} size={100} />
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
              <Text style={[styles.infoValue, { color: colors.onlineIndicator }]}>
                {'\uD83D\uDD12'}
              </Text>
            </View>
          </View>

          {feedItems.length > 0 && (
            <View style={[styles.section, { borderTopColor: colors.border }]}>
              <Text style={[styles.feedTitle, { color: colors.textSecondary }]}>Activity</Text>
              {feedItems.map((item, index) => (
                <View key={index} style={styles.feedItem}>
                  <View style={[styles.feedDot, { backgroundColor: item.color }]} />
                  <View style={styles.feedContent}>
                    <Text style={[styles.feedLabel, { color: colors.textPrimary }]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.feedTime, { color: colors.textSecondary }]}>
                      {item.time}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 28,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
  },
  status: {
    fontSize: 14,
    marginTop: 6,
  },
  section: {
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 16,
  },
  infoValue: {
    fontSize: 16,
  },
  feedTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  feedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 10,
  },
  feedContent: {
    flex: 1,
  },
  feedLabel: {
    fontSize: 14,
  },
  feedTime: {
    fontSize: 12,
    marginTop: 2,
  },
});
