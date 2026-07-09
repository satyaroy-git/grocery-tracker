import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';
import { generateWeeklyMealPlan, WeeklyMealPlan, DayPlan, MealItem } from '../services/mealPlanner';
import { addToShoppingList, saveMealPlan, getLatestMealPlan } from '../database';

const MEAL_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  breakfast: { icon: 'sunny-outline', color: '#FF9800' },
  lunch: { icon: 'restaurant-outline', color: '#4CAF50' },
  dinner: { icon: 'moon-outline', color: '#673AB7' },
  snack: { icon: 'cafe-outline', color: '#795548' },
};

const MEAL_LABELS_HI: Record<string, string> = {
  breakfast: 'नाश्ता',
  lunch: 'दोपहर का खाना',
  dinner: 'रात का खाना',
  snack: 'स्नैक्स',
};

const DIET_OPTIONS = [
  { label: 'Any', labelHi: 'कोई भी', value: '' },
  { label: 'Vegetarian', labelHi: 'शाकाहारी', value: 'vegetarian' },
  { label: 'Non-Veg', labelHi: 'नॉन-वेज', value: 'non-vegetarian' },
  { label: 'Vegan', labelHi: 'वीगन', value: 'vegan' },
  { label: 'Low Carb', labelHi: 'लो कार्ब', value: 'low carb' },
];

export default function WeeklyMealPlanScreen() {
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const styles = createStyles(colors);

  const [mealPlan, setMealPlan] = useState<WeeklyMealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [dietPreference, setDietPreference] = useState('');
  const [addingToList, setAddingToList] = useState(false);

  // Auto-load last saved plan on screen open
  useEffect(() => {
    (async () => {
      try {
        const saved = await getLatestMealPlan();
        if (saved) {
          const parsed = JSON.parse(saved.planJson) as WeeklyMealPlan;
          setMealPlan(parsed);
          setExpandedDay(0);
        }
      } catch (error) {
        console.error('Failed to load saved meal plan:', error);
      } finally {
        setLoadingSaved(false);
      }
    })();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const plan = await generateWeeklyMealPlan(dietPreference || undefined);
      setMealPlan(plan);
      setExpandedDay(0); // Auto-expand first day
      // Auto-save the plan so user can come back to it later
      try {
        await saveMealPlan(JSON.stringify(plan));
      } catch (saveErr) {
        console.error('Failed to save meal plan:', saveErr);
        // Don't fail the whole flow just because save failed
      }
    } catch (err: any) {
      Alert.alert(language === 'hi' ? 'त्रुटि' : 'Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMissingToShoppingList = async () => {
    if (!mealPlan || mealPlan.shoppingList.length === 0) return;

    setAddingToList(true);
    try {
      let added = 0;
      for (const item of mealPlan.shoppingList) {
        await addToShoppingList(item.name, 'Other', 'pcs', 1);
        added++;
      }
      Alert.alert(
        language === 'hi' ? 'सफल' : 'Success',
        language === 'hi'
          ? `${added} आइटम खरीदारी सूची में जोड़े गए`
          : `Added ${added} items to your shopping list`
      );
    } catch (err: any) {
      Alert.alert(language === 'hi' ? 'त्रुटि' : 'Error', err.message);
    } finally {
      setAddingToList(false);
    }
  };

  const getMealLabel = (mealType: string): string => {
    if (language === 'hi') return MEAL_LABELS_HI[mealType] || mealType;
    return mealType.charAt(0).toUpperCase() + mealType.slice(1);
  };

  const toggleDay = (idx: number) => {
    setExpandedDay(expandedDay === idx ? null : idx);
    setExpandedMeal(null);
  };

  const toggleMeal = (key: string) => {
    setExpandedMeal(expandedMeal === key ? null : key);
  };

  // ─── Initial load ────────────────────────────────────────────────────────
  if (loadingSaved) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ─── No plan yet: show generation UI ───────────────────────────────────
  if (!mealPlan && !loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <Ionicons name="calendar" size={40} color={colors.primary} />
          <Text style={styles.headerTitle}>
            {language === 'hi' ? 'साप्ताहिक मील प्लान' : 'Weekly Meal Plan'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {language === 'hi'
              ? 'AI आपकी पैंट्री के आधार पर 7 दिनों का भोजन प्लान बनाएगा'
              : 'AI will create a 7-day meal plan from your pantry items'}
          </Text>
        </View>

        {/* Diet Preference */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'hi' ? 'आहार प्राथमिकता' : 'Dietary Preference'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dietRow}>
            {DIET_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.dietChip, dietPreference === opt.value && styles.dietChipActive]}
                onPress={() => setDietPreference(opt.value)}
              >
                <Text style={[styles.dietChipText, dietPreference === opt.value && styles.dietChipTextActive]}>
                  {language === 'hi' ? opt.labelHi : opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Generate Button */}
        <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
          <Ionicons name="sparkles" size={22} color={colors.surface} />
          <Text style={styles.generateButtonText}>
            {language === 'hi' ? '7 दिन का प्लान बनाएं' : 'Generate 7-Day Plan'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          {language === 'hi'
            ? 'एक्सपायर होने वाले आइटम पहले उपयोग किए जाएंगे'
            : 'Items expiring soon will be prioritized in earlier days'}
        </Text>
      </ScrollView>
    );
  }

  // ─── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>
          {language === 'hi'
            ? 'AI 7 दिनों का मील प्लान बना रहा है...\nइसमें 15-20 सेकंड लग सकते हैं'
            : 'AI is creating your 7-day meal plan...\nThis may take 15-20 seconds'}
        </Text>
      </View>
    );
  }

  // ─── Show the plan ──────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>
          {language === 'hi' ? 'आपका साप्ताहिक प्लान तैयार है!' : 'Your Weekly Plan is Ready!'}
        </Text>
        <Text style={styles.summarySubtitle}>
          {mealPlan!.days.length} {language === 'hi' ? 'दिन' : 'days'} • {mealPlan!.days.reduce((acc, d) => acc + d.meals.length, 0)} {language === 'hi' ? 'रेसिपी' : 'recipes'}
          {'\n'}
          <Text style={{ fontSize: FONT_SIZES.xs, color: colors.textLight }}>
            {language === 'hi' ? '✓ सेव किया गया — कभी भी वापस आकर देख सकते हैं' : '✓ Saved — come back anytime to view'}
          </Text>
        </Text>
      </View>

      {/* Missing Ingredients / Shopping List */}
      {mealPlan!.shoppingList.length > 0 && (
        <View style={styles.shoppingCard}>
          <View style={styles.shoppingHeader}>
            <Ionicons name="cart-outline" size={20} color={colors.warning} />
            <Text style={styles.shoppingTitle}>
              {language === 'hi'
                ? `${mealPlan!.shoppingList.length} चीज़ें खरीदनी होंगी`
                : `${mealPlan!.shoppingList.length} items needed from store`}
            </Text>
          </View>
          <View style={styles.shoppingItems}>
            {mealPlan!.shoppingList.slice(0, 8).map((item, idx) => (
              <Text key={idx} style={styles.shoppingItem}>
                • {item.name} ({item.quantity})
              </Text>
            ))}
            {mealPlan!.shoppingList.length > 8 && (
              <Text style={styles.shoppingItem}>
                +{mealPlan!.shoppingList.length - 8} more...
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.addToListButton, addingToList && styles.buttonDisabled]}
            onPress={handleAddMissingToShoppingList}
            disabled={addingToList}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.surface} />
            <Text style={styles.addToListButtonText}>
              {addingToList
                ? (language === 'hi' ? 'जोड़ रहे हैं...' : 'Adding...')
                : (language === 'hi' ? 'खरीदारी सूची में जोड़ें' : 'Add All to Shopping List')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Day-by-day plan */}
      {mealPlan!.days.map((day, dayIdx) => {
        const isExpanded = expandedDay === dayIdx;
        return (
          <View key={dayIdx} style={styles.dayCard}>
            <TouchableOpacity style={styles.dayHeader} onPress={() => toggleDay(dayIdx)}>
              <View style={styles.dayHeaderLeft}>
                <View style={[styles.dayBadge, dayIdx === 0 && { backgroundColor: colors.primary }]}>
                  <Text style={[styles.dayBadgeText, dayIdx === 0 && { color: colors.surface }]}>
                    {dayIdx + 1}
                  </Text>
                </View>
                <View>
                  <Text style={styles.dayName}>{day.day}</Text>
                  <Text style={styles.dayDate}>{day.date}</Text>
                </View>
              </View>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.dayMeals}>
                {day.meals.map((meal, mealIdx) => {
                  const mealKey = `${dayIdx}-${mealIdx}`;
                  const isMealExpanded = expandedMeal === mealKey;
                  const mealConfig = MEAL_ICONS[meal.mealType] || MEAL_ICONS.snack;

                  return (
                    <TouchableOpacity
                      key={mealIdx}
                      style={styles.mealRow}
                      onPress={() => toggleMeal(mealKey)}
                    >
                      <View style={styles.mealRowHeader}>
                        <Ionicons name={mealConfig.icon} size={18} color={mealConfig.color} />
                        <Text style={styles.mealType}>{getMealLabel(meal.mealType)}</Text>
                        <Text style={styles.mealName} numberOfLines={isMealExpanded ? undefined : 1}>
                          {meal.name}
                        </Text>
                        <Text style={styles.mealTime}>{meal.prepTime}</Text>
                      </View>

                      {isMealExpanded && (
                        <View style={styles.mealExpanded}>
                          <Text style={styles.mealIngredientsLabel}>
                            {language === 'hi' ? 'सामग्री:' : 'Ingredients:'}
                          </Text>
                          <Text style={styles.mealIngredients}>
                            {meal.ingredients.join(', ')}
                          </Text>
                          <Text style={styles.mealInstructionsLabel}>
                            {language === 'hi' ? 'विधि:' : 'How to make:'}
                          </Text>
                          <Text style={styles.mealInstructions}>
                            {meal.instructions}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}

      {/* Regenerate */}
      <TouchableOpacity style={styles.refreshButton} onPress={handleGenerate}>
        <Ionicons name="refresh-outline" size={20} color={colors.primary} />
        <Text style={styles.refreshButtonText}>
          {language === 'hi' ? 'नया प्लान बनाएं' : 'Generate New Plan'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xxl },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, backgroundColor: colors.background },
    loadingText: { fontSize: FONT_SIZES.md, color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.md, lineHeight: 22 },
    headerCard: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.lg, ...SHADOWS.sm },
    headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: '700', color: colors.text, marginTop: SPACING.sm },
    headerSubtitle: { fontSize: FONT_SIZES.md, color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.xs },
    section: { marginBottom: SPACING.lg },
    sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: colors.text, marginBottom: SPACING.sm },
    dietRow: { flexDirection: 'row', gap: SPACING.sm },
    dietChip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    dietChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    dietChipText: { fontSize: FONT_SIZES.sm, color: colors.textSecondary, fontWeight: '500' },
    dietChipTextActive: { color: colors.surface, fontWeight: '700' },
    generateButton: { backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.md, padding: SPACING.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, ...SHADOWS.md },
    generateButtonText: { color: colors.surface, fontSize: FONT_SIZES.lg, fontWeight: '700' },
    hint: { fontSize: FONT_SIZES.sm, color: colors.textLight, textAlign: 'center', marginTop: SPACING.md },
    summaryCard: { backgroundColor: colors.successBg, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.md },
    summaryTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: colors.success },
    summarySubtitle: { fontSize: FONT_SIZES.sm, color: colors.textSecondary, marginTop: SPACING.xs },
    shoppingCard: { backgroundColor: colors.warningBg, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: colors.warning + '30' },
    shoppingHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
    shoppingTitle: { fontSize: FONT_SIZES.md, fontWeight: '600', color: colors.text },
    shoppingItems: { marginBottom: SPACING.sm },
    shoppingItem: { fontSize: FONT_SIZES.sm, color: colors.textSecondary, paddingVertical: 2 },
    addToListButton: { backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs },
    addToListButtonText: { color: colors.surface, fontSize: FONT_SIZES.sm, fontWeight: '600' },
    buttonDisabled: { opacity: 0.6 },
    dayCard: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.sm, ...SHADOWS.sm, overflow: 'hidden' },
    dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md },
    dayHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    dayBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' },
    dayBadgeText: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: colors.textSecondary },
    dayName: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: colors.text },
    dayDate: { fontSize: FONT_SIZES.xs, color: colors.textSecondary },
    dayMeals: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
    mealRow: { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingVertical: SPACING.sm },
    mealRowHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
    mealType: { fontSize: FONT_SIZES.xs, color: colors.textSecondary, fontWeight: '600', width: 55 },
    mealName: { flex: 1, fontSize: FONT_SIZES.md, fontWeight: '500', color: colors.text },
    mealTime: { fontSize: FONT_SIZES.xs, color: colors.textLight },
    mealExpanded: { marginTop: SPACING.sm, paddingLeft: SPACING.lg },
    mealIngredientsLabel: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: colors.primary, marginBottom: 2 },
    mealIngredients: { fontSize: FONT_SIZES.sm, color: colors.textSecondary, marginBottom: SPACING.sm },
    mealInstructionsLabel: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: colors.primary, marginBottom: 2 },
    mealInstructions: { fontSize: FONT_SIZES.sm, color: colors.text, lineHeight: 20 },
    refreshButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, padding: SPACING.md, borderWidth: 1, borderColor: colors.primary, borderRadius: BORDER_RADIUS.md, marginTop: SPACING.md },
    refreshButtonText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: colors.primary },
  });
