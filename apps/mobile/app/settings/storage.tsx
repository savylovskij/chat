import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  KEEP_MEDIA_OPTIONS,
  MAX_CACHE_OPTIONS,
} from '../../constants';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { MediaType } from '../../models/media-type.type';
import { useStorageStore } from '../../stores/storage.store';
import { formatFileSize } from '../../utils/format-file-size';

export default function StorageScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const {
    storageInfo,
    settings,
    isLoading,
    fetchStorageInfo,
    clearAll,
    clearChat,
    clearByType,
    updateSettings,
  } = useStorageStore();

  useEffect(() => {
    void fetchStorageInfo();
  }, [fetchStorageInfo]);

  const categories: MediaType[] = useMemo(() => ['photo', 'video', 'file', 'voice', 'other'], []);

  const handleClearAll = useCallback(() => {
    Alert.alert(t('storage.clearAll'), t('storage.confirmClear'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.confirm'), style: 'destructive', onPress: () => void clearAll() },
    ]);
  }, [t, clearAll]);

  const handleClearChat = useCallback(
    (chatId: string) => {
      Alert.alert(t('storage.clearChat'), t('storage.confirmClear'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), style: 'destructive', onPress: () => void clearChat(chatId) },
      ]);
    },
    [t, clearChat],
  );

  const handleClearByType = useCallback(
    (type: MediaType) => {
      Alert.alert(t(`storage.${type}s` as 'storage.photos'), t('storage.confirmClear'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: () => void clearByType(type),
        },
      ]);
    },
    [t, clearByType],
  );

  const handleKeepMediaChange = useCallback(() => {
    const options = KEEP_MEDIA_OPTIONS.map((option) =>
      option.value === 'forever' ? t(option.labelKey) : option.labelKey,
    );

    Alert.alert(t('storage.keepMedia'), undefined, [
      ...KEEP_MEDIA_OPTIONS.map((option, index) => ({
        text: options[index],
        onPress: () => void updateSettings({ keepMediaDuration: option.value }),
      })),
      { text: t('common.cancel'), style: 'cancel' as const },
    ]);
  }, [t, updateSettings]);

  const handleMaxCacheChange = useCallback(() => {
    Alert.alert(t('storage.maxCache'), undefined, [
      ...MAX_CACHE_OPTIONS.map((option) => ({
        text: option.value === null ? t(option.label) : option.label,
        onPress: () => void updateSettings({ maxCacheSize: option.value }),
      })),
      { text: t('common.cancel'), style: 'cancel' as const },
    ]);
  }, [t, updateSettings]);

  const keepMediaLabel = useMemo(() => {
    const option = KEEP_MEDIA_OPTIONS.find((opt) => opt.value === settings.keepMediaDuration);
    if (!option) return '';
    return option.value === 'forever' ? t(option.labelKey) : option.labelKey;
  }, [settings.keepMediaDuration, t]);

  const maxCacheLabel = useMemo(() => {
    const option = MAX_CACHE_OPTIONS.find((opt) => opt.value === settings.maxCacheSize);
    if (!option) return '';
    return option.value === null ? t(option.label) : option.label;
  }, [settings.maxCacheSize, t]);

  const pieSegments = useMemo(() => {
    if (!storageInfo || storageInfo.total === 0) return [];

    let currentAngle = 0;
    return categories
      .filter((type) => storageInfo.byType[type] > 0)
      .map((type) => {
        const percentage = storageInfo.byType[type] / storageInfo.total;
        const startAngle = currentAngle;
        currentAngle += percentage * 360;
        return { type, startAngle, sweepAngle: percentage * 360, color: CATEGORY_COLORS[type] };
      });
  }, [storageInfo, categories]);

  if (isLoading && !storageInfo) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Total usage */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={styles.totalRow}>
          <View style={styles.pieContainer}>
            {storageInfo && storageInfo.total > 0 ? (
              <View style={styles.pieChart}>
                {pieSegments.map((segment) => (
                  <View
                    key={segment.type}
                    style={[
                      styles.pieSegment,
                      {
                        backgroundColor: segment.color,
                        transform: [{ rotate: `${segment.startAngle}deg` }],
                        opacity: 0.8 + (segment.sweepAngle / 360) * 0.2,
                      },
                    ]}
                  />
                ))}
              </View>
            ) : (
              <View style={[styles.pieChart, { backgroundColor: colors.border }]} />
            )}
          </View>
          <View style={styles.totalInfo}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
              {t('storage.totalUsage')}
            </Text>
            <Text style={[styles.totalSize, { color: colors.textPrimary }]}>
              {formatFileSize(storageInfo?.total ?? 0)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.clearAllButton, { backgroundColor: colors.danger }]}
          onPress={handleClearAll}
        >
          <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
          <Text style={styles.clearAllText}>{t('storage.clearAll')}</Text>
        </TouchableOpacity>
      </View>

      {/* Category breakdown */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        {categories.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.categoryRow, { borderBottomColor: colors.border }]}
            onPress={() => handleClearByType(type)}
          >
            <View style={[styles.categoryIcon, { backgroundColor: CATEGORY_COLORS[type] + '20' }]}>
              <Ionicons name={CATEGORY_ICONS[type]} size={20} color={CATEGORY_COLORS[type]} />
            </View>
            <Text style={[styles.categoryName, { color: colors.textPrimary }]}>
              {t(`storage.${type}s` as 'storage.photos')}
            </Text>
            <Text style={[styles.categorySize, { color: colors.textSecondary }]}>
              {formatFileSize(storageInfo?.byType[type] ?? 0)}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Chat breakdown */}
      {storageInfo && storageInfo.byChat.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('chat.title')}
          </Text>
          {storageInfo.byChat.map((chat) => (
            <View key={chat.chatId} style={[styles.chatRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.chatName, { color: colors.textPrimary }]} numberOfLines={1}>
                {chat.chatName}
              </Text>
              <Text style={[styles.chatSize, { color: colors.textSecondary }]}>
                {formatFileSize(chat.size)}
              </Text>
              <TouchableOpacity
                style={[styles.chatClearButton, { borderColor: colors.border }]}
                onPress={() => handleClearChat(chat.chatId)}
              >
                <Text style={[styles.chatClearText, { color: colors.danger }]}>
                  {t('storage.clearChat')}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Auto-management settings */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t('storage.autoDownload')}
        </Text>

        <TouchableOpacity
          style={[styles.settingRow, { borderBottomColor: colors.border }]}
          onPress={handleKeepMediaChange}
        >
          <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
            {t('storage.keepMedia')}
          </Text>
          <View style={styles.settingValue}>
            <Text style={[styles.settingValueText, { color: colors.accent }]}>
              {keepMediaLabel}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingRow, { borderBottomColor: colors.border }]}
          onPress={handleMaxCacheChange}
        >
          <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
            {t('storage.maxCache')}
          </Text>
          <View style={styles.settingValue}>
            <Text style={[styles.settingValueText, { color: colors.accent }]}>{maxCacheLabel}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pieContainer: {
    marginRight: 16,
  },
  pieChart: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieSegment: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  totalInfo: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  totalSize: {
    fontSize: 28,
    fontWeight: '700',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  clearAllText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryName: {
    flex: 1,
    fontSize: 15,
  },
  categorySize: {
    fontSize: 14,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chatName: {
    flex: 1,
    fontSize: 15,
    marginRight: 8,
  },
  chatSize: {
    fontSize: 14,
    marginRight: 12,
  },
  chatClearButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chatClearText: {
    fontSize: 13,
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLabel: {
    fontSize: 15,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValueText: {
    fontSize: 15,
  },
  bottomSpacer: {
    height: 32,
  },
});
