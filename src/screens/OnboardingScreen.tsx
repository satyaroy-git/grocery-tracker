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
  const { t, language } = useTranslation();
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
    const features = language === 'hi' ? [
      { icon: 'cube-outline' as const, color: colors.primary, title: 'इन्वेंटरी ट्रैक करें', desc: 'घर में क्या है, कीमत और एक्सपायरी तिथि सहित ट्रैक करें' },
      { icon: 'barcode-outline' as const, color: colors.accent, title: 'बारकोड स्कैन करें', desc: 'प्रोडक्ट बारकोड स्कैन करके सेकंडों में जोड़ें' },
      { icon: 'sparkles-outline' as const, color: colors.secondary, title: 'AI इनवॉइस स्कैनिंग', desc: 'Blinkit/Instamart/BigBasket इनवॉइस स्कैन करके एक साथ कई आइटम जोड़ें' },
      { icon: 'restaurant-outline' as const, color: colors.danger, title: 'AI रेसिपी सुझाव', desc: 'पैंट्री में उपलब्ध सामग्री के आधार पर दैनिक भोजन सुझाव पाएं' },
      { icon: 'trending-down-outline' as const, color: colors.warning, title: 'उपयोग मॉनिटर करें', desc: 'उपभोग लॉग करें और कम स्टॉक अलर्ट पाएं' },
      { icon: 'cart-outline' as const, color: colors.success, title: 'स्मार्ट शॉपिंग लिस्ट', desc: 'उपयोग पैटर्न से ऑटो-जनरेट सूची' },
      { icon: 'analytics-outline' as const, color: colors.secondary, title: 'विश्लेषण और एनालिटिक्स', desc: 'अपने उपभोग पैटर्न को समझें' },
      { icon: 'people-outline' as const, color: colors.accent, title: 'परिवार शेयरिंग', desc: 'क्लाउड सिंक के ज़रिए परिवार के सदस्यों के साथ पैंट्री शेयर करें' },
    ] : [
      { icon: 'cube-outline' as const, color: colors.primary, title: 'Track Inventory', desc: 'Keep tabs on what you have at home, including price and expiry dates' },
      { icon: 'barcode-outline' as const, color: colors.accent, title: 'Scan Barcodes', desc: 'Scan a product barcode to add it in seconds' },
      { icon: 'sparkles-outline' as const, color: colors.secondary, title: 'AI Invoice Scanning', desc: 'Scan a Blinkit/Instamart/BigBasket invoice to add many items at once' },
      { icon: 'restaurant-outline' as const, color: colors.danger, title: 'AI Recipe Suggestions', desc: 'Get daily meal ideas (breakfast, lunch, dinner) based on your pantry items' },
      { icon: 'trending-down-outline' as const, color: colors.warning, title: 'Monitor Usage', desc: 'Log consumption and get low stock alerts' },
      { icon: 'cart-outline' as const, color: colors.success, title: 'Smart Shopping Lists', desc: 'Auto-generate lists from your usage patterns' },
      { icon: 'analytics-outline' as const, color: colors.secondary, title: 'Insights & Analytics', desc: 'Understand your consumption patterns' },
      { icon: 'people-outline' as const, color: colors.accent, title: 'Household Sharing', desc: 'Share your pantry with family members via cloud sync' },
    ];

    return (
      <View style={styles.welcomeContainer}>
        <ScrollView contentContainerStyle={styles.welcomeScrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.welcomeContent}>
            <View style={styles.iconCircle}>
              <Ionicons name="leaf" size={48} color={colors.primary} />
            </View>
            <Text style={styles.welcomeTitle}>PantryPal</Text>
            <Text style={styles.welcomeSubtitle}>
              {language === 'hi' ? 'ज़रूरी चीज़ों की कमी न होने दें' : 'Never run out of essentials again'}
            </Text>

            <View style={styles.featureList}>
              {features.map((f, idx) => (
                <View key={idx} style={styles.featureItem}>
                  <Ionicons name={f.icon} size={24} color={f.color} />
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureDescription}>{f.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.getStartedButton} onPress={() => setStep(1)}>
          <Text style={styles.getStartedText}>
            {language === 'hi' ? 'शुरू करें' : 'Get Started'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={colors.surface} />
        </TouchableOpacity>
      </View>
    );
  }

  // Step 1: Template Selection
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {language === 'hi' ? 'सामान्य आइटम जोड़ें' : 'Add Common Items'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {language === 'hi' ? 'अपनी पैंट्री में जोड़ने के लिए आइटम चुनें' : 'Select items to add to your pantry'}
        </Text>
      </View>

      {/* Select All / Clear All */}
      <View style={styles.bulkActions}>
        <TouchableOpacity style={styles.bulkButton} onPress={selectAll}>
          <Ionicons name="checkbox-outline" size={18} color={colors.primary} />
          <Text style={styles.bulkButtonText}>
            {language === 'hi' ? 'सभी चुनें' : 'Select All'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bulkButton} onPress={clearAll}>
          <Ionicons name="close-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.bulkButtonText, { color: colors.textSecondary }]}>
            {language === 'hi' ? 'सभी हटाएं' : 'Clear All'}
          </Text>
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
  },
  welcomeScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  welcomeContent: {
    width: '100%',
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
