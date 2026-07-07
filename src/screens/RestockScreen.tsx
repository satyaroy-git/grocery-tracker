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
import { getItemById, restockItem, logConsumption, updateItemPrice } from '../database';
import { GroceryItemWithStatus } from '../database';
import { InventoryStackParamList } from '../navigation/types';
import { formatQuantity, formatMoney, roundMoney } from '../utils/numberFormat';

type RestockRouteProp = RouteProp<InventoryStackParamList, 'Restock'>;
type PriceEntryMode = 'total' | 'perUnit';

export default function RestockScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const route = useRoute<RestockRouteProp>();
  const { itemId } = route.params;

  const [item, setItem] = useState<GroceryItemWithStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'add' | 'set'>('add');
  const [quantity, setQuantity] = useState('');
  // Price can be entered either as a flat total for this restock, or as a
  // per-unit rate that gets multiplied by the quantity being added - the
  // final total price is calculated live either way and is always what
  // actually gets recorded (never the per-unit rate itself).
  const [priceEntryMode, setPriceEntryMode] = useState<PriceEntryMode>('total');
  const [price, setPrice] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
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
    if (mode === 'add') return roundQuantityLocal(item.currentQuantity + qty);
    return roundQuantityLocal(qty);
  };

  // Local rounding helper (screen-side preview only - the actual persisted
  // rounding happens in database/index.ts regardless of what's shown here).
  function roundQuantityLocal(value: number): number {
    return Math.round((value + Number.EPSILON) * 1000) / 1000;
  }

  // The quantity actually being ADDED to stock in this restock action -
  // this is the basis for the per-unit price calculation (NOT the final
  // total quantity), since the price paid only applies to what's being
  // newly purchased right now, not stock that was already on hand.
  const getAddedAmount = (): number => {
    if (!item) return 0;
    return getFinalAmount() - item.currentQuantity;
  };

  // The final total price to actually record for this restock, computed
  // live from whichever entry mode the user picked:
  // - 'total': the amount typed IS the total (used as-is)
  // - 'perUnit': total = pricePerUnit x quantity being added
  const getCalculatedTotalPrice = (): number | null => {
    if (priceEntryMode === 'total') {
      if (!price.trim()) return null;
      const parsed = parseFloat(price);
      return isNaN(parsed) ? null : roundMoney(parsed);
    }
    // perUnit mode
    if (!pricePerUnit.trim()) return null;
    const rate = parseFloat(pricePerUnit);
    if (isNaN(rate)) return null;
    const addedAmount = getAddedAmount();
    if (addedAmount <= 0) return null;
    return roundMoney(rate * addedAmount);
  };

  const handleRestock = async () => {
    if (!item) return;
    if (!quantity || parseFloat(quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity.');
      return;
    }
    // Price is optional, but if the user typed something, it must be valid
    if (priceEntryMode === 'total' && price.trim() && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
      Alert.alert('Error', 'Please enter a valid price, or leave it blank.');
      return;
    }
    if (priceEntryMode === 'perUnit' && pricePerUnit.trim() && (isNaN(parseFloat(pricePerUnit)) || parseFloat(pricePerUnit) < 0)) {
      Alert.alert('Error', 'Please enter a valid price per unit, or leave it blank.');
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
      const addedAmount = roundQuantityLocal(finalAmount - item!.currentQuantity);
      const calculatedPrice = getCalculatedTotalPrice();

      // restockItem() ADDS its argument to the current quantity, so we must pass
      // the delta (addedAmount), not the final target amount, or stock gets
      // corrupted (e.g. "set total to 10" would incorrectly add 10 on top of
      // whatever was already there).
      if (addedAmount !== 0) {
        await restockItem(item!.id, addedAmount);
      }
      if (addedAmount > 0) {
        // Pass the calculated total price through so it's recorded on the
        // log entry itself - this is what expenditure totals are actually
        // computed from, so a priced restock is correctly counted every
        // single time, not just when the item was first created. Whether
        // the user typed a flat total or a per-unit rate, what's stored
        // here is always the resolved TOTAL price for this purchase.
        await logConsumption(item!.id, addedAmount, 'restock', undefined, calculatedPrice);
      }
      // Also update items.price as a "most recently paid" snapshot, purely
      // for quick display on ItemDetailScreen's Purchase Details card.
      if (calculatedPrice !== null && calculatedPrice > 0) {
        await updateItemPrice(item!.id, calculatedPrice);
      }

      Alert.alert(
        'Success',
        `Restocked ${item!.name} to ${formatQuantity(finalAmount)} ${item!.unit}`,
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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const finalAmount = getFinalAmount();
  const addedAmount = getAddedAmount();
  const calculatedPrice = getCalculatedTotalPrice();

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
            <Ionicons name="cube-outline" size={24} color={colors.primary} />
            <Text style={styles.stockValue}>
              {formatQuantity(item.currentQuantity)} {item.unit}
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
                color={mode === 'add' ? colors.surface : colors.textSecondary}
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
                color={mode === 'set' ? colors.surface : colors.textSecondary}
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
            placeholderTextColor={colors.textLight}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Price (optional) - amount paid for this restock */}
        <View style={styles.field}>
          <Text style={styles.label}>Price Paid (optional)</Text>

          {/* Total vs Per-Unit entry mode toggle */}
          <View style={styles.priceModeToggle}>
            <TouchableOpacity
              style={[styles.priceModeButton, priceEntryMode === 'total' && styles.priceModeButtonActive]}
              onPress={() => setPriceEntryMode('total')}
            >
              <Text
                style={[
                  styles.priceModeText,
                  priceEntryMode === 'total' && styles.priceModeTextActive,
                ]}
              >
                Total Price
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.priceModeButton, priceEntryMode === 'perUnit' && styles.priceModeButtonActive]}
              onPress={() => setPriceEntryMode('perUnit')}
            >
              <Text
                style={[
                  styles.priceModeText,
                  priceEntryMode === 'perUnit' && styles.priceModeTextActive,
                ]}
              >
                Price per {item.unit}
              </Text>
            </TouchableOpacity>
          </View>

          {priceEntryMode === 'total' ? (
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="e.g. 199"
              placeholderTextColor={colors.textLight}
              keyboardType="decimal-pad"
            />
          ) : (
            <TextInput
              style={styles.input}
              value={pricePerUnit}
              onChangeText={setPricePerUnit}
              placeholder={`e.g. 50 per ${item.unit}`}
              placeholderTextColor={colors.textLight}
              keyboardType="decimal-pad"
            />
          )}

          {priceEntryMode === 'perUnit' && addedAmount > 0 && pricePerUnit.trim() && calculatedPrice !== null && (
            <Text style={styles.priceCalcText}>
              ₹{pricePerUnit} × {formatQuantity(addedAmount)} {item.unit} = ₹{formatMoney(calculatedPrice)}
            </Text>
          )}

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
                {formatQuantity(item.currentQuantity)} {item.unit}
              </Text>
            </View>
            {mode === 'add' && (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Adding:</Text>
                <Text style={[styles.previewValue, { color: colors.success }]}>
                  +{formatQuantity(parseFloat(quantity) || 0)} {item.unit}
                </Text>
              </View>
            )}
            <View style={[styles.previewRow, styles.previewTotal]}>
              <Text style={styles.previewLabel}>Final Amount:</Text>
              <Text style={[styles.previewValue, styles.previewFinal]}>
                {formatQuantity(finalAmount)} {item.unit}
              </Text>
            </View>
            {calculatedPrice !== null && (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Total Price:</Text>
                <Text style={[styles.previewValue, { color: colors.success }]}>
                  ₹{formatMoney(calculatedPrice)}
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
          <Ionicons name="checkmark-circle-outline" size={22} color={colors.surface} />
          <Text style={styles.confirmButtonText}>
            {submitting ? 'Restocking...' : 'Confirm Restock'}
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
  stockCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  itemName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: colors.text,
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
    color: colors.primary,
  },
  stockLabel: {
    fontSize: FONT_SIZES.sm,
    color: colors.textSecondary,
    marginTop: SPACING.xs,
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
  priceHint: {
    fontSize: FONT_SIZES.xs,
    color: colors.textLight,
    marginTop: SPACING.xs,
  },
  priceModeToggle: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  priceModeButton: {
    flex: 1,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  priceModeButtonActive: {
    backgroundColor: colors.primaryLight + '25',
    borderColor: colors.primary,
  },
  priceModeText: {
    fontSize: FONT_SIZES.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  priceModeTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  priceCalcText: {
    fontSize: FONT_SIZES.sm,
    color: colors.success,
    fontWeight: '600',
    marginTop: SPACING.xs,
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
  previewFinal: {
    fontSize: FONT_SIZES.lg,
    color: colors.primary,
    fontWeight: '700',
  },
  confirmButton: {
    backgroundColor: colors.success,
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
    color: colors.surface,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
});
