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
import { getItemById, restockItem, logConsumption, updateItemPrice } from '../database';
import { GroceryItemWithStatus } from '../database';
import { InventoryStackParamList } from '../navigation/types';

type RestockRouteProp = RouteProp<InventoryStackParamList, 'Restock'>;

export default function RestockScreen() {
  const navigation = useNavigation();
  const route = useRoute<RestockRouteProp>();
  const { itemId } = route.params;

  const [item, setItem] = useState<GroceryItemWithStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'add' | 'set'>('add');
  const [quantity, setQuantity] = useState('');
  // Optional - the amount paid for this restock. Recorded on the
  // consumption_logs entry (not just items.price) so it's correctly
  // included in expenditure/Insights totals, no matter how many times an
  // item gets restocked.
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadItem();
  }, []);

  const loadItem = async () => {
    try {
      const itemData = await getItemById(itemId);
      setItem(itemData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load item.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const getFinalAmount = (): number => {
    if (!item || !quantity) return item?.currentQuantity || 0;
    const qty = parseFloat(quantity);
    if (isNaN(qty)) return item.currentQuantity;
    if (mode === 'add') return item.currentQuantity + qty;
    return qty;
  };

  const handleRestock = async () => {
    if (!item) return;
    if (!quantity || parseFloat(quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity.');
      return;
    }
    // Price is optional, but if the user typed something, it must be valid
    if (price.trim() && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
      Alert.alert('Error', 'Please enter a valid price, or leave it blank.');
      return;
    }

    const finalAmount = getFinalAmount();
    if (mode === 'set' && finalAmount < item.currentQuantity) {
      Alert.alert(
        'Confirm',
        'New total is less than current stock. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: performRestock },
        ]
      );
      return;
    }

    await performRestock();
  };

  const performRestock = async () => {
    setSubmitting(true);
    try {
      const finalAmount = getFinalAmount();
      const addedAmount = finalAmount - item!.currentQuantity;
      const enteredPrice = price.trim() ? parseFloat(price) : null;

      // restockItem() ADDS its argument to the current quantity, so we must pass
      // the delta (addedAmount), not the final target amount, or stock gets
      // corrupted (e.g. "set total to 10" would incorrectly add 10 on top of
      // whatever was already there).
      if (addedAmount !== 0) {
        await restockItem(item!.id, addedAmount);
      }
      if (addedAmount > 0) {
        // Pass the price through so it's recorded on the log entry itself -
        // this is what expenditure totals are actually computed from, so a
        // priced restock is correctly counted every single time, not just
        // when the item was first created.
        await logConsumption(item!.id, addedAmount, 'restock', undefined, enteredPrice);
      }
      // Also update items.price as a "most recently paid" snapshot, purely
      // for quick display on ItemDetailScreen's Purchase Details card.
      if (enteredPrice !== null && enteredPrice > 0) {
        await updateItemPrice(item!.id, enteredPrice);
      }

      Alert.alert(
        'Success',
        `Restocked ${item!.name} to ${finalAmount} ${item!.unit}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to restock item.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !item) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const finalAmount = getFinalAmount();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Current Stock */}
        <View style={styles.stockCard}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.stockRow}>
            <Ionicons name="cube-outline" size={24} color={COLORS.primary} />
            <Text style={styles.stockValue}>
              {item.currentQuantity} {item.unit}
            </Text>
          </View>
          <Text style={styles.stockLabel}>Current Stock</Text>
        </View>

        {/* Mode Toggle */}
        <View style={styles.field}>
          <Text style={styles.label}>Restock Method</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, mode === 'add' && styles.toggleButtonActive]}
              onPress={() => setMode('add')}
            >
              <Ionicons
                name="add-outline"
                size={18}
                color={mode === 'add' ? COLORS.surface : COLORS.textSecondary}
              />
              <Text style={[styles.toggleText, mode === 'add' && styles.toggleTextActive]}>
                Add to Stock
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, mode === 'set' && styles.toggleButtonActive]}
              onPress={() => setMode('set')}
            >
              <Ionicons
                name="swap-horizontal-outline"
                size={18}
                color={mode === 'set' ? COLORS.surface : COLORS.textSecondary}
              />
              <Text style={[styles.toggleText, mode === 'set' && styles.toggleTextActive]}>
                Set New Total
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quantity Input */}
        <View style={styles.field}>
          <Text style={styles.label}>
            {mode === 'add' ? 'Quantity to Add' : 'New Total Quantity'}
          </Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            placeholder={mode === 'add' ? 'Amount to add' : 'New total amount'}
            placeholderTextColor={COLORS.textLight}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Price (optional) - amount paid for this restock */}
        <View style={styles.field}>
          <Text style={styles.label}>Price Paid (optional)</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="e.g. 199"
            placeholderTextColor={COLORS.textLight}
            keyboardType="decimal-pad"
          />
          <Text style={styles.priceHint}>
            This will be added to your expenditure insights.
          </Text>
        </View>

        {/* Preview */}
        {quantity && parseFloat(quantity) > 0 && (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Preview</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Current:</Text>
              <Text style={styles.previewValue}>
                {item.currentQuantity} {item.unit}
              </Text>
            </View>
            {mode === 'add' && (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Adding:</Text>
                <Text style={[styles.previewValue, { color: COLORS.success }]}>
                  +{parseFloat(quantity)} {item.unit}
                </Text>
              </View>
            )}
            <View style={[styles.previewRow, styles.previewTotal]}>
              <Text style={styles.previewLabel}>Final Amount:</Text>
              <Text style={[styles.previewValue, styles.previewFinal]}>
                {finalAmount} {item.unit}
              </Text>
            </View>
            {price.trim() && !isNaN(parseFloat(price)) && (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Price Paid:</Text>
                <Text style={[styles.previewValue, { color: COLORS.success }]}>
                  ₹{parseFloat(price)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmButton, submitting && styles.confirmButtonDisabled]}
          onPress={handleRestock}
          disabled={submitting}
        >
          <Ionicons name="checkmark-circle-outline" size={22} color={COLORS.surface} />
          <Text style={styles.confirmButtonText}>
            {submitting ? 'Restocking...' : 'Confirm Restock'}
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
  stockCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  itemName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  stockValue: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '700',
    color: COLORS.primary,
  },
  stockLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
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
  priceHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
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
  previewFinal: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.primary,
    fontWeight: '700',
  },
  confirmButton: {
    backgroundColor: COLORS.success,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    ...SHADOWS.md,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
});
