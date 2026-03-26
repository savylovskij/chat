export interface SidebarSheetProps {
  visible: boolean;
  onClose: () => void;
  onChatPress: (chatId: string) => void;
}
