import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { apiClient } from './api-client';

Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
});

class PushService {
  private responseSubscription: Notifications.Subscription | null = null;

  async registerForPushNotifications(): Promise<void> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (String(existingStatus) !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (String(finalStatus) !== 'granted') {
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;

    await apiClient.patch('/users/me/push-token', { pushToken });
  }

  setupNotificationListeners(): void {
    this.responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;

        if (data?.chatId !== undefined) {
          router.push(`/chats/${data.chatId as string}`);
        }
      },
    );
  }

  cleanup(): void {
    if (this.responseSubscription !== null) {
      this.responseSubscription.remove();
      this.responseSubscription = null;
    }
  }
}

export const pushService = new PushService();
