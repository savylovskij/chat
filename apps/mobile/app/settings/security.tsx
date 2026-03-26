import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useThemeColors } from '../../hooks/use-theme-colors';
import { apiClient } from '../../services/api-client';
import { useAuthStore } from '../../stores/auth.store';

export default function SecurityScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const user = useAuthStore((state) => state.user);
  const [totpEnabled, setTotpEnabled] = useState(user?.totpEnabled ?? false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleToggle2FA = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        setLoading(true);

        try {
          const result = await apiClient.post<{
            qrCodeDataUrl: string;
            secret: string;
            manualEntryKey: string;
          }>('/auth/2fa/enable', {});

          setQrDataUrl(result.qrCodeDataUrl);
        } catch {
          Alert.alert(t('common.error'), t('errors.RATE_LIMIT'));
        } finally {
          setLoading(false);
        }
      } else {
        Alert.alert(t('settings.disable2FA'), t('settings.disable2FAConfirm'), [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            style: 'destructive',
            onPress: () => {
              void apiClient
                .post('/auth/2fa/disable', { code: '000000' })
                .then(() => {
                  setTotpEnabled(false);
                  setQrDataUrl(null);
                  setRecoveryCodes(null);
                })
                .catch(() => {
                  Alert.alert(t('common.error'), t('errors.AUTH_INVALID_CREDENTIALS'));
                });
            },
          },
        ]);
      }
    },
    [t],
  );

  const handleConfirm2FA = useCallback(async () => {
    if (confirmCode.length !== 6) return;

    setLoading(true);

    try {
      const result = await apiClient.post<{ recoveryCodes: string[] }>('/auth/2fa/confirm', {
        code: confirmCode,
      });

      setTotpEnabled(true);
      setQrDataUrl(null);
      setConfirmCode('');
      setRecoveryCodes(result.recoveryCodes);
    } catch {
      Alert.alert(t('common.error'), t('errors.AUTH_INVALID_CREDENTIALS'));
    } finally {
      setLoading(false);
    }
  }, [confirmCode, t]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {t('settings.security')}
      </Text>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.row}>
          <View style={styles.rowLabel}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
              {t('auth.2fa.setup')}
            </Text>
            <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
              {totpEnabled ? t('auth.2fa.enabled') : t('settings.enable2FADescription')}
            </Text>
          </View>
          <Switch
            value={totpEnabled || qrDataUrl !== null}
            onValueChange={(value) => void handleToggle2FA(value)}
            disabled={loading}
            trackColor={{ false: colors.border, true: colors.accent }}
          />
        </View>
      </View>

      {qrDataUrl !== null && (
        <View
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.qrLabel, { color: colors.textPrimary }]}>
            {t('auth.2fa.scanQR')}
          </Text>

          <View style={styles.codeInput}>
            <TextInput
              style={[
                styles.input,
                { color: colors.textPrimary, backgroundColor: colors.inputBackground },
              ]}
              placeholder={t('auth.2fa.enterCode')}
              placeholderTextColor={colors.textSecondary}
              value={confirmCode}
              onChangeText={setConfirmCode}
              keyboardType="number-pad"
              maxLength={6}
            />
            <Pressable
              style={[
                styles.confirmButton,
                { backgroundColor: colors.accent, opacity: confirmCode.length === 6 ? 1 : 0.5 },
              ]}
              onPress={() => void handleConfirm2FA()}
              disabled={confirmCode.length !== 6 || loading}
            >
              <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {recoveryCodes !== null && (
        <View
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.recoveryTitle, { color: colors.textPrimary }]}>
            {t('auth.2fa.recoveryCodes')}
          </Text>
          <View style={styles.codesGrid}>
            {recoveryCodes.map((code) => (
              <Text key={code} style={[styles.recoveryCode, { color: colors.accent }]}>
                {code}
              </Text>
            ))}
          </View>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.row}>
          <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{t('auth.phone')}</Text>
          <Text style={[styles.phoneValue, { color: colors.textSecondary }]}>
            {user?.phone ?? ''}
          </Text>
        </View>
      </View>
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    flex: 1,
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  qrLabel: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  codeInput: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
  },
  confirmButton: {
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  recoveryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  codesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recoveryCode: {
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  phoneValue: {
    fontSize: 16,
  },
});
