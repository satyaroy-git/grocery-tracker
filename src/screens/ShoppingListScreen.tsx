import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import {
  getShoppingList,
  markAsPurchased,
  markAsNotPurchased,
  clearPurchasedItems,
  generateShoppingListFromLowStock,
  getShoppingListAsText,
  removeFromShoppingList,
} from '../database';
import { ShoppingListItem } from '../database';
import { ShoppingStackParamList } from '../navigation/types';

type ShoppingNavProp = NativeStackNavigationProp<ShoppingStackParamList, 'ShoppingList'>;

export default function ShoppingListScreen() {
  const navigation = useNavigation<ShoppingNavProp>();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadList();
    }, [])
  );

  const loadList = async () => {
    try {
      const list = await getShoppingList();
      setItems(list);
    } catch (error) {
      Alert.alert('Error', 'Failed to load shopping list.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleTogglePurchased = async (item: ShoppingListItem) => {
    try {
      if (item.isPurchased) {
        await markAsNotPurchased(item.id);
        await loadList();
      } else {
        if (item.itemId) {
          navigation.navigate('PurchaseConfirm', { shoppingItemId: item.id });
        } else {
          await markAsPurchased(item.id);
          await loadList();
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update item.');
    }
  };

  const handleAutoGenerate = async () => {
    try {
      const newItems = await generateShoppingListFromLowStock();
      if (newItems.length === 0) {
        Alert.alert('Info', 'No low-stock items to add to the shopping list.');
      } else {
        Alert.alert('Success', `Added ${newItems.length} items from low stock.`);
      }
      await loadList();
    } catch (error) {
      Alert.alert('Error', 'Failed to generate shopping list.');
    }
  };

  const handleShare = async () => {
    try {
      const text = await getShoppingListAsText();
      await Share.share({ message: text });
    } catch (error) {
      // User cancelled or share failed
    }
  };

  const handleClearDone = () => {
    const purchasedCount = items.filter((i) => i.isPurchased).length;
    if (purchasedCount === 0) {
      Alert.alert('Info', 'No purchased items to clear.');
      return;
    }
    Alert.alert(
      'Clear Purchased',
      `Remove ${purchasedCount} purchased item(s) from the list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: async () => {
            await clearPurchasedItems();
            await loadList();
          },
        },
      ]
    );
  };

  const handleRemoveItem = (item: ShoppingListItem) => {
    Alert.alert('Remove Item', `Remove "${item.name}" from shopping list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeFromShoppingList(item.id);
          await loadList();
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: ShoppingListItem }) => (
    <View style={[styles.itemCard, item.isPurchased && styles.itemCardPurchased]}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => handleTogglePurchased(item)}
      >
        <Ionicons
          name={item.isPurchased ? 'checkbox' : 'square-outline'}
          size={24}
          color={item.isPurchased ? COLORS.success : COLORS.textSecondary}
        />
      </TouchableOpacity>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, item.isPurchased && styles.itemNamePurchased]}>
          {item.name}
        </Text>
        <Text style={styles.itemDetail}>
          {item.quantityNeeded} {item.unit} • {item.category}
        </Text>
      </View>
      <TouchableOpacity onPress={() => handleRemoveItem(item)}>
        <Ionicons name="close-circle-outline" size={22} color={COLORS.textLight} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const unpurchasedCount = items.filter((i) => !i.isPurchased).length;
  const purchasedCount = items.filter((i) => i.isPurchased).length;

  return (
    <View style={styles.container}>
      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionChip} onPress={handleAutoGenerate}>
          <Ionicons name="flash-outline" size={16} color={COLORS.primary} />
          <Text style={styles.actionChipText}>Auto-Generate</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionChip} onPress={handleShare}>
          <Ionicons name="share-outline" size={16} color={COLORS.primary} />
          <Text style={styles.actionChipText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionChip} onPress={handleClearDone}>
          <Ionicons name="trash-outline" size={16} color={COLORS.primary} />
          <Text style={styles.actionChipText}>Clear Done</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      {items.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {unpurchasedCount} remaining • {purchasedCount} purchased
          </Text>
        </View>
      )}

      {/* List */}
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>Shopping list is empty</Text>
          <Text style={styles.emptySubtitle}>
            Add items manually or auto-generate from low stock
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadList();
          }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddShoppingItem')}
      >
        <Ionicons name="add" size={28} color={COLORS.surface} />
      </TouchableOpacity>
    </View>
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
  actionBar: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    ...SHADOWS.sm,
  },
  actionChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  summary: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  summaryText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  itemCardPurchased: {
    opacity: 0.6,
  },
  checkbox: {
    marginRight: SPACING.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '500',
    color: COLORS.text,
  },
  itemNamePurchased: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  itemDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
});
