import React, { useState } from 'react';
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
import { SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { ONBOARDING_TEMPLATES } from '../constants/categories';
import { createItem, markOnboardingComplete } from '../database';
import { useTranslation } from '../i18n';

interface TemplateSelection {
  name: string;
  category: string;
  unit: string;
  defaultQuantity: number;
  threshold: number;
  selected: boolean;
}

interface OnboardingScreenProps {
  // Called once onboarding is finished (either by adding items or skipping).
  // RootNavigator renders this screen OUTSIDE the tab navigator on first
  // launch (there are no tabs to navigate into yet), so completion is
  // signaled via this callback rather than navigation.reset() to a route
  // that doesn't exist in this navigator.
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(colors);
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<TemplateSelection[]>(
    ONBOARDING_TEMPLATES.map((t) => ({ ...t, selected: false }))
  );
  const [saving, setSaving] = useState(false);

  const selectedCount = templates.filter((t) => t.selected).length;

  const toggleItem = (index: number) => {
    setTemplates((prev) =>
      prev.map((t, i) => (i === index ? { ...t, selected: !t.selected } : t))
    );
  };

  const selectAll = () => {
    setTemplates((prev) => prev.map((t) => ({ ...t, selected: true })));
  };

  const clearAll = () => {
    setTemplates((prev) => prev.map((t) => ({ ...t, selected: false })));
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const selectedItems = templates.filter((t) => t.selected);
      for (const item of selectedItems) {
        await createItem({
          name: item.name,
          category: item.category,
          unit: item.unit,
          currentQuantity: item.defaultQuantity,
          threshold: item.threshold,
          consumptionMode: 'manual',
          // Required by CreateItemInput even when unused in manual mode
          autoConsumptionRate: null,
          autoConsumptionFrequency: null,
          // Price/expiry are optional and not part of onboarding templates
          price: null,
          expiryDate: null,
        });
      }
      await markOnboardingComplete();
      onComplete();
    } catch (error) {
      Alert.alert('Error', 'Failed to create items. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    try {
      await markOnboardingComplete();
      onComplete();
    } catch (error) {
      Alert.alert('Error', 'Failed to complete onboarding.');
    }
  };

  // Step 0: Welcome
  if (step === 0) {
    return (
      <View style={styles.welcomeContainer}>
        <View style={styles.welcomeContent}>
          <View style={styles.iconCircle}>
            <Ionicons name="leaf" size={48} color={colors.primary} />
          </View>
          <Text style={styles.welcomeTitle}>PantryPal</Text>
          <Text style={styles.welcomeSubtitle}>
            Never run out of essentials again
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="cube-outline" size={24} color={colors.primary} />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Track Inventory</Text>
                <Text style={styles.featureDescription}>
                  Keep tabs on what you have at home, including price and expiry dates
                </Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="barcode-outline" size={24} color={colors.accent} />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Scan Barcodes</Text>
                <Text style={styles.featureDescription}>
                  Scan a product barcode to add it in seconds
                </Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="sparkles-outline" size={24} color={colors.secondary} />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>AI Invoice Scanning</Text>
                <Text style={styles.featureDescription}>
                  Scan a Blinkit/Instamart/BigBasket invoice to add many items at once
                </Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="trending-down-outline" size={24} color={colors.warning} />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Monitor Usage</Text>
                <Text style={styles.featureDescription}>
                  Log consumption and get low stock alerts
                </Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="cart-outline" size={24} color={colors.success} />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Smart Shopping Lists</Text>
                <Text style={styles.featureDescription}>
                  Auto-generate lists from your usage patterns
                </Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="analytics-outline" size={24} color={colors.secondary} />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Insights & Analytics</Text>
                <Text style={styles.featureDescription}>
                  Understand your consumption patterns
                </Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.getStartedButton} onPress={() => setStep(1)}>
          <Text style={styles.getStartedText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.surface} />
        </TouchableOpacity>
      </View>
    );
  }

  // Step 1: Template Selection
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Common Items</Text>
        <Text style={styles.headerSubtitle}>
          Select items to add to your pantry
        </Text>
      </View>

      {/* Select All / Clear All */}
      <View style={styles.bulkActions}>
        <TouchableOpacity style={styles.bulkButton} onPress={selectAll}>
          <Ionicons name="checkbox-outline" size={18} color={colors.primary} />
          <Text style={styles.bulkButtonText}>Select All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bulkButton} onPress={clearAll}>
          <Ionicons name="close-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.bulkButtonText, { color: colors.textSecondary }]}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Template List */}
      <ScrollView style={styles.templateList} contentContainerStyle={styles.templateListContent}>
        {templates.map((template, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.templateItem, template.selected && styles.templateItemSelected]}
            onPress={() => toggleItem(index)}
          >
            <Ionicons
              name={template.selected ? 'checkbox' : 'square-outline'}
              size={22}
              color={template.selected ? colors.primary : colors.textLight}
            />
            <View style={styles.templateInfo}>
              <Text style={styles.templateName}>{template.name}</Text>
              <Text style={styles.templateDetail}>
                {template.category} • {template.defaultQuantity} {template.unit}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>{t.skip}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.addItemsButton,
            selectedCount === 0 && styles.addItemsButtonDisabled,
            saving && styles.addItemsButtonDisabled,
          ]}
          onPress={handleFinish}
          disabled={selectedCount === 0 || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <>
              <Text style={styles.addItemsButtonText}>
                Add {selectedCount} Item{selectedCount !== 1 ? 's' : ''}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={colors.surface} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  // Welcome Screen
  welcomeContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: SPACING.lg,
    justifyContent: 'space-between',
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.successBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  welcomeTitle: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '700',
    color: colors.text,
  },
  welcomeSubtitle: {
    fontSize: FONT_SIZES.lg,
    color: colors.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  featureList: {
    width: '100%',
    gap: SPACING.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: colors.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: colors.text,
  },
  featureDescription: {
    fontSize: FONT_SIZES.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  getStartedButton: {
    backgroundColor: colors.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  getStartedText: {
    color: colors.surface,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },

  // Template Selection Screen
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    color: colors.textSecondary,
    marginTop: SPACING.xs,
  },
  bulkActions: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  bulkButtonText: {
    fontSize: FONT_SIZES.md,
    color: colors.primary,
    fontWeight: '500',
  },
  templateList: {
    flex: 1,
  },
  templateListContent: {
    padding: SPACING.md,
    paddingTop: 0,
    paddingBottom: 100,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: colors.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '500',
    color: colors.text,
  },
  templateDetail: {
    fontSize: FONT_SIZES.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: SPACING.md,
    ...SHADOWS.md,
  },
  skipButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: FONT_SIZES.lg,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  addItemsButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  addItemsButtonDisabled: {
    opacity: 0.5,
  },
  addItemsButtonText: {
    color: colors.surface,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
});
