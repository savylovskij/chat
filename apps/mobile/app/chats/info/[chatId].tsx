import { ChatType } from '@shared/enums/chat-type.enum';
import { MemberRole } from '@shared/enums/member-role.enum';
import { Chat } from '@shared/types/chat.interface';
import { UserPublic } from '@shared/types/user-public.interface';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

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

export default function ChatInfoScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const router = useRouter();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();

  const [chat, setChat] = useState<Chat | null>(null);
  const [members, setMembers] = useState<MemberWithUser[]>([]);

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
  actionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionText: {
    fontSize: 16,
  },
});
