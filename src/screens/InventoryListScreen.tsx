import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { getAllItems, GroceryItemWithStatus } from '../database';
import { InventoryStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<InventoryStackParamList, 'InventoryList'>;

export default function InventoryListScreen() {
  const navigation = useNavigation<NavProp>();
  const [items, setItems] = useState<GroceryItemWithStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const allItems = await getAllItems();
      setItems(allItems);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'low': return COLORS.warning;
      case 'empty': return COLORS.danger;
      default: return COLORS.success;
    }
  };

  const getStatusIcon = (status: string): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'low': return 'warning';
      case 'empty': return 'alert-circle';
      default: return 'checkmark-circle';
    }
  };

  const renderItem = ({ item }: { item: GroceryItemWithStatus }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
    >
      <View style={styles.itemLeft}>
        <Ionicons
          name={getStatusIcon(item.status)}
          size={24}
          color={getStatusColor(item.status)}
        />
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.itemMetaRow}>
            <Text style={styles.itemCategory}>{item.category}</Text>
            {(item.isExpired || item.isExpiringSoon) && (
              <View
                style={[
                  styles.expiryBadge,
                  { backgroundColor: item.isExpired ? COLORS.dangerBg : COLORS.warningBg },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={10}
                  color={item.isExpired ? COLORS.danger : COLORS.warning}
                />
                <Text
                  style={[
                    styles.expiryBadgeText,
                    { color: item.isExpired ? COLORS.danger : COLORS.warning },
                  ]}
                >
                  {item.isExpired ? 'Expired' : `${item.daysUntilExpiry}d left`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.itemRight}>
        <Text style={[styles.itemQuantity, { color: getStatusColor(item.status) }]}>
          {item.currentQuantity} {item.unit}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>Your pantry is empty</Text>
            <Text style={styles.emptySubtitle}>
              Add items manually, scan a barcode, or scan a grocery invoice
            </Text>
          </View>
        }
      />

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, styles.fabTertiary]}
          onPress={() => navigation.navigate('BarcodeScan')}
        >
          <Ionicons name="barcode-outline" size={22} color={COLORS.surface} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fab, styles.fabSecondary]}
          onPress={() => navigation.navigate('ScanInvoice')}
        >
          <Ionicons name="scan-outline" size={24} color={COLORS.surface} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddItem')}
        >
          <Ionicons name="add" size={28} color={COLORS.surface} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.sm,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemInfo: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  itemName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  itemCategory: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 2,
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  expiryBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  itemQuantity: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: SPACING.xxl * 2,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
  },
  fabSecondary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accent,
  },
  fabTertiary: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
  },
});
