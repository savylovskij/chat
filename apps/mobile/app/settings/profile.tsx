import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '../../components/avatar';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { useAuthStore } from '../../stores/auth.store';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    const trimmedName = displayName.trim();

    if (trimmedName === '') {
      Alert.alert(t('common.error'), t('profile.nameRequired'));
      return;
    }

    setSaving(true);

    try {
      await updateProfile({
        displayName: trimmedName,
        bio: bio.trim(),
      });

      Alert.alert(t('common.done'), t('profile.saved'));
    } catch {
      Alert.alert(t('common.error'), t('errors.RATE_LIMIT'));
    } finally {
      setSaving(false);
    }
  }, [displayName, bio, updateProfile, t]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.avatarSection}>
        <Avatar uri={user?.avatarUrl ?? null} name={user?.displayName ?? '?'} size={96} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {t('settings.editProfile')}
      </Text>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('auth.displayName')}</Text>
        <TextInput
          style={[
            styles.input,
            { color: colors.textPrimary, backgroundColor: colors.inputBackground },
          ]}
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={100}
          placeholder={t('auth.displayName')}
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>
          {t('profile.about')}
        </Text>
        <TextInput
          style={[
            styles.input,
            styles.bioInput,
            { color: colors.textPrimary, backgroundColor: colors.inputBackground },
          ]}
          value={bio}
          onChangeText={setBio}
          maxLength={500}
          placeholder={t('profile.about')}
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
        />
      </View>

      <Pressable
        style={[styles.saveButton, { backgroundColor: colors.accent, opacity: saving ? 0.6 : 1 }]}
        onPress={() => void handleSave()}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{t('common.save')}</Text>
      </Pressable>
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
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
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
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
