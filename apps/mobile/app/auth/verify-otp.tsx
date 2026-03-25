import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useThemeColors } from '../../hooks/use-theme-colors';
import { useAuthStore } from '../../stores/auth.store';

export default function VerifyOtpScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const router = useRouter();

  const { verifyOtp } = useAuthStore();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleVerify = useCallback(async () => {
    try {
      setError('');
      await verifyOtp(code);
      const currentState = useAuthStore.getState();

      if (currentState.requires2FA) {
        router.push('/auth/verify-2fa');
      } else if (currentState.isAuthenticated) {
        router.replace('/chats');
      }
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : t('auth.verificationFailed'));
    }
  }, [code, verifyOtp, router, t]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('auth.otpTitle')}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('auth.otpSent')}</Text>

      <TextInput
        style={[
          styles.input,
          {
            color: colors.textPrimary,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
        placeholder={t('auth.otpPlaceholder')}
        placeholderTextColor={colors.textSecondary}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
      />

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <Pressable
        style={[styles.button, { backgroundColor: colors.accent }]}
        onPress={() => void handleVerify()}
      >
        <Text style={styles.buttonText}>{t('auth.verify')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 16,
  },
  error: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
