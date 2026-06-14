import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { ALERT_FREQUENCIES } from '../constants/categories';
import { getSettings, updateSettings, resetDatabase } from '../database';
import { AppSettings, ConsumptionMode, AlertFrequency } from '../database';

export default function SettingsScreen() {
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
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Default Consumption Mode */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Default Consumption Mode</Text>
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
                  ? COLORS.surface
                  : COLORS.textSecondary
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
                  ? COLORS.surface
                  : COLORS.textSecondary
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

      {/* Alert Frequency */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alert Frequency</Text>
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
                    ? COLORS.primary
                    : COLORS.textSecondary
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

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutCard}>
          <Ionicons name="leaf-outline" size={32} color={COLORS.primary} />
          <Text style={styles.appName}>Grocery Tracker</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appDescription}>
            Track your grocery inventory, monitor consumption patterns, and never run out of essentials.
          </Text>
        </View>
      </View>

      {/* Danger Zone */}
      <View style={styles.dangerSection}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <TouchableOpacity style={styles.dangerButton} onPress={handleResetData}>
          <Ionicons name="warning-outline" size={20} color={COLORS.danger} />
          <Text style={styles.dangerButtonText}>Reset All Data</Text>
        </TouchableOpacity>
        <Text style={styles.dangerDescription}>
          This will permanently delete all your items, logs, and settings.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    gap: SPACING.xs,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: COLORS.surface,
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
    color: COLORS.text,
  },
  radioLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  aboutCard: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  appName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  appVersion: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  appDescription: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  dangerSection: {
    backgroundColor: COLORS.dangerBg,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.danger + '30',
  },
  dangerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.danger,
    marginBottom: SPACING.md,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  dangerButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.danger,
  },
  dangerDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.danger,
    marginTop: SPACING.sm,
    textAlign: 'center',
    opacity: 0.8,
  },
});
