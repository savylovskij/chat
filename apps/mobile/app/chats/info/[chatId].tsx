import { ChatType } from '@shared/enums/chat-type.enum';
import { MemberRole } from '@shared/enums/member-role.enum';
import { MessageType } from '@shared/enums/message-type.enum';
import { Chat } from '@shared/types/chat.interface';
import { Message } from '@shared/types/message.interface';
import { UserPublic } from '@shared/types/user-public.interface';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Avatar } from '../../../components/avatar';
import { BlurHeader } from '../../../components/blur-header';
import { useThemeColors } from '../../../hooks/use-theme-colors';
import { apiClient } from '../../../services/api-client';

interface MemberWithUser {
  id: string;
  userId: string;
  role: MemberRole;
  user: UserPublic;
}

type MediaFilter = 'all' | 'image' | 'video' | 'file';

const MEDIA_ITEM_GAP = 2;
const MEDIA_COLUMNS = 3;

export default function ChatInfoScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const router = useRouter();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();

  const [chat, setChat] = useState<Chat | null>(null);
  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [mediaMessages, setMediaMessages] = useState<Message[]>([]);
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [mediaLoading, setMediaLoading] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const mediaItemSize = (screenWidth - MEDIA_ITEM_GAP * (MEDIA_COLUMNS - 1) - 32) / MEDIA_COLUMNS;

  useEffect(() => {
    const loadChatInfo = async () => {
      try {
        const chatData = await apiClient.get<Chat>(`/chats/${chatId}`);
        setChat(chatData);

        if (chatData.type === ChatType.GROUP) {
          const memberData = await apiClient.get<MemberWithUser[]>(`/chats/${chatId}/members`);
          setMembers(memberData);
        }
      } catch {
        // Chat info failed to load
      }
    };

    void loadChatInfo();
  }, [chatId]);

  const loadMedia = useCallback(
    async (filter: MediaFilter) => {
      setMediaLoading(true);

      try {
        const params: Record<string, string> = { limit: '50' };
        if (filter !== 'all') {
          params.type = filter;
        }

        const result = await apiClient.get<Message[]>(`/chats/${chatId}/messages/media`, {
          params,
        });
        setMediaMessages(result);
      } catch {
        setMediaMessages([]);
      } finally {
        setMediaLoading(false);
      }
    },
    [chatId],
  );

  useEffect(() => {
    void loadMedia(mediaFilter);
  }, [mediaFilter, loadMedia]);

  const renderMember = ({ item }: { item: MemberWithUser }) => (
    <View style={[styles.memberItem, { borderBottomColor: colors.border }]}>
      <Avatar uri={item.user.avatarUrl} name={item.user.displayName} size={44} />

      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: colors.textPrimary }]}>
          {item.user.displayName}
        </Text>
        {item.user.isOnline ? (
          <Text style={[styles.memberStatus, { color: colors.accent }]}>{t('chat.online')}</Text>
        ) : item.user.lastSeenAt !== null ? (
          <Text style={[styles.memberStatus, { color: colors.textSecondary }]}>
            {t('chat.lastSeen', { time: new Date(item.user.lastSeenAt).toLocaleDateString() })}
          </Text>
        ) : null}
      </View>

      {item.role === MemberRole.ADMIN && (
        <View style={[styles.roleBadge, { backgroundColor: colors.accent }]}>
          <Text style={styles.roleBadgeText}>{t('chatInfo.admin')}</Text>
        </View>
      )}
    </View>
  );

  if (chat === null) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <BlurHeader title="" onBack={() => router.back()} />
      </View>
    );
  }

  const isGroup = chat.type === ChatType.GROUP;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BlurHeader title={t('chatInfo.title')} onBack={() => router.back()} />

      <ScrollView>
        <View style={styles.profileSection}>
          <Avatar uri={chat.avatarUrl} name={chat.name ?? ''} size={80} />
          <Text style={[styles.chatName, { color: colors.textPrimary }]}>
            {chat.name ?? t('chat.title')}
          </Text>
          {chat.description !== null && (
            <Text style={[styles.chatDescription, { color: colors.textSecondary }]}>
              {chat.description}
            </Text>
          )}
          {isGroup && (
            <Text style={[styles.memberCount, { color: colors.textSecondary }]}>
              {t('chat.members', { count: members.length })}
            </Text>
          )}
        </View>

        <View style={[styles.section, { borderTopColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('profile.e2ee')}
          </Text>
        </View>

        <View style={[styles.section, { borderTopColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('chatInfo.sharedMedia')}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {(['all', 'image', 'video', 'file'] as MediaFilter[]).map((filter) => (
              <Pressable
                key={filter}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: mediaFilter === filter ? colors.accent : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setMediaFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: mediaFilter === filter ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {filter === 'all'
                    ? 'All'
                    : filter === 'image'
                      ? t('chat.photo')
                      : filter === 'video'
                        ? t('chat.video')
                        : t('chat.file')}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {mediaLoading ? (
            <Text style={[styles.mediaLoadingText, { color: colors.textSecondary }]}>
              Loading...
            </Text>
          ) : mediaMessages.length > 0 ? (
            <View style={styles.mediaGrid}>
              {mediaMessages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.mediaItem,
                    {
                      width: mediaItemSize,
                      height: mediaItemSize,
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  {message.mediaUrl !== null &&
                  (message.type === MessageType.IMAGE || message.type === MessageType.VIDEO) ? (
                    <Image
                      source={{ uri: message.mediaUrl }}
                      style={styles.mediaThumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.fileItem}>
                      <Text style={styles.fileIcon}>
                        {message.type === MessageType.VOICE ? '\u{1F3A4}' : '\u{1F4C4}'}
                      </Text>
                      <Text
                        style={[styles.fileName, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {((message.mediaMetadata as Record<string, unknown> | null)?.fileName as
                          | string
                          | undefined) ?? t('chat.file')}
                      </Text>
                    </View>
                  )}
                  {message.type === MessageType.VIDEO && (
                    <View style={styles.videoOverlay}>
                      <Text style={styles.videoIcon}>{'\u25B6'}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.noMediaText, { color: colors.textSecondary }]}>
              No shared media yet
            </Text>
          )}
        </View>

        {isGroup && members.length > 0 && (
          <View style={[styles.section, { borderTopColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('profile.members')}
            </Text>

            <FlatList
              data={members}
              renderItem={renderMember}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        <View style={[styles.section, { borderTopColor: colors.border }]}>
          <Pressable style={styles.actionItem} onPress={() => router.back()}>
            <Text style={[styles.actionText, { color: colors.danger }]}>
              {isGroup ? t('chat.leaveGroup') : t('chat.deleteChat')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  chatName: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 12,
  },
  chatDescription: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  memberCount: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
  },
  memberStatus: {
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: MEDIA_ITEM_GAP,
  },
  mediaItem: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
  },
  fileItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  fileIcon: {
    fontSize: 24,
  },
  fileName: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  videoIcon: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  mediaLoadingText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
  },
  noMediaText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
  },
  actionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionText: {
    fontSize: 16,
  },
});
