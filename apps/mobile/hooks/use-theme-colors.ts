import { useColorScheme } from 'react-native';

import { Colors } from '../constants/colors';
import { ThemeColors } from '../models/theme-colors.type';

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();

  return scheme === 'dark' ? Colors.dark : Colors.light;
}
