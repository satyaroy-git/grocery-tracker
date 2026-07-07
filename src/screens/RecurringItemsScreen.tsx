import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  Pressable,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { DEFAULT_CATEGORIES, UNITS_OF_MEASUREMENT } from '../constants/categories';
import {
  getRecurringItems,
  addRecurringItem,
  updateRecurringItem,
  deleteRecurringItem,
  RecurringItem,
  RecurringFrequency,
} from '../database';
import { safeCategoryGuess, guessUnitFromName } from '../utils/itemClassifier';
import { useTranslation } from '../i18n';

const FREQUENCY_OPTIONS: { label: string; value: RecurringFrequency }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Every 2 Weeks', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
];

export default function RecurringItemsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(colors);
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [unit, setUnit] = useState(UNITS_OF_MEASUREMENT[0].value);
  const [quantity, setQuantity] = useState('1');
  const [frequency, setFrequency] = useState<RecurringFrequency>('weekly');

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  const loadItems = async () => {
    try {
      const data = await getRecurringItems();
      setItems(data);
    } catch (error) {
      console.error('Failed to load recurring items:', error);
    }
  };

  const handleNameChange = (text: string) => {
    setName(text);
    if (text.trim()) {
      const guessedCat = safeCategoryGuess(text);
      if (guessedCat !== 'Other') setCategory(guessedCat);
      const guessedUnit = guessUnitFromName(text, parseFloat(quantity) || 1);
      setUnit(guessedUnit);
    }
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an item name.');
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity.');
      return;
    }

    try {
      await addRecurringItem({
        name: name.trim(),
        category,
        unit,
        quantity: parseFloat(quantity),
        frequency,
      });
      setShowAddModal(false);
      resetForm();
      await loadItems();
    } catch (error) {
      Alert.alert('Error', 'Failed to add recurring item.');
    }
  };

  const resetForm = () => {
    setName('');
    setCategory(DEFAULT_CATEGORIES[0]);
    setUnit(UNITS_OF_MEASUREMENT[0].value);
    setQuantity('1');
    setFrequency('weekly');
  };

  const handleToggleEnabled = async (item: RecurringItem) => {
    try {
      await updateRecurringItem(item.id, { enabled: !item.enabled });
      await loadItems();
    } catch (error) {
      Alert.alert('Error', 'Failed to update item.');
    }
  };

  const handleDelete = (item: RecurringItem) => {
    Alert.alert(
      'Delete Recurring Item',
      `Remove "${item.name}" from recurring items? It won't be auto-added to your shopping list anymore.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteRecurringItem(item.id);
            await loadItems();
          },
        },
      ]
    );
  };

  const getFrequencyLabel = (freq: RecurringFrequency): string => {
    return FREQUENCY_OPTIONS.find((f) => f.value === freq)?.label || freq;
  };

  const getUnitLabel = (unitValue: string): string => {
    return UNITS_OF_MEASUREMENT.find((u) => u.value === unitValue)?.label || unitValue;
  };

  const renderItem = ({ item }: { item: RecurringItem }) => (
    <View style={[styles.itemCard, !item.enabled && styles.itemCardDisabled]}>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, !item.enabled && styles.itemNameDisabled]}>
          {item.name}
        </Text>
        <Text style={styles.itemDetail}>
          {item.quantity} {getUnitLabel(item.unit)} - {item.category}
        </Text>
        <Text style={styles.itemFrequency}>
          <Ionicons name="repeat-outline" size={14} color={colors.primary} />{' '}
          {getFrequencyLabel(item.frequency as RecurringFrequency)} - Next: {item.nextDueDate}
        </Text>
      </View>
      <View style={styles.itemActions}>
        <Switch
          value={item.enabled}
          onValueChange={() => handleToggleEnabled(item)}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={item.enabled ? colors.primary : colors.textLight}
        />
        <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="repeat-outline" size={64} color={colors.textLight} />
          <Text style={styles.emptyTitle}>{t.recurringEmpty}</Text>
          <Text style={styles.emptySubtitle}>
            {t.recurringEmptySubtitle}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={28} color={colors.surface} />
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowAddModal(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.addRecurring}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.field}>
                <Text style={styles.label}>{t.itemName}</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={handleNameChange}
                  placeholder="e.g. Milk, Eggs, Bread"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.fieldRow}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>{t.quantityNeeded}</Text>
                  <TextInput
                    style={styles.input}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>{t.unit}</Text>
                  <Text style={styles.inputDisplay}>{getUnitLabel(unit)}</Text>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t.category}</Text>
                <Text style={styles.inputDisplay}>{category}</Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t.frequency}</Text>
                <View style={styles.frequencyRow}>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.frequencyChip,
                        frequency === opt.value && styles.frequencyChipActive,
                      ]}
                      onPress={() => setFrequency(opt.value)}
                    >
                      <Text
                        style={[
                          styles.frequencyChipText,
                          frequency === opt.value && styles.frequencyChipTextActive,
                        ]}
                      >
                        {t[opt.value as keyof typeof t] || opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
                <Ionicons name="repeat-outline" size={20} color={colors.surface} />
                <Text style={styles.addButtonText}>{t.addRecurring}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { padding: SPACING.md, paddingBottom: 100 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
    emptyTitle: { fontSize: FONT_SIZES.xl, fontWeight: '600', color: colors.text, marginTop: SPACING.md },
    emptySubtitle: { fontSize: FONT_SIZES.md, color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.xs },
    itemCard: {
      backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
      flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, ...SHADOWS.sm,
    },
    itemCardDisabled: { opacity: 0.5 },
    itemInfo: { flex: 1 },
    itemName: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: colors.text },
    itemNameDisabled: { textDecorationLine: 'line-through', color: colors.textSecondary },
    itemDetail: { fontSize: FONT_SIZES.sm, color: colors.textSecondary, marginTop: 2 },
    itemFrequency: { fontSize: FONT_SIZES.sm, color: colors.primary, marginTop: 4, fontWeight: '500' },
    itemActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    fab: {
      position: 'absolute', right: SPACING.lg, bottom: SPACING.lg,
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', ...SHADOWS.lg,
    },
    modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: colors.surface, borderTopLeftRadius: BORDER_RADIUS.xl,
      borderTopRightRadius: BORDER_RADIUS.xl, maxHeight: '80%', ...SHADOWS.lg,
    },
    modalHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: colors.text },
    modalBody: { padding: SPACING.md },
    field: { marginBottom: SPACING.md },
    fieldRow: { flexDirection: 'row', gap: SPACING.md },
    label: { fontSize: FONT_SIZES.md, fontWeight: '600', color: colors.text, marginBottom: SPACING.xs },
    input: {
      backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
      borderRadius: BORDER_RADIUS.md, padding: SPACING.md, fontSize: FONT_SIZES.lg, color: colors.text,
    },
    inputDisplay: {
      backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
      borderRadius: BORDER_RADIUS.md, padding: SPACING.md, fontSize: FONT_SIZES.lg, color: colors.text,
    },
    frequencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    frequencyChip: {
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: colors.border,
    },
    frequencyChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    frequencyChipText: { fontSize: FONT_SIZES.sm, color: colors.textSecondary, fontWeight: '500' },
    frequencyChipTextActive: { color: colors.surface, fontWeight: '700' },
    addButton: {
      backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
      marginTop: SPACING.md, ...SHADOWS.md,
    },
    addButtonText: { color: colors.surface, fontSize: FONT_SIZES.lg, fontWeight: '700' },
  });
