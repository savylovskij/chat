import { DarkTheme } from '../constants/colors';

export const screenOptions = {
  headerStyle: { backgroundColor: DarkTheme.background },
  headerTintColor: DarkTheme.textPrimary,
  contentStyle: { backgroundColor: DarkTheme.background },
} as const;
