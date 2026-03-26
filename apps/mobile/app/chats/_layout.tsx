import { Slot, useRouter, useSegments } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { ChatSidebar } from '../../components/chat-sidebar';
import { ProfilePanel } from '../../components/profile-panel';
import { SidebarSheet } from '../../components/sidebar-sheet';
import { useResponsiveLayout } from '../../hooks/use-responsive-layout';
import { useThemeColors } from '../../hooks/use-theme-colors';

export default function ChatsLayout() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const router = useRouter();
  const segments = useSegments();
  const layout = useResponsiveLayout();
  const [sidebarSheetVisible, setSidebarSheetVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);

  const activeChatId = segments.length > 1 ? (segments as string[])[1] : undefined;

  const handleChatPress = useCallback(
    (chatId: string) => {
      router.push(`/chats/${chatId}`);
    },
    [router],
  );

  if (layout.isMobile) {
    return (
      <>
        <Slot />

        <SidebarSheet
          visible={sidebarSheetVisible}
          onClose={() => setSidebarSheetVisible(false)}
          onChatPress={handleChatPress}
        />
      </>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.sidebar,
          {
            width: layout.sidebarWidth,
            borderRightColor: colors.border,
          },
        ]}
      >
        <View style={[styles.sidebarHeader, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sidebarTitle, { color: colors.textPrimary }]}>
            {t('chat.title')}
          </Text>
        </View>

        <ChatSidebar onChatPress={handleChatPress} activeChatId={activeChatId} />
      </View>

      <View style={styles.content}>
        {activeChatId !== undefined ? (
          <Slot />
        ) : (
          <View style={styles.placeholder}>
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
              {t('chat.selectChat')}
            </Text>
          </View>
        )}
      </View>

      {profileVisible && activeChatId !== undefined && (
        <ProfilePanel
          chatId={activeChatId}
          width={layout.profilePanelWidth}
          onClose={() => setProfileVisible(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  sidebarHeader: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 16,
  },
});
