import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useThemeColors } from '../../hooks/use-theme-colors';
import { useAuthStore } from '../../stores/auth.store';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const router = useRouter();

  const register = useAuthStore((state) => state.register);

  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  const handleRegister = useCallback(async () => {
    try {
      setError('');
      await register(phone, displayName);
      router.push('/auth/verify-otp');
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : t('auth.loginFailed'));
    }
  }, [phone, displayName, register, router, t]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('auth.register')}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('auth.phonePrompt')}
      </Text>

      <TextInput
        style={[
          styles.input,
          {
            color: colors.textPrimary,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
        placeholder={t('auth.displayName')}
        placeholderTextColor={colors.textSecondary}
        value={displayName}
        onChangeText={setDisplayName}
        autoComplete="name"
        autoFocus
      />

      <TextInput
        style={[
          styles.input,
          {
            color: colors.textPrimary,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
        placeholder={t('auth.phonePlaceholder')}
        placeholderTextColor={colors.textSecondary}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
      />

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <Pressable
        style={[styles.button, { backgroundColor: colors.accent }]}
        onPress={() => void handleRegister()}
      >
        <Text style={styles.buttonText}>{t('auth.register')}</Text>
      </Pressable>

      <Pressable style={styles.linkRow} onPress={() => router.push('/auth/login')}>
        <Text style={[styles.linkText, { color: colors.textSecondary }]}>
          {t('auth.hasAccount')}{' '}
        </Text>
        <Text style={[styles.linkText, { color: colors.accent }]}>{t('auth.login')}</Text>
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
    fontSize: 28,
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
    fontSize: 18,
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
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  linkText: {
    fontSize: 14,
  },
});
