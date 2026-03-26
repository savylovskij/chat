import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../../hooks/use-theme-colors';
import { apiClient } from '../../services/api-client';

interface Device {
  id: string;
  deviceName: string;
  platform: string;
  lastActiveAt: string;
  createdAt: string;
}

export default function DevicesScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = useCallback(async () => {
    try {
      const result = await apiClient.get<{ data: Device[] }>('/users/me/devices');
      setDevices(result.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDevices();
  }, [fetchDevices]);

  const handleTerminate = useCallback(
    (deviceId: string, deviceName: string) => {
      Alert.alert(
        t('settings.terminateSession'),
        t('settings.terminateConfirm', { device: deviceName }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            style: 'destructive',
            onPress: () => {
              void apiClient.delete(`/users/me/devices/${deviceId}`).then(() => {
                setDevices((prev) => prev.filter((device) => device.id !== deviceId));
              });
            },
          },
        ],
      );
    },
    [t],
  );

  const handleTerminateAll = useCallback(() => {
    Alert.alert(t('settings.terminateAllSessions'), t('settings.terminateAllConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: () => {
          const otherDevices = devices.slice(1);
          const deleteAll = otherDevices.reduce(
            (chain, device) => chain.then(() => apiClient.delete(`/users/me/devices/${device.id}`)),
            Promise.resolve(undefined as unknown as void),
          );
          void deleteAll.then(() => {
            setDevices((prev) => (prev.length > 0 ? [prev[0]] : []));
          });
        },
      },
    ]);
  }, [t, devices]);

  const platformIcon = (platform: string): string => {
    switch (platform.toLowerCase()) {
      case 'ios':
        return '\u{1F4F1}';
      case 'android':
        return '\u{1F4F1}';
      case 'macos':
      case 'windows':
        return '\u{1F4BB}';
      default:
        return '\u{1F310}';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {t('settings.devices')}
      </Text>

      {devices.map((device, index) => {
        const isCurrentDevice = index === 0;

        return (
          <View
            key={device.id}
            style={[
              styles.deviceCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.deviceHeader}>
              <Text style={styles.deviceIcon}>{platformIcon(device.platform)}</Text>
              <View style={styles.deviceInfo}>
                <View style={styles.deviceNameRow}>
                  <Text style={[styles.deviceName, { color: colors.textPrimary }]}>
                    {device.deviceName}
                  </Text>
                  {isCurrentDevice && (
                    <View style={[styles.currentBadge, { backgroundColor: colors.accent }]}>
                      <Text style={styles.currentBadgeText}>{t('settings.thisDevice')}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.devicePlatform, { color: colors.textSecondary }]}>
                  {device.platform}
                </Text>
                <Text style={[styles.deviceLastActive, { color: colors.textSecondary }]}>
                  {t('settings.lastActive')}:{' '}
                  {format(new Date(device.lastActiveAt), 'dd.MM.yyyy HH:mm')}
                </Text>
              </View>
            </View>

            {!isCurrentDevice && (
              <Pressable
                style={[styles.terminateButton, { borderColor: colors.danger }]}
                onPress={() => handleTerminate(device.id, device.deviceName)}
              >
                <Text style={[styles.terminateText, { color: colors.danger }]}>
                  {t('settings.terminate')}
                </Text>
              </Pressable>
            )}
          </View>
        );
      })}

      {devices.length > 1 && (
        <Pressable
          style={[styles.terminateAllButton, { backgroundColor: colors.danger }]}
          onPress={handleTerminateAll}
        >
          <Text style={styles.terminateAllText}>{t('settings.terminateAllOther')}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  deviceCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  deviceHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  deviceIcon: {
    fontSize: 28,
    marginTop: 2,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  devicePlatform: {
    fontSize: 13,
    marginTop: 2,
  },
  deviceLastActive: {
    fontSize: 12,
    marginTop: 4,
  },
  terminateButton: {
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  terminateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  terminateAllButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  terminateAllText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
