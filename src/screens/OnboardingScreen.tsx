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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { ONBOARDING_TEMPLATES } from '../constants/categories';
import { createItem, markOnboardingComplete } from '../database';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';

type OnboardingNavProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

interface TemplateSelection {
  name: string;
  category: string;
  unit: string;
  defaultQuantity: number;
  threshold: number;
  selected: boolean;
}

export default function OnboardingScreen() {
  const navigation = useNavigation<OnboardingNavProp>();
  const { colors } = useTheme();
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<TemplateSelection[]>(
    ONBOARDING_TEMPLATES.map((t) => ({ ...t, selected: false }))
  );
  const [saving, setSaving] = useState(false);

  const selectedCount = templates.filter((t) => t.selected).length;

  const tutorialSteps = [
    {
      icon: 'cube-outline' as keyof typeof Ionicons.glyphMap,
      title: 'Track Your Pantry',
      description: 'Add items with quantity, category, and expiry. Get alerts when stock is low.',
      color: COLORS.primary,
    },
    {
      icon: 'cart-outline' as keyof typeof Ionicons.glyphMap,
      title: 'Smart Shopping',
      description: 'Auto-generate shopping lists, share via WhatsApp, save templates for reuse.',
      color: COLORS.success,
    },
    {
      icon: 'barcode-outline' as keyof typeof Ionicons.glyphMap,
      title: 'Scan & Import',
      description: 'Scan barcodes to add items instantly, or paste order text from Blinkit/Instamart.',
      color: COLORS.secondary,
    },
    {
      icon: 'people-outline' as keyof typeof Ionicons.glyphMap,
      title: 'Family Sharing',
      description: 'Share your pantry and shopping list with family using a simple 6-digit code.',
      color: COLORS.warning,
    },
  ];

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
        try {
          await createItem({
            name: item.name,
            category: item.category,
            unit: item.unit,
            currentQuantity: item.defaultQuantity,
            threshold: item.threshold,
            consumptionMode: 'manual',
          });
        } catch (itemError) {
          // Skip items that fail (e.g., duplicates) and continue
        }
      }
      await markOnboardingComplete();
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (error) {
      Alert.alert('Error', 'Failed to create items. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    try {
      await markOnboardingComplete();
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
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
            <Ionicons name="leaf" size={48} color={COLORS.primary} />
          </View>
          <Text style={[styles.welcomeTitle, { fontFamily: 'Poppins_700Bold' }]}>PantryPal</Text>
          <Text style={styles.welcomeSubtitle}>
            Never run out of essentials again
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="cube-outline" size={24} color={COLORS.primary} />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Track Inventory</Text>
                <Text style={styles.featureDescription}>
                  Keep tabs on what you have at home
                </Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="trending-down-outline" size={24} color={COLORS.warning} />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Monitor Usage</Text>
                <Text style={styles.featureDescription}>
                  Log consumption and get low stock alerts
                </Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="cart-outline" size={24} color={COLORS.success} />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Smart Shopping Lists</Text>
                <Text style={styles.featureDescription}>
                  Auto-generate lists from your usage patterns
                </Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="analytics-outline" size={24} color={COLORS.secondary} />
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
          <Ionicons name="arrow-forward" size={20} color={COLORS.surface} />
        </TouchableOpacity>
      </View>
    );
  }

  // Steps 1-4: Tutorial Steps
  if (step >= 1 && step <= 4) {
    const tutorialIndex = step - 1;
    const currentTutorial = tutorialSteps[tutorialIndex];
    const totalTutorialSteps = tutorialSteps.length;

    return (
      <View style={[styles.welcomeContainer, { backgroundColor: colors.background }]}>
        <View style={styles.welcomeContent}>
          <View style={[styles.tutorialIconCircle, { backgroundColor: currentTutorial.color + '15' }]}>
            <Ionicons name={currentTutorial.icon} size={64} color={currentTutorial.color} />
          </View>
          <Text style={[styles.tutorialTitle, { color: colors.text }]}>{currentTutorial.title}</Text>
          <Text style={[styles.tutorialDescription, { color: colors.textSecondary }]}>
            {currentTutorial.description}
          </Text>

          {/* Progress Dots */}
          <View style={styles.progressDots}>
            {tutorialSteps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === tutorialIndex ? styles.dotActive : styles.dotInactive,
                  index === tutorialIndex && { backgroundColor: currentTutorial.color },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.tutorialButtons}>
          <TouchableOpacity style={styles.skipTutorialButton} onPress={() => setStep(5)}>
            <Text style={[styles.skipTutorialText, { color: colors.textSecondary }]}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: currentTutorial.color }]}
            onPress={() => setStep(step + 1)}
          >
            <Text style={styles.nextButtonText}>
              {tutorialIndex === totalTutorialSteps - 1 ? 'Continue' : 'Next'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 5: Template Selection
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
          <Ionicons name="checkmark-done-outline" size={18} color={COLORS.primary} />
          <Text style={styles.bulkButtonText}>Select All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bulkButton} onPress={clearAll}>
          <Ionicons name="close-circle-outline" size={18} color={COLORS.textSecondary} />
          <Text style={[styles.bulkButtonText, { color: COLORS.textSecondary }]}>Clear All</Text>
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
              color={template.selected ? COLORS.primary : COLORS.textLight}
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
          <Text style={styles.skipButtonText}>Skip</Text>
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
            <ActivityIndicator size="small" color={COLORS.surface} />
          ) : (
            <>
              <Text style={styles.addItemsButtonText}>
                Add {selectedCount} Item{selectedCount !== 1 ? 's' : ''}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.surface} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Welcome Screen
  welcomeContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
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
    backgroundColor: COLORS.successBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  welcomeTitle: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '700',
    color: COLORS.text,
  },
  welcomeSubtitle: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  featureDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  getStartedButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  getStartedText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },

  // Template Selection Screen
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
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
    color: COLORS.primary,
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
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  templateItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '500',
    color: COLORS.text,
  },
  templateDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  addItemsButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
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
    color: COLORS.surface,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  // Tutorial Steps
  tutorialIconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  tutorialTitle: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  tutorialDescription: {
    fontSize: FONT_SIZES.lg,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  progressDots: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    width: 24,
    borderRadius: 5,
  },
  dotInactive: {
    backgroundColor: COLORS.textLight,
  },
  tutorialButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  skipTutorialButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  skipTutorialText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '500',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
});
