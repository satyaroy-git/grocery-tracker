import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { getAllItems, getItemById, deductQuantity, logConsumption } from '../database';
import { GroceryItemWithStatus } from '../database';
import { DashboardStackParamList } from '../navigation/types';

type LogUsageRouteProp = RouteProp<DashboardStackParamList, 'LogUsage'>;

const QUICK_AMOUNTS = [0.25, 0.5, 1, 2];

export default function LogUsageScreen() {
  const navigation = useNavigation();
  const route = useRoute<LogUsageRouteProp>();
  const preselectedItemId = route.params?.itemId;

  const [items, setItems] = useState<GroceryItemWithStatus[]>([]);
  const [selectedItem, setSelectedItem] = useState<GroceryItemWithStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const allItems = await getAllItems();
      setItems(allItems);
      if (preselectedItemId) {
        const item = allItems.find((i) => i.id === preselectedItemId);
        if (item) {
          setSelectedItem(item);
          setSearchQuery(item.name);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load items.');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const remainingStock = selectedItem
    ? Math.max(0, selectedItem.currentQuantity - (parseFloat(amount) || 0))
    : null;

  const handleLogUsage = async () => {
    if (!selectedItem) {
      Alert.alert('Error', 'Please select an item.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }
    if (parseFloat(amount) > selectedItem.currentQuantity) {
      Alert.alert('Warning', 'Amount exceeds current stock. Continue anyway?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: performLog },
      ]);
      return;
    }
    await performLog();
  };

  const performLog = async () => {
    setSubmitting(true);
    try {
      const qty = parseFloat(amount);
      await deductQuantity(selectedItem!.id, qty);
      await logConsumption(selectedItem!.id, qty, 'manual', note || undefined);
      Alert.alert('Success', `Logged ${qty} ${selectedItem!.unit} of ${selectedItem!.name}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to log usage.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Item Picker */}
        <View style={styles.field}>
          <Text style={styles.label}>Select Item</Text>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setShowDropdown(true);
                if (!text) setSelectedItem(null);
              }}
              placeholder="Search items..."
              placeholderTextColor={COLORS.textLight}
              onFocus={() => setShowDropdown(true)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setSelectedItem(null);
                }}
              >
                <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          {showDropdown && !selectedItem && (
            <View style={styles.dropdown}>
              {filteredItems.length === 0 ? (
                <Text style={styles.dropdownEmpty}>No items found</Text>
              ) : (
                filteredItems.slice(0, 10).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedItem(item);
                      setSearchQuery(item.name);
                      setShowDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemName}>{item.name}</Text>
                    <Text style={styles.dropdownItemDetail}>
                      {parseFloat(item.currentQuantity.toFixed(2))} {item.unit}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        {/* Selected Item Info */}
        {selectedItem && (
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedName}>{selectedItem.name}</Text>
            <Text style={styles.selectedStock}>
              Current Stock: {parseFloat(selectedItem.currentQuantity.toFixed(2))} {selectedItem.unit}
            </Text>
          </View>
        )}

        {/* Amount */}
        <View style={styles.field}>
          <Text style={styles.label}>Amount Used</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            placeholderTextColor={COLORS.textLight}
            keyboardType="decimal-pad"
          />
          <View style={styles.quickAmounts}>
            {QUICK_AMOUNTS.map((qa) => (
              <TouchableOpacity
                key={qa}
                style={[styles.quickAmountChip, amount === qa.toString() && styles.quickAmountChipActive]}
                onPress={() => setAmount(qa.toString())}
              >
                <Text
                  style={[
                    styles.quickAmountText,
                    amount === qa.toString() && styles.quickAmountTextActive,
                  ]}
                >
                  {qa}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Note */}
        <View style={styles.field}>
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={[styles.input, styles.noteInput]}
            value={note}
            onChangeText={setNote}
            placeholder="Add a note..."
            placeholderTextColor={COLORS.textLight}
            multiline
          />
        </View>

        {/* Preview */}
        {selectedItem && amount && parseFloat(amount) > 0 && (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Preview</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Current Stock:</Text>
              <Text style={styles.previewValue}>
                {parseFloat(selectedItem.currentQuantity.toFixed(2))} {selectedItem.unit}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Usage:</Text>
              <Text style={[styles.previewValue, { color: COLORS.danger }]}>
                -{parseFloat(amount)} {selectedItem.unit}
              </Text>
            </View>
            <View style={[styles.previewRow, styles.previewTotal]}>
              <Text style={styles.previewLabel}>Remaining:</Text>
              <Text
                style={[
                  styles.previewValue,
                  { color: remainingStock! <= selectedItem.threshold ? COLORS.danger : COLORS.success },
                ]}
              >
                {remainingStock} {selectedItem.unit}
              </Text>
            </View>
          </View>
        )}

        {/* Log Button */}
        <TouchableOpacity
          style={[styles.logButton, submitting && styles.logButtonDisabled]}
          onPress={handleLogUsage}
          disabled={submitting}
        >
          <Ionicons name="remove-circle-outline" size={22} color={COLORS.surface} />
          <Text style={styles.logButtonText}>
            {submitting ? 'Logging...' : 'Log Usage'}
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
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  searchContainer: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
  },
  dropdown: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.xs,
    maxHeight: 200,
    ...SHADOWS.md,
  },
  dropdownItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownItemName: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  dropdownItemDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  dropdownEmpty: {
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  selectedInfo: {
    backgroundColor: COLORS.successBg,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  selectedName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.primary,
  },
  selectedStock: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  quickAmountChip: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  quickAmountChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickAmountText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  quickAmountTextActive: {
    color: COLORS.surface,
  },
  previewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  previewTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  previewTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
  },
  previewLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  previewValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  logButton: {
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
  logButtonDisabled: {
    opacity: 0.6,
  },
  logButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
});
