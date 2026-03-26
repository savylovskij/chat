import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { screenOptions } from '../_layout.styles';

export default function SettingsLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="storage" options={{ title: t('storage.title') }} />
      <Stack.Screen name="devices" options={{ title: t('settings.devices') }} />
      <Stack.Screen name="security" options={{ title: t('settings.security') }} />
      <Stack.Screen name="profile" options={{ title: t('settings.editProfile') }} />
    </Stack>
  );
}
