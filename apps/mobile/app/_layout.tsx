import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ErrorBoundary } from '../components/error-boundary';
import { NetworkToast } from '../components/network-toast';
import { useNetworkStatus } from '../hooks/use-network-status';
import '../i18n';
import { networkMonitorService } from '../services/network-monitor.service';
import { offlineQueueService } from '../services/offline-queue.service';
import { pushService } from '../services/push.service';
import { useAuthStore } from '../stores/auth.store';
import { useStorageStore } from '../stores/storage.store';

import { screenOptions } from './_layout.styles';

export default function RootLayout() {
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const runAutoCleanup = useStorageStore((state) => state.runAutoCleanup);
  const isConnected = useNetworkStatus();

  useEffect(() => {
    networkMonitorService.start();
    void offlineQueueService.load();
    pushService.setupNotificationListeners();

    return () => pushService.cleanup();
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    void runAutoCleanup();
  }, [runAutoCleanup]);

  return (
    <ErrorBoundary>
      <StatusBar style="light" />
      <NetworkToast isConnected={isConnected} />

      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="chats" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
    </ErrorBoundary>
  );
}
