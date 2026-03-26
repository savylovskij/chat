import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { screenOptions } from '../_layout.styles';

export default function SettingsLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="storage" options={{ title: t('storage.title') }} />
    </Stack>
  );
}
