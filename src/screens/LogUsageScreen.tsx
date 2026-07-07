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
import { SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { getAllItems, getItemById, logConsumption } from '../database';
import { GroceryItemWithStatus } from '../database';
import { InventoryStackParamList } from '../navigation/types';
import { formatQuantity } from '../utils/numberFormat';
import { useTranslation } from '../i18n';

// FIX: LogUsage is registered under InventoryStack (see InventoryStack.tsx),
// not DashboardStack - it never actually had a 'LogUsage' key, so this typed
// route.params as `unknown` and made `route.params?.itemId` a type error.
type LogUsageRouteProp = RouteProp<InventoryStackParamList, 'LogUsage'>;

const QUICK_AMOUNTS = [0.25, 0.5, 1, 2];

export default function LogUsageScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(colors);
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
    ? Math.max(0, Math.round((selectedItem.currentQuantity - (parseFloat(amount) || 0) + Number.EPSILON) * 1000) / 1000)
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
      // BUG FIX: logConsumption() already calls deductQuantity() internally
      // for any non-'restock' type (see database/index.ts). Calling
      // deductQuantity() explicitly here AND inside logConsumption() deducted
      // the amount TWICE - e.g. logging 0.2L used against 1L stock produced
      // 1 - 0.2 - 0.2 = 0.6L instead of the correct 1 - 0.2 = 0.8L.
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
        <ActivityIndicator size="large" color={colors.primary} />
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
            <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setShowDropdown(true);
                if (!text) setSelectedItem(null);
              }}
              placeholder="Search items..."
              placeholderTextColor={colors.textLight}
              onFocus={() => setShowDropdown(true)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setSelectedItem(null);
                }}
              >
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
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
                      {formatQuantity(item.currentQuantity)} {item.unit}
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
              Current Stock: {formatQuantity(selectedItem.currentQuantity)} {selectedItem.unit}
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
            placeholderTextColor={colors.textLight}
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
            placeholderTextColor={colors.textLight}
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
                {formatQuantity(selectedItem.currentQuantity)} {selectedItem.unit}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Usage:</Text>
              <Text style={[styles.previewValue, { color: colors.danger }]}>
                -{formatQuantity(parseFloat(amount) || 0)} {selectedItem.unit}
              </Text>
            </View>
            <View style={[styles.previewRow, styles.previewTotal]}>
              <Text style={styles.previewLabel}>Remaining:</Text>
              <Text
                style={[
                  styles.previewValue,
                  { color: remainingStock! <= selectedItem.threshold ? colors.danger : colors.success },
                ]}
              >
                {formatQuantity(remainingStock!)} {selectedItem.unit}
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
          <Ionicons name="remove-circle-outline" size={22} color={colors.surface} />
          <Text style={styles.logButtonText}>
            {submitting ? 'Logging...' : t.logUsage}
          </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.lg,
    color: colors.text,
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  searchContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    color: colors.text,
  },
  dropdown: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.xs,
    maxHeight: 200,
    ...SHADOWS.md,
  },
  dropdownItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownItemName: {
    fontSize: FONT_SIZES.md,
    color: colors.text,
    fontWeight: '500',
  },
  dropdownItemDetail: {
    fontSize: FONT_SIZES.sm,
    color: colors.textSecondary,
  },
  dropdownEmpty: {
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  selectedInfo: {
    backgroundColor: colors.successBg,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  selectedName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: colors.primary,
  },
  selectedStock: {
    fontSize: FONT_SIZES.md,
    color: colors.textSecondary,
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
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  quickAmountChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickAmountText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  quickAmountTextActive: {
    color: colors.surface,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  previewTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: SPACING.sm,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  previewTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
  },
  previewLabel: {
    fontSize: FONT_SIZES.md,
    color: colors.textSecondary,
  },
  previewValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: colors.text,
  },
  logButton: {
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
  logButtonDisabled: {
    opacity: 0.6,
  },
  logButtonText: {
    color: colors.surface,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
});
