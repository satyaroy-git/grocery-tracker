import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import {
  DEFAULT_CATEGORIES,
  UNITS_OF_MEASUREMENT,
  CONSUMPTION_FREQUENCIES,
} from '../constants/categories';
import { createItem } from '../database';
import { ConsumptionMode, ConsumptionFrequency } from '../database';
import DateField from '../components/DateField';
import { safeCategoryGuess, guessUnitFromName } from '../utils/itemClassifier';

export default function AddItemScreen() {
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  // Tracks whether the user has manually picked a category/unit themselves -
  // once true, we stop auto-suggesting based on the name so we never override
  // an intentional choice.
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [unitTouched, setUnitTouched] = useState(false);
  const [unit, setUnit] = useState(UNITS_OF_MEASUREMENT[0].value);
  const [customUnit, setCustomUnit] = useState('');
  const [showCustomUnit, setShowCustomUnit] = useState(false);
  const [currentQuantity, setCurrentQuantity] = useState('');
  const [threshold, setThreshold] = useState('');
  const [consumptionMode, setConsumptionMode] = useState<ConsumptionMode>('manual');
  const [autoRate, setAutoRate] = useState('');
  const [autoFrequency, setAutoFrequency] = useState<ConsumptionFrequency>('daily');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  // Both optional - price and expiry date are never required to save an item
  const [price, setPrice] = useState('');
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an item name.');
      return;
    }
    if (showCustomUnit && !customUnit.trim()) {
      Alert.alert('Error', 'Please enter a custom unit, or pick one from the list.');
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
      const finalCategory = showCustomCategory ? customCategory.trim() : category;
      const finalUnit = showCustomUnit ? customUnit.trim() : unit;
      await createItem({
        name: name.trim(),
        category: finalCategory,
        unit: finalUnit,
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
    UNITS_OF_MEASUREMENT.find((u) => u.value === unit)?.label || unit;

  // Auto-populate category and unit as soon as the user types a recognizable
  // item name - this is exactly the behavior that was working in invoice/
  // barcode scanning but missing from manual entry. Only fires while the
  // user hasn't manually picked a category/unit themselves, so it never
  // clobbers an explicit choice.
  const handleNameChange = (text: string) => {
    setName(text);
    if (!text.trim()) return;

    if (!categoryTouched && !showCustomCategory) {
      const guessedCategory = safeCategoryGuess(text);
      if (guessedCategory !== 'Other') {
        setCategory(guessedCategory);
      }
    }
    if (!unitTouched && !showCustomUnit) {
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
            placeholderTextColor={COLORS.textLight}
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
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            <Text style={styles.pickerButtonText}>
              {showCustomCategory ? 'Custom' : category}
            </Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          {showCategoryPicker && (
            <View style={styles.pickerOptions}>
              {DEFAULT_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.pickerOption,
                    category === cat && !showCustomCategory && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    setCategory(cat);
                    setShowCustomCategory(false);
                    setShowCategoryPicker(false);
                    setCategoryTouched(true);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      category === cat && !showCustomCategory && styles.pickerOptionTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.pickerOption, showCustomCategory && styles.pickerOptionSelected]}
                onPress={() => {
                  setShowCustomCategory(true);
                  setShowCategoryPicker(false);
                  setCategoryTouched(true);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    showCustomCategory && styles.pickerOptionTextSelected,
                  ]}
                >
                  + Custom Category
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {showCustomCategory && (
            <TextInput
              style={[styles.input, { marginTop: SPACING.sm }]}
              value={customCategory}
              onChangeText={setCustomCategory}
              placeholder="Enter custom category"
              placeholderTextColor={COLORS.textLight}
            />
          )}
        </View>

        {/* Unit */}
        <View style={styles.field}>
          <Text style={styles.label}>Unit of Measurement</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowUnitPicker(!showUnitPicker)}
          >
            <Text style={styles.pickerButtonText}>
              {showCustomUnit ? 'Custom' : selectedUnitLabel}
            </Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          {showUnitPicker && (
            <ScrollView style={styles.pickerOptions} nestedScrollEnabled>
              {UNITS_OF_MEASUREMENT.map((u) => (
                <TouchableOpacity
                  key={u.value}
                  style={[
                    styles.pickerOption,
                    unit === u.value && !showCustomUnit && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    setUnit(u.value);
                    setShowCustomUnit(false);
                    setShowUnitPicker(false);
                    setUnitTouched(true);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      unit === u.value && !showCustomUnit && styles.pickerOptionTextSelected,
                    ]}
                  >
                    {u.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.pickerOption, showCustomUnit && styles.pickerOptionSelected]}
                onPress={() => {
                  setShowCustomUnit(true);
                  setShowUnitPicker(false);
                  setUnitTouched(true);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    showCustomUnit && styles.pickerOptionTextSelected,
                  ]}
                >
                  + Custom Unit
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
          {showCustomUnit && (
            <TextInput
              style={[styles.input, { marginTop: SPACING.sm }]}
              value={customUnit}
              onChangeText={setCustomUnit}
              placeholder="Enter custom unit (e.g. crate, drum)"
              placeholderTextColor={COLORS.textLight}
            />
          )}
        </View>

        {/* Quantity */}
        <View style={styles.field}>
          <Text style={styles.label}>Current Quantity</Text>
          <TextInput
            style={styles.input}
            value={currentQuantity}
            onChangeText={setCurrentQuantity}
            placeholder="0"
            placeholderTextColor={COLORS.textLight}
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
            placeholderTextColor={COLORS.textLight}
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
            placeholderTextColor={COLORS.textLight}
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
                color={consumptionMode === 'manual' ? COLORS.surface : COLORS.textSecondary}
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
                color={consumptionMode === 'auto' ? COLORS.surface : COLORS.textSecondary}
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
                placeholderTextColor={COLORS.textLight}
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
          <Ionicons name="checkmark" size={22} color={COLORS.surface} />
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Item'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  autoFillHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
  },
  pickerButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
  },
  pickerOptions: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.xs,
    maxHeight: 200,
  },
  pickerOption: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerOptionSelected: {
    backgroundColor: COLORS.primaryLight + '20',
  },
  pickerOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  pickerOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
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
    backgroundColor: COLORS.surface,
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
  autoSection: {
    backgroundColor: COLORS.surface,
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
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  frequencyChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  frequencyChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  frequencyChipTextActive: {
    color: COLORS.surface,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
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
    color: COLORS.surface,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
});
