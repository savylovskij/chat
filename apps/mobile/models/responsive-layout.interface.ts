import { LayoutType } from './layout-type';

export interface ResponsiveLayout {
  layoutType: LayoutType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  sidebarWidth: number;
  profilePanelWidth: number;
  windowWidth: number;
}
