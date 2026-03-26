import { createContext, useContext } from 'react';

import { ChatsLayoutContextValue } from '../models/chats-layout-context.interface';

const defaultValue: ChatsLayoutContextValue = {
  openSidebarSheet: () => {},
  toggleProfilePanel: () => {},
  profileVisible: false,
  isMobile: true,
  isTablet: false,
  isDesktop: false,
};

export const ChatsLayoutContext = createContext<ChatsLayoutContextValue>(defaultValue);

export function useChatsLayout(): ChatsLayoutContextValue {
  return useContext(ChatsLayoutContext);
}
