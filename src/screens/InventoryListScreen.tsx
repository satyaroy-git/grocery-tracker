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
import { SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { getAllItems, GroceryItemWithStatus } from '../database';
import { InventoryStackParamList } from '../navigation/types';
import { formatQuantity } from '../utils/numberFormat';

type NavProp = NativeStackNavigationProp<InventoryStackParamList, 'InventoryList'>;

export default function InventoryListScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const styles = createStyles(colors);
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
      case 'low': return colors.warning;
      case 'empty': return colors.danger;
      default: return colors.success;
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
                  { backgroundColor: item.isExpired ? colors.dangerBg : colors.warningBg },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={10}
                  color={item.isExpired ? colors.danger : colors.warning}
                />
                <Text
                  style={[
                    styles.expiryBadgeText,
                    { color: item.isExpired ? colors.danger : colors.warning },
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
          {formatQuantity(item.currentQuantity)} {item.unit}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
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
            <Ionicons name="cube-outline" size={64} color={colors.textLight} />
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
          <Ionicons name="barcode-outline" size={22} color={colors.surface} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fab, styles.fabSecondary]}
          onPress={() => navigation.navigate('ScanInvoice')}
        >
          <Ionicons name="scan-outline" size={24} color={colors.surface} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddItem')}
        >
          <Ionicons name="add" size={28} color={colors.surface} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  itemCard: {
    backgroundColor: colors.surface,
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
    color: colors.text,
  },
  itemCategory: {
    fontSize: FONT_SIZES.sm,
    color: colors.textSecondary,
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
    color: colors.text,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.md,
    color: colors.textSecondary,
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
  },
  fabSecondary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
  },
  fabTertiary: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary,
  },
});
