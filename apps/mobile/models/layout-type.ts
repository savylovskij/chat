export const LayoutType = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
} as const;

export type LayoutType = (typeof LayoutType)[keyof typeof LayoutType];
