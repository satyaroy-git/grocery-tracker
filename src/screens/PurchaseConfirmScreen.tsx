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
import {
  getShoppingList,
  markAsPurchased,
  restockItem,
  getItemById,
  logConsumption,
} from '../database';
import { ShoppingListItem, GroceryItemWithStatus } from '../database';
import { ShoppingStackParamList } from '../navigation/types';

type PurchaseConfirmRouteProp = RouteProp<ShoppingStackParamList, 'PurchaseConfirm'>;

export default function PurchaseConfirmScreen() {
  const navigation = useNavigation();
  const route = useRoute<PurchaseConfirmRouteProp>();
  const { shoppingItemId } = route.params;

  const [shoppingItem, setShoppingItem] = useState<ShoppingListItem | null>(null);
  const [linkedItem, setLinkedItem] = useState<GroceryItemWithStatus | null>(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const list = await getShoppingList();
      const shopItem = list.find((i) => i.id === shoppingItemId);
      if (!shopItem) {
        Alert.alert('Error', 'Shopping item not found.');
        navigation.goBack();
        return;
      }
      setShoppingItem(shopItem);

      if (shopItem.itemId) {
        const item = await getItemById(shopItem.itemId);
        setLinkedItem(item);
        if (item) {
          const suggestedTotal = item.currentQuantity + shopItem.quantityNeeded;
          setNewQuantity(suggestedTotal.toString());
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load data.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!shoppingItem) return;

    if (linkedItem && (!newQuantity || parseFloat(newQuantity) < 0)) {
      Alert.alert('Error', 'Please enter a valid quantity.');
      return;
    }

    setSubmitting(true);
    try {
      await markAsPurchased(shoppingItem.id);

      if (linkedItem && newQuantity) {
        const qty = parseFloat(newQuantity);
        const addedAmount = qty - linkedItem.currentQuantity;
        await restockItem(linkedItem.id, qty);
        if (addedAmount > 0) {
          await logConsumption(linkedItem.id, addedAmount, 'restock', 'Purchased from shopping list');
        }
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to confirm purchase.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (!shoppingItem) return;
    try {
      await markAsPurchased(shoppingItem.id);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to skip.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!shoppingItem) return null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Item Info */}
        <View style={styles.headerCard}>
          <Ionicons name="bag-check-outline" size={48} color={COLORS.success} />
          <Text style={styles.headerTitle}>Confirm Purchase</Text>
          <Text style={styles.itemName}>{shoppingItem.name}</Text>
          <Text style={styles.itemDetail}>
            {shoppingItem.quantityNeeded} {shoppingItem.unit} • {shoppingItem.category}
          </Text>
        </View>

        {/* Restock Input */}
        {linkedItem && (
          <View style={styles.restockSection}>
            <Text style={styles.sectionTitle}>Update Stock</Text>
            <Text style={styles.currentStock}>
              Current stock: {linkedItem.currentQuantity} {linkedItem.unit}
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>New Total Quantity</Text>
              <TextInput
                style={styles.input}
                value={newQuantity}
                onChangeText={setNewQuantity}
                placeholder="Enter new total"
                placeholderTextColor={COLORS.textLight}
                keyboardType="decimal-pad"
              />
            </View>

            {newQuantity && parseFloat(newQuantity) > 0 && (
              <View style={styles.previewCard}>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Current:</Text>
                  <Text style={styles.previewValue}>
                    {linkedItem.currentQuantity} {linkedItem.unit}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>After purchase:</Text>
                  <Text style={[styles.previewValue, { color: COLORS.success }]}>
                    {parseFloat(newQuantity)} {linkedItem.unit}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Buttons */}
        <TouchableOpacity
          style={[styles.confirmButton, submitting && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={submitting}
        >
          <Ionicons name="checkmark-circle-outline" size={22} color={COLORS.surface} />
          <Text style={styles.confirmButtonText}>
            {submitting ? 'Confirming...' : 'Confirm Purchase'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip (mark as purchased only)</Text>
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
  headerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  itemName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: SPACING.sm,
  },
  itemDetail: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  restockSection: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  currentStock: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
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
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
  },
  previewCard: {
    backgroundColor: COLORS.successBg,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
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
  confirmButton: {
    backgroundColor: COLORS.success,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  skipButton: {
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  skipButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
