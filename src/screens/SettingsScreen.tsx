import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation, Language } from '../i18n';
import { ALERT_FREQUENCIES } from '../constants/categories';
import { getSettings, updateSettings, resetDatabase } from '../database';
import { AppSettings, ConsumptionMode, AlertFrequency, ThemeMode } from '../database';
import { SettingsStackParamList } from '../navigation/types';

const THEME_OPTIONS: { label: string; value: ThemeMode; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'light', value: 'light', icon: 'sunny-outline' },
  { label: 'dark', value: 'dark', icon: 'moon-outline' },
  { label: 'system', value: 'system', icon: 'phone-portrait-outline' },
];

type SettingsNavProp = NativeStackNavigationProp<SettingsStackParamList, 'SettingsMain'>;

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsNavProp>();
  const { colors, themeMode: activeThemeMode, setThemeMode } = useTheme();
  const { isAuthenticated, displayName, signOut } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  const styles = createStyles(colors);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleConsumptionMode = async () => {
    if (!settings) return;
    const newMode: ConsumptionMode =
      settings.defaultConsumptionMode === 'manual' ? 'auto' : 'manual';
    try {
      const updated = await updateSettings({ defaultConsumptionMode: newMode });
      setSettings(updated);
    } catch (error) {
      Alert.alert('Error', 'Failed to update settings.');
    }
  };

  const handleAlertFrequencyChange = async (frequency: AlertFrequency) => {
    try {
      const updated = await updateSettings({ alertFrequency: frequency });
      setSettings(updated);
    } catch (error) {
      Alert.alert('Error', 'Failed to update settings.');
    }
  };

  const handleThemeChange = async (mode: ThemeMode) => {
    if (mode === activeThemeMode) return;
    await setThemeMode(mode);
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (!settings) return;
    try {
      const updated = await updateSettings({ notificationsEnabled: value });
      setSettings(updated);
      if (value) {
        // Re-schedule expiry alerts when notifications are re-enabled
        const { scheduleExpiryAlerts } = await import('../services/notifications');
        await scheduleExpiryAlerts();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update notification settings.');
    }
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data',
      'This will permanently delete all items, consumption logs, shopping lists, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetDatabase();
              await loadSettings();
              // resetDatabase() resets themeMode back to 'system' at the DB
              // layer, but ThemeContext holds its own in-memory copy - sync
              // it here too, or the UI would keep showing whatever theme
              // was active before the reset until the app is restarted.
              await setThemeMode('system');
              Alert.alert('Success', 'All data has been reset.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset data.');
            }
          },
        },
      ]
    );
  };

  if (loading || !settings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Default Consumption Mode */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.consumptionModeDefault}</Text>
        <Text style={styles.sectionDescription}>
          Set the default mode for new items
        </Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              settings.defaultConsumptionMode === 'manual' && styles.toggleButtonActive,
            ]}
            onPress={() => {
              if (settings.defaultConsumptionMode !== 'manual') handleToggleConsumptionMode();
            }}
          >
            <Ionicons
              name="hand-left-outline"
              size={18}
              color={
                settings.defaultConsumptionMode === 'manual'
                  ? colors.surface
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.toggleText,
                settings.defaultConsumptionMode === 'manual' && styles.toggleTextActive,
              ]}
            >
              Manual
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              settings.defaultConsumptionMode === 'auto' && styles.toggleButtonActive,
            ]}
            onPress={() => {
              if (settings.defaultConsumptionMode !== 'auto') handleToggleConsumptionMode();
            }}
          >
            <Ionicons
              name="sync-outline"
              size={18}
              color={
                settings.defaultConsumptionMode === 'auto'
                  ? colors.surface
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.toggleText,
                settings.defaultConsumptionMode === 'auto' && styles.toggleTextActive,
              ]}
            >
              Auto
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Appearance / Theme */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.appearance}</Text>
        <Text style={styles.sectionDescription}>
          Choose how PantryPal looks. "System" follows your device's setting.
        </Text>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map((opt) => {
            const isActive = activeThemeMode === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.themeOption, isActive && styles.themeOptionActive]}
                onPress={() => handleThemeChange(opt.value)}
              >
                <Ionicons
                  name={opt.icon}
                  size={22}
                  color={isActive ? colors.surface : colors.textSecondary}
                />
                <Text style={[styles.themeOptionText, isActive && styles.themeOptionTextActive]}>
                  {t[opt.label as keyof typeof t]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Language */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.language}</Text>
        <Text style={styles.sectionDescription}>{t.selectLanguage}</Text>
        <View style={styles.themeRow}>
          <TouchableOpacity
            style={[styles.themeOption, language === 'en' && styles.themeOptionActive]}
            onPress={() => setLanguage('en')}
          >
            <Text style={[styles.themeOptionText, language === 'en' && styles.themeOptionTextActive]}>
              English
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.themeOption, language === 'hi' && styles.themeOptionActive]}
            onPress={() => setLanguage('hi')}
          >
            <Text style={[styles.themeOptionText, language === 'hi' && styles.themeOptionTextActive]}>
              हिंदी
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.notifications}</Text>
        <Text style={styles.sectionDescription}>
          {t.notificationsDescription}
        </Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t.enableNotifications}</Text>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={settings.notificationsEnabled ? colors.primary : colors.textLight}
          />
        </View>
      </View>

      {/* Alert Frequency */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.alertFrequency}</Text>
        <Text style={styles.sectionDescription}>
          How often to check and notify about low stock
        </Text>
        <View style={styles.radioGroup}>
          {ALERT_FREQUENCIES.map((freq) => (
            <TouchableOpacity
              key={freq.value}
              style={styles.radioRow}
              onPress={() => handleAlertFrequencyChange(freq.value as AlertFrequency)}
            >
              <Ionicons
                name={
                  settings.alertFrequency === freq.value
                    ? 'radio-button-on'
                    : 'radio-button-off'
                }
                size={22}
                color={
                  settings.alertFrequency === freq.value
                    ? colors.primary
                    : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.radioLabel,
                  settings.alertFrequency === freq.value && styles.radioLabelActive,
                ]}
              >
                {freq.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Cloud & Household */}
      <View style={styles.section}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="cloud-outline" size={20} color={colors.accent} />
          <Text style={styles.sectionTitle}>{t.cloudHousehold}</Text>
        </View>
        {isAuthenticated ? (
          <>
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>{t.signedInAs}</Text>
                <Text style={styles.sectionDescription}>{displayName}</Text>
              </View>
              <TouchableOpacity
                style={styles.signOutChip}
                onPress={() => {
                  Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign Out', style: 'destructive', onPress: signOut },
                  ]);
                }}
              >
                <Text style={styles.signOutChipText}>{t.signOut}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.householdButton}
              onPress={() => navigation.navigate('Household' as never)}
            >
              <Ionicons name="people-outline" size={20} color={colors.primary} />
              <Text style={styles.householdButtonText}>{t.manageHousehold}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.sectionDescription}>
              {t.cloudDescription}
            </Text>
            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => navigation.navigate('SignIn' as never)}
            >
              <Ionicons name="log-in-outline" size={20} color={colors.surface} />
              <Text style={styles.signInButtonText}>{t.signIn}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.about}</Text>
        <View style={styles.aboutCard}>
          <Ionicons name="leaf-outline" size={32} color={colors.primary} />
          <Text style={styles.appName}>PantryPal</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appDescription}>
            Track your grocery inventory, monitor consumption patterns, and never run out of essentials.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.replayGuideButton}
          onPress={() => navigation.navigate('Onboarding')}
        >
          <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.replayGuideButtonText}>{t.replayGuide}</Text>
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View style={styles.dangerSection}>
        <Text style={styles.dangerTitle}>{t.dangerZone}</Text>
        <TouchableOpacity style={styles.dangerButton} onPress={handleResetData}>
          <Ionicons name="warning-outline" size={20} color={colors.danger} />
          <Text style={styles.dangerButtonText}>{t.resetAllData}</Text>
        </TouchableOpacity>
        <Text style={styles.dangerDescription}>
          This will permanently delete all your items, logs, and settings.
        </Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: colors.text,
  },
  sectionDescription: {
    fontSize: FONT_SIZES.sm,
    color: colors.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    backgroundColor: colors.background,
    gap: SPACING.xs,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: FONT_SIZES.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: colors.surface,
  },
  themeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  themeOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  themeOptionText: {
    fontSize: FONT_SIZES.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  themeOptionTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  switchLabel: {
    fontSize: FONT_SIZES.lg,
    color: colors.text,
    fontWeight: '500',
  },
  radioGroup: {
    gap: SPACING.sm,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  radioLabel: {
    fontSize: FONT_SIZES.lg,
    color: colors.text,
  },
  radioLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  aboutCard: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  appName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: colors.text,
    marginTop: SPACING.sm,
  },
  appVersion: {
    fontSize: FONT_SIZES.sm,
    color: colors.textSecondary,
    marginTop: SPACING.xs,
  },
  appDescription: {
    fontSize: FONT_SIZES.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  replayGuideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  replayGuideButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: colors.primary,
  },
  dangerSection: {
    backgroundColor: colors.dangerBg,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: colors.danger + '30',
  },
  dangerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: colors.danger,
    marginBottom: SPACING.md,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: colors.danger,
  },
  dangerDescription: {
    fontSize: FONT_SIZES.sm,
    color: colors.danger,
    marginTop: SPACING.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  signOutChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  signOutChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: colors.danger,
  },
  householdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: SPACING.sm,
  },
  householdButtonText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: colors.primary,
  },
  signInButton: {
    backgroundColor: colors.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  signInButtonText: {
    color: colors.surface,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});
