import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useThemeColors } from '../../hooks/use-theme-colors';
import { useAuthStore } from '../../stores/auth.store';

export default function LoginScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const login = useAuthStore((state) => state.login);

  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleLogin = useCallback(async () => {
    try {
      setError('');
      await login(phone);
      router.push('/auth/verify-otp');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed');
    }
  }, [phone, login, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Secure Messenger</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Enter your phone number to continue
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
        placeholder="+380..."
        placeholderTextColor={colors.textSecondary}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
      />

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <Pressable
        style={[styles.button, { backgroundColor: colors.accent }]}
        onPress={() => void handleLogin()}
      >
        <Text style={styles.buttonText}>Continue</Text>
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
});
