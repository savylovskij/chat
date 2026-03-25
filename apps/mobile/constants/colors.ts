export const LightTheme = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  senderBubble: '#E3F2FD',
  receiverBubble: '#F5F5F5',
  accent: '#2196F3',
  textPrimary: '#212121',
  textSecondary: '#757575',
  textOnAccent: '#FFFFFF',
  border: '#E0E0E0',
  unreadBadge: '#2196F3',
  onlineIndicator: '#4CAF50',
  inputBackground: '#F5F5F5',
  danger: '#F44336',
} as const;

export const DarkTheme = {
  background: '#1A1A2E',
  surface: '#2D2D44',
  senderBubble: '#1B4965',
  receiverBubble: '#2D2D44',
  accent: '#2196F3',
  textPrimary: '#E8E8EC',
  textSecondary: '#A0A0B0',
  textOnAccent: '#FFFFFF',
  border: '#3D3D54',
  unreadBadge: '#2196F3',
  onlineIndicator: '#4CAF50',
  inputBackground: '#2D2D44',
  danger: '#F44336',
} as const;

export const Colors = {
  light: LightTheme,
  dark: DarkTheme,
} as const;
