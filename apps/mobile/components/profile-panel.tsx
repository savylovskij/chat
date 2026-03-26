import { format } from 'date-fns';
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
  }

  if (contactLastSeen !== undefined) {
    feedItems.push({
      label: t('chat.lastSeen', { time: format(new Date(contactLastSeen), 'HH:mm') }),
      color: colors.textSecondary,
      time: format(new Date(contactLastSeen), 'dd.MM'),
    });
  }

  if (chat.createdAt) {
    feedItems.push({
      label: t('feed.chatCreated'),
      color: colors.accent,
      time: format(new Date(chat.createdAt), 'dd.MM.yyyy'),
    });
  }

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
          <Text style={[styles.closeIcon, { color: colors.textSecondary }]}>{'\u2715'}</Text>
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
            <Text style={[styles.infoValue, { color: colors.onlineIndicator }]}>{'\u{1F512}'}</Text>
          </View>
        </View>

        {feedItems.length > 0 && (
          <View style={[styles.section, { borderTopColor: colors.border }]}>
            <Text style={[styles.feedTitle, { color: colors.textSecondary }]}>
              {t('feed.title')}
            </Text>
            {feedItems.map((item, index) => (
              <View key={index} style={styles.feedItem}>
                <View style={styles.feedTimeline}>
                  <View style={[styles.feedDot, { backgroundColor: item.color }]} />
                  {index < feedItems.length - 1 && (
                    <View style={[styles.feedLine, { backgroundColor: item.color }]} />
                  )}
                </View>
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
    minHeight: 40,
  },
  feedTimeline: {
    alignItems: 'center',
    width: 20,
    marginRight: 10,
  },
  feedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  feedLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    opacity: 0.3,
  },
  feedContent: {
    flex: 1,
    paddingBottom: 12,
  },
  feedLabel: {
    fontSize: 14,
  },
  feedTime: {
    fontSize: 12,
    marginTop: 2,
  },
});
