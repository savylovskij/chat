import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import { Breakpoints, ProfilePanelWidth, SidebarWidth } from '../constants/breakpoints';
import { LayoutType } from '../models/layout-type';
import { ResponsiveLayout } from '../models/responsive-layout.interface';

export function useResponsiveLayout(): ResponsiveLayout {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    if (width > Breakpoints.tablet) {
      return {
        layoutType: LayoutType.DESKTOP,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        sidebarWidth: SidebarWidth.desktop,
        profilePanelWidth: ProfilePanelWidth.desktop,
        windowWidth: width,
      };
    }

    if (width > Breakpoints.mobile) {
      return {
        layoutType: LayoutType.TABLET,
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        sidebarWidth: SidebarWidth.tablet,
        profilePanelWidth: ProfilePanelWidth.tablet,
        windowWidth: width,
      };
    }

    return {
      layoutType: LayoutType.MOBILE,
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      sidebarWidth: 0,
      profilePanelWidth: 0,
      windowWidth: width,
    };
  }, [width]);
}
