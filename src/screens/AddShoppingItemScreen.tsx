import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { DEFAULT_CATEGORIES, UNITS_OF_MEASUREMENT } from '../constants/categories';
import {
  addToShoppingList,
  getCustomCategories,
  addCustomCategory,
  getCustomUnits,
  addCustomUnit,
} from '../database';
import SelectModal from '../components/SelectModal';
import { safeCategoryGuess, guessUnitFromName } from '../utils/itemClassifier';

export default function AddShoppingItemScreen() {
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [unit, setUnit] = useState(UNITS_OF_MEASUREMENT[0].value);
  const [quantityNeeded, setQuantityNeeded] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  // Same persisted custom category/unit pattern as AddItemScreen/EditItemScreen/
  // BarcodeScanScreen, so the picker (and its full scrollable list, plus
  // "+ Add New") is consistent across every screen in the app, not just Pantry.
  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const [extraUnits, setExtraUnits] = useState<{ value: string; label: string }[]>([]);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [unitTouched, setUnitTouched] = useState(false);
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

  // Same auto-populate-as-you-type behavior as AddItemScreen, for consistency.
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
      const guessedUnit = guessUnitFromName(text, quantityNeeded ? parseFloat(quantityNeeded) || 1 : 1);
      setUnit(guessedUnit);
    }
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an item name.');
      return;
    }
    if (!quantityNeeded || parseFloat(quantityNeeded) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity.');
      return;
    }

    setSaving(true);
    try {
      await addToShoppingList(name.trim(), category, unit, parseFloat(quantityNeeded));
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to add item to shopping list.');
    } finally {
      setSaving(false);
    }
  };

  const selectedUnitLabel =
    allUnitOptions.find((u) => u.value === unit)?.label || unit;

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
            placeholder="What do you need to buy?"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={styles.pickerButtonText}>{category}</Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Unit */}
        <View style={styles.field}>
          <Text style={styles.label}>Unit</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowUnitModal(true)}
          >
            <Text style={styles.pickerButtonText}>{selectedUnitLabel}</Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
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
          <Text style={styles.label}>Quantity Needed</Text>
          <TextInput
            style={styles.input}
            value={quantityNeeded}
            onChangeText={setQuantityNeeded}
            placeholder="How much do you need?"
            placeholderTextColor={COLORS.textLight}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Add Button */}
        <TouchableOpacity
          style={[styles.addButton, saving && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={saving}
        >
          <Ionicons name="cart-outline" size={22} color={COLORS.surface} />
          <Text style={styles.addButtonText}>
            {saving ? 'Adding...' : 'Add to Shopping List'}
          </Text>
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
  addButton: {
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
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
});
