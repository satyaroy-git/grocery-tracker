import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import {
  DEFAULT_CATEGORIES,
  UNITS_OF_MEASUREMENT,
  CONSUMPTION_FREQUENCIES,
} from '../constants/categories';
import {
  createItem,
  getCustomCategories,
  addCustomCategory,
  getCustomUnits,
  addCustomUnit,
} from '../database';
import { ConsumptionMode, ConsumptionFrequency } from '../database';
import DateField from '../components/DateField';
import SelectModal from '../components/SelectModal';
import { safeCategoryGuess, guessUnitFromName } from '../utils/itemClassifier';

export default function AddItemScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [name, setName] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  // Custom categories/units the user has previously added - persisted in the
  // DB, so once "Floor Cleaner" is added once, it's a real pickable option
  // forever after, for this item and every future one.
  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const [extraUnits, setExtraUnits] = useState<{ value: string; label: string }[]>([]);
  // Tracks whether the user has manually picked a category/unit themselves -
  // once true, we stop auto-suggesting based on the name so we never override
  // an intentional choice.
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [unitTouched, setUnitTouched] = useState(false);
  const [unit, setUnit] = useState(UNITS_OF_MEASUREMENT[0].value);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [currentQuantity, setCurrentQuantity] = useState('');
  const [threshold, setThreshold] = useState('');
  const [consumptionMode, setConsumptionMode] = useState<ConsumptionMode>('manual');
  const [autoRate, setAutoRate] = useState('');
  const [autoFrequency, setAutoFrequency] = useState<ConsumptionFrequency>('daily');
  // Both optional - price and expiry date are never required to save an item
  const [price, setPrice] = useState('');
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadExtras = useCallback(async () => {
    try {
      const [cats, units] = await Promise.all([getCustomCategories(), getCustomUnits()]);
      setExtraCategories(cats);
      setExtraUnits(units);
    } catch (error) {
      console.error('Failed to load custom categories/units:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExtras();
    }, [loadExtras])
  );

  const allCategoryOptions = [...DEFAULT_CATEGORIES, ...extraCategories].map((c) => ({
    label: c,
    value: c,
  }));
  const allUnitOptions = [...UNITS_OF_MEASUREMENT, ...extraUnits];

  const handleAddCustomCategory = async (value: string) => {
    await addCustomCategory(value);
    setExtraCategories((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setCategory(value);
    setCategoryTouched(true);
  };

  const handleAddCustomUnit = async (value: string) => {
    await addCustomUnit(value);
    setExtraUnits((prev) => (prev.some((u) => u.value === value) ? prev : [...prev, { value, label: value }]));
    setUnit(value);
    setUnitTouched(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an item name.');
      return;
    }
    if (!currentQuantity || parseFloat(currentQuantity) < 0) {
      Alert.alert('Error', 'Please enter a valid quantity.');
      return;
    }
    if (!threshold || parseFloat(threshold) < 0) {
      Alert.alert('Error', 'Please enter a valid threshold.');
      return;
    }
    if (consumptionMode === 'auto' && (!autoRate || parseFloat(autoRate) <= 0)) {
      Alert.alert('Error', 'Please enter a valid consumption rate.');
      return;
    }
    // Price is optional, but if the user typed something, it must be a valid non-negative number
    if (price.trim() && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
      Alert.alert('Error', 'Please enter a valid price, or leave it blank.');
      return;
    }

    setSaving(true);
    try {
      await createItem({
        name: name.trim(),
        category,
        unit,
        currentQuantity: parseFloat(currentQuantity),
        threshold: parseFloat(threshold),
        consumptionMode,
        autoConsumptionRate: consumptionMode === 'auto' ? parseFloat(autoRate) : null,
        autoConsumptionFrequency: consumptionMode === 'auto' ? autoFrequency : null,
        price: price.trim() ? parseFloat(price) : null,
        expiryDate,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedUnitLabel =
    allUnitOptions.find((u) => u.value === unit)?.label || unit;

  // Auto-populate category and unit as soon as the user types a recognizable
  // item name - this is exactly the behavior that was working in invoice/
  // barcode scanning but missing from manual entry. Only fires while the
  // user hasn't manually picked a category/unit themselves, so it never
  // clobbers an explicit choice.
  const handleNameChange = (text: string) => {
    setName(text);
    if (!text.trim()) return;

    if (!categoryTouched) {
      const guessedCategory = safeCategoryGuess(text);
      if (guessedCategory !== 'Other') {
        setCategory(guessedCategory);
      }
    }
    if (!unitTouched) {
      const guessedUnit = guessUnitFromName(text, currentQuantity ? parseFloat(currentQuantity) || 1 : 1);
      setUnit(guessedUnit);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Item Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={handleNameChange}
            placeholder="e.g. Rice, Milk, Eggs"
            placeholderTextColor={colors.textLight}
          />
          <Text style={styles.autoFillHint}>
            Category and unit will be suggested automatically as you type.
          </Text>
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={styles.pickerButtonText}>{category}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Unit */}
        <View style={styles.field}>
          <Text style={styles.label}>Unit of Measurement</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowUnitModal(true)}
          >
            <Text style={styles.pickerButtonText}>{selectedUnitLabel}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <SelectModal
          visible={showCategoryModal}
          title="Select Category"
          options={allCategoryOptions}
          selectedValue={category}
          onSelect={(value) => {
            setCategory(value);
            setCategoryTouched(true);
          }}
          onClose={() => setShowCategoryModal(false)}
          onAddCustom={handleAddCustomCategory}
          addCustomLabel="+ Add New Category"
          addCustomPlaceholder="e.g. Floor Cleaner, Toothpaste"
        />

        <SelectModal
          visible={showUnitModal}
          title="Select Unit"
          options={allUnitOptions}
          selectedValue={unit}
          onSelect={(value) => {
            setUnit(value);
            setUnitTouched(true);
          }}
          onClose={() => setShowUnitModal(false)}
          onAddCustom={handleAddCustomUnit}
          addCustomLabel="+ Add New Unit"
          addCustomPlaceholder="e.g. crate, drum, number"
        />

        {/* Quantity */}
        <View style={styles.field}>
          <Text style={styles.label}>Current Quantity</Text>
          <TextInput
            style={styles.input}
            value={currentQuantity}
            onChangeText={setCurrentQuantity}
            placeholder="0"
            placeholderTextColor={colors.textLight}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Threshold */}
        <View style={styles.field}>
          <Text style={styles.label}>Low Stock Threshold</Text>
          <TextInput
            style={styles.input}
            value={threshold}
            onChangeText={setThreshold}
            placeholder="Alert when below this amount"
            placeholderTextColor={colors.textLight}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Price (optional) */}
        <View style={styles.field}>
          <Text style={styles.label}>Price (optional)</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="e.g. 199"
            placeholderTextColor={colors.textLight}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Expiry Date (optional) */}
        <DateField
          label="Expiry Date (optional)"
          value={expiryDate}
          onChange={setExpiryDate}
          placeholder="No expiry date set"
        />

        {/* Consumption Mode */}
        <View style={styles.field}>
          <Text style={styles.label}>Consumption Mode</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                consumptionMode === 'manual' && styles.toggleButtonActive,
              ]}
              onPress={() => setConsumptionMode('manual')}
            >
              <Ionicons
                name="hand-left-outline"
                size={18}
                color={consumptionMode === 'manual' ? colors.surface : colors.textSecondary}
              />
              <Text
                style={[
                  styles.toggleText,
                  consumptionMode === 'manual' && styles.toggleTextActive,
                ]}
              >
                Manual
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                consumptionMode === 'auto' && styles.toggleButtonActive,
              ]}
              onPress={() => setConsumptionMode('auto')}
            >
              <Ionicons
                name="sync-outline"
                size={18}
                color={consumptionMode === 'auto' ? colors.surface : colors.textSecondary}
              />
              <Text
                style={[
                  styles.toggleText,
                  consumptionMode === 'auto' && styles.toggleTextActive,
                ]}
              >
                Auto
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Auto consumption settings */}
        {consumptionMode === 'auto' && (
          <View style={styles.autoSection}>
            <View style={styles.field}>
              <Text style={styles.label}>Consumption Rate</Text>
              <TextInput
                style={styles.input}
                value={autoRate}
                onChangeText={setAutoRate}
                placeholder="Amount consumed per period"
                placeholderTextColor={colors.textLight}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Frequency</Text>
              <View style={styles.frequencyRow}>
                {CONSUMPTION_FREQUENCIES.map((freq) => (
                  <TouchableOpacity
                    key={freq.value}
                    style={[
                      styles.frequencyChip,
                      autoFrequency === freq.value && styles.frequencyChipActive,
                    ]}
                    onPress={() => setAutoFrequency(freq.value as ConsumptionFrequency)}
                  >
                    <Text
                      style={[
                        styles.frequencyChipText,
                        autoFrequency === freq.value && styles.frequencyChipTextActive,
                      ]}
                    >
                      {freq.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Ionicons name="checkmark" size={22} color={colors.surface} />
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Item'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  field: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: SPACING.xs,
  },
  autoFillHint: {
    fontSize: FONT_SIZES.xs,
    color: colors.textLight,
    marginTop: SPACING.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.lg,
    color: colors.text,
  },
  pickerButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: FONT_SIZES.lg,
    color: colors.text,
  },
  pickerOptions: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.xs,
    maxHeight: 200,
  },
  pickerOption: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerOptionSelected: {
    backgroundColor: colors.primaryLight + '20',
  },
  pickerOptionText: {
    fontSize: FONT_SIZES.md,
    color: colors.text,
  },
  pickerOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
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
    backgroundColor: colors.surface,
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
  autoSection: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  frequencyChip: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  frequencyChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  frequencyChipText: {
    fontSize: FONT_SIZES.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  frequencyChipTextActive: {
    color: colors.surface,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    ...SHADOWS.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  });
