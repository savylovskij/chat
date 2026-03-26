import { Slot, useRouter, useSegments } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { BlurHeader } from '../../components/blur-header';
import { ChatSidebar } from '../../components/chat-sidebar';
import { ProfilePanel } from '../../components/profile-panel';
import { SidebarSheet } from '../../components/sidebar-sheet';
import { ChatsLayoutContext } from '../../contexts/chats-layout.context';
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

  const openSidebarSheet = useCallback(() => {
    setSidebarSheetVisible(true);
  }, []);

  const toggleProfilePanel = useCallback(() => {
    setProfileVisible((previous) => !previous);
  }, []);

  const contextValue = useMemo(
    () => ({
      openSidebarSheet,
      toggleProfilePanel,
      profileVisible,
      isMobile: layout.isMobile,
      isTablet: layout.isTablet,
      isDesktop: layout.isDesktop,
    }),
    [
      openSidebarSheet,
      toggleProfilePanel,
      profileVisible,
      layout.isMobile,
      layout.isTablet,
      layout.isDesktop,
    ],
  );

  if (layout.isMobile) {
    return (
      <ChatsLayoutContext.Provider value={contextValue}>
        <Slot />

        <SidebarSheet
          visible={sidebarSheetVisible}
          onClose={() => setSidebarSheetVisible(false)}
          onChatPress={handleChatPress}
        />
      </ChatsLayoutContext.Provider>
    );
  }

  return (
    <ChatsLayoutContext.Provider value={contextValue}>
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
          <BlurHeader title={t('chat.title')} />

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
    </ChatsLayoutContext.Provider>
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
