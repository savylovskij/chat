import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useAuthStore } from '../stores/auth.store';

import { screenOptions } from './_layout.styles';

export default function RootLayout() {
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  return (
    <>
      <StatusBar style="light" />

      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="chats/index" options={{ title: 'Chats' }} />
        <Stack.Screen name="chats/[chatId]" options={{ title: '' }} />
      </Stack>
    </>
  );
}
