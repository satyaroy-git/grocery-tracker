import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';
import { getSettings } from '../database';
import { generateRecipeSuggestions, DailyMealPlan, RecipeSuggestion } from '../services/recipes';
import { hasApiKey } from '../services/config';

const MEAL_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  breakfast: { icon: 'sunny-outline', color: '#FF9800' },
  lunch: { icon: 'restaurant-outline', color: '#4CAF50' },
  dinner: { icon: 'moon-outline', color: '#673AB7' },
  snack: { icon: 'cafe-outline', color: '#795548' },
};

const MEAL_LABELS: Record<string, { en: string; hi: string }> = {
  breakfast: { en: 'Breakfast', hi: 'नाश्ता' },
  lunch: { en: 'Lunch', hi: 'दोपहर का खाना' },
  dinner: { en: 'Dinner', hi: 'रात का खाना' },
  snack: { en: 'Snack', hi: 'स्नैक्स' },
};

export default function RecipeSuggestionsScreen() {
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const styles = createStyles(colors);
  const [mealPlan, setMealPlan] = useState<DailyMealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [hasKey, setHasKey] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      checkStatus();
    }, [])
  );

  const checkStatus = async () => {
    const settings = await getSettings();
    setEnabled(settings.recipeSuggestionsEnabled);
    const keyExists = await hasApiKey();
    setHasKey(keyExists);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const plan = await generateRecipeSuggestions();
      setMealPlan(plan);
    } catch (err: any) {
      setError(err.message);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMealLabel = (mealType: string): string => {
    return MEAL_LABELS[mealType]?.[language as 'en' | 'hi'] || mealType;
  };

  const toggleExpand = (mealType: string) => {
    setExpandedMeal(expandedMeal === mealType ? null : mealType);
  };

  if (!enabled) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="restaurant-outline" size={64} color={colors.textLight} />
        <Text style={styles.emptyTitle}>Recipe Suggestions Disabled</Text>
        <Text style={styles.emptySubtitle}>
          Enable recipe suggestions in Settings to get daily meal ideas based on your pantry items.
        </Text>
      </View>
    );
  }

  if (!hasKey) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="key-outline" size={64} color={colors.textLight} />
        <Text style={styles.emptyTitle}>API Key Required</Text>
        <Text style={styles.emptySubtitle}>
          Please add your Gemini API key in the Scan Invoice screen first. The same key is used for recipe suggestions.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.headerCard}>
        <Ionicons name="restaurant" size={32} color={colors.primary} />
        <Text style={styles.headerTitle}>
          {language === 'hi' ? 'आज का मेनू' : "Today's Menu"}
        </Text>
        <Text style={styles.headerSubtitle}>
          {language === 'hi'
            ? 'आपकी पैंट्री में उपलब्ध सामग्री के आधार पर'
            : 'AI-suggested recipes based on your pantry items'}
        </Text>
      </View>

      {/* Generate Button */}
      {!mealPlan && !loading && (
        <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
          <Ionicons name="sparkles" size={22} color={colors.surface} />
          <Text style={styles.generateButtonText}>
            {language === 'hi' ? 'रेसिपी सुझाव पाएं' : 'Get Recipe Suggestions'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            {language === 'hi'
              ? 'AI आपकी पैंट्री के आधार पर रेसिपी बना रहा है...'
              : 'AI is creating recipes from your pantry items...'}
          </Text>
        </View>
      )}

      {/* Meal Plan */}
      {mealPlan && (
        <>
          {mealPlan.meals.map((meal) => {
            const mealConfig = MEAL_ICONS[meal.mealType] || MEAL_ICONS.snack;
            const isExpanded = expandedMeal === meal.mealType;

            return (
              <TouchableOpacity
                key={meal.mealType}
                style={styles.mealCard}
                onPress={() => toggleExpand(meal.mealType)}
                activeOpacity={0.7}
              >
                <View style={styles.mealHeader}>
                  <View style={[styles.mealIconCircle, { backgroundColor: mealConfig.color + '20' }]}>
                    <Ionicons name={mealConfig.icon} size={24} color={mealConfig.color} />
                  </View>
                  <View style={styles.mealHeaderText}>
                    <Text style={styles.mealType}>{getMealLabel(meal.mealType)}</Text>
                    <Text style={styles.mealName}>{meal.name}</Text>
                  </View>
                  <View style={styles.mealMeta}>
                    <Text style={styles.mealTime}>{meal.prepTime}</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.textSecondary}
                    />
                  </View>
                </View>

                {isExpanded && (
                  <View style={styles.mealDetails}>
                    {/* Ingredients */}
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>
                        <Ionicons name="list-outline" size={14} color={colors.primary} />
                        {' '}{language === 'hi' ? 'सामग्री' : 'Ingredients'}
                      </Text>
                      {meal.ingredients.map((ing, idx) => (
                        <Text key={idx} style={styles.ingredientItem}>• {ing}</Text>
                      ))}
                    </View>

                    {/* Instructions */}
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>
                        <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                        {' '}{language === 'hi' ? 'विधि' : 'How to make'}
                      </Text>
                      <Text style={styles.instructionsText}>{meal.instructions}</Text>
                    </View>

                    {/* Servings */}
                    <Text style={styles.servingsText}>
                      <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                      {' '}{language === 'hi' ? `${meal.servings} लोगों के लिए` : `Serves ${meal.servings}`}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Refresh Button */}
          <TouchableOpacity style={styles.refreshButton} onPress={handleGenerate}>
            <Ionicons name="refresh-outline" size={20} color={colors.primary} />
            <Text style={styles.refreshButtonText}>
              {language === 'hi' ? 'नई रेसिपी पाएं' : 'Get New Suggestions'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xxl },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
    emptyTitle: { fontSize: FONT_SIZES.xl, fontWeight: '600', color: colors.text, marginTop: SPACING.md, textAlign: 'center' },
    emptySubtitle: { fontSize: FONT_SIZES.md, color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.xs },
    headerCard: {
      backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg,
      alignItems: 'center', marginBottom: SPACING.lg, ...SHADOWS.sm,
    },
    headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: '700', color: colors.text, marginTop: SPACING.sm },
    headerSubtitle: { fontSize: FONT_SIZES.md, color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.xs },
    generateButton: {
      backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.md, padding: SPACING.lg,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, ...SHADOWS.md,
    },
    generateButtonText: { color: colors.surface, fontSize: FONT_SIZES.lg, fontWeight: '700' },
    loadingCard: {
      backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.xl,
      alignItems: 'center', ...SHADOWS.sm,
    },
    loadingText: { fontSize: FONT_SIZES.md, color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.md },
    mealCard: {
      backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
      marginBottom: SPACING.md, ...SHADOWS.sm,
    },
    mealHeader: { flexDirection: 'row', alignItems: 'center' },
    mealIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    mealHeaderText: { flex: 1, marginLeft: SPACING.sm },
    mealType: { fontSize: FONT_SIZES.sm, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
    mealName: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: colors.text, marginTop: 2 },
    mealMeta: { alignItems: 'flex-end' },
    mealTime: { fontSize: FONT_SIZES.sm, color: colors.textSecondary, fontWeight: '500' },
    mealDetails: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: colors.border },
    detailSection: { marginBottom: SPACING.md },
    detailLabel: { fontSize: FONT_SIZES.md, fontWeight: '700', color: colors.text, marginBottom: SPACING.xs },
    ingredientItem: { fontSize: FONT_SIZES.md, color: colors.textSecondary, paddingVertical: 2, paddingLeft: SPACING.sm },
    instructionsText: { fontSize: FONT_SIZES.md, color: colors.text, lineHeight: 22 },
    servingsText: { fontSize: FONT_SIZES.sm, color: colors.textSecondary, fontWeight: '500' },
    refreshButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
      padding: SPACING.md, borderWidth: 1, borderColor: colors.primary, borderRadius: BORDER_RADIUS.md,
      marginTop: SPACING.sm,
    },
    refreshButtonText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: colors.primary },
  });
