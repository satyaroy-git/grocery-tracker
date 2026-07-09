import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';
import { getAllItems, deleteAllItems, GroceryItemWithStatus } from '../database';
import { InventoryStackParamList } from '../navigation/types';
import { formatQuantity } from '../utils/numberFormat';

type NavProp = NativeStackNavigationProp<InventoryStackParamList, 'InventoryList'>;
type SortMode = 'name' | 'category' | 'stock' | 'expiry';
type FilterMode = 'all' | 'low' | 'expiring' | 'expired';

export default function InventoryListScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(colors);
  const [items, setItems] = useState<GroceryItemWithStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const loadItems = useCallback(async () => {
    try {
      const allItems = await getAllItems();
      setItems(allItems);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  }, []);

  // Apply filter + sort
  const displayItems = useMemo(() => {
    let filtered = items;

    // Filter
    switch (filterMode) {
      case 'low':
        filtered = items.filter((i) => i.status === 'low' || i.status === 'empty');
        break;
      case 'expiring':
        filtered = items.filter((i) => i.isExpiringSoon && !i.isExpired);
        break;
      case 'expired':
        filtered = items.filter((i) => i.isExpired);
        break;
    }

    // Sort
    const sorted = [...filtered];
    switch (sortMode) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'category':
        sorted.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
        break;
      case 'stock':
        // Lowest stock first (most urgent)
        sorted.sort((a, b) => a.currentQuantity - b.currentQuantity);
        break;
      case 'expiry':
        // Soonest expiry first; items without expiry go last
        sorted.sort((a, b) => {
          if (!a.expiryDate && !b.expiryDate) return 0;
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return a.expiryDate.localeCompare(b.expiryDate);
        });
        break;
    }

    return sorted;
  }, [items, sortMode, filterMode]);

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

  const handleDeleteAll = () => {
    if (items.length === 0) {
      Alert.alert('Info', 'Your pantry is already empty.');
      return;
    }
    // Double confirmation for a destructive, irreversible bulk action -
    // matches the severity level of "Reset All Data" on the Settings
    // screen, but scoped only to pantry items (not shopping list, custom
    // categories/units, or app settings).
    Alert.alert(
      'Delete All Items',
      `This will permanently delete all ${items.length} item(s) from your pantry, along with their usage/restock history. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllItems();
              await loadItems();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete all items.');
            }
          },
        },
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      // Header button needs access to the latest `items.length` (to show a
      // friendly "already empty" message) and must be re-registered whenever
      // the screen regains focus, since navigation.setOptions options are
      // otherwise captured with whatever `items` was at mount time.
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity onPress={handleDeleteAll} hitSlop={8} style={styles.headerButton}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        ),
      });
    }, [navigation, items, colors])
  );

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
      {/* Sort & Filter Bar */}
      {items.length > 0 && (
        <View style={styles.filterSection}>
          {/* Filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {([
              { key: 'all' as FilterMode, label: t.filterAll },
              { key: 'low' as FilterMode, label: t.filterLowStock },
              { key: 'expiring' as FilterMode, label: t.filterExpiringSoon },
              { key: 'expired' as FilterMode, label: t.filterExpired },
            ]).map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, filterMode === f.key && styles.filterChipActive]}
                onPress={() => setFilterMode(f.key)}
              >
                <Text style={[styles.filterChipText, filterMode === f.key && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Sort chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <Text style={styles.sortLabel}>{t.sortBy}:</Text>
            {([
              { key: 'name' as SortMode, label: t.sortName },
              { key: 'category' as SortMode, label: t.sortCategory },
              { key: 'stock' as SortMode, label: t.sortStockLevel },
              { key: 'expiry' as SortMode, label: t.sortExpiry },
            ]).map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.sortChip, sortMode === s.key && styles.sortChipActive]}
                onPress={() => setSortMode(s.key)}
              >
                <Text style={[styles.sortChipText, sortMode === s.key && styles.sortChipTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={displayItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyTitle}>
              {filterMode !== 'all' ? `No ${filterMode} items` : t.pantryEmpty}
            </Text>
            <Text style={styles.emptySubtitle}>
              {filterMode !== 'all'
                ? 'Try changing the filter above'
                : t.pantryEmptySubtitle}
            </Text>
          </View>
        }
      />

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, styles.fabTertiary]}
          onPress={() => navigation.navigate('ShelfScan')}
        >
          <Ionicons name="camera-outline" size={22} color={colors.surface} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fab, styles.fabTertiary]}
          onPress={() => navigation.navigate('VoiceCommand')}
        >
          <Ionicons name="mic-outline" size={22} color={colors.surface} />
        </TouchableOpacity>
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
  headerButton: {
    paddingHorizontal: SPACING.sm,
  },
  filterSection: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
  },
  filterChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: FONT_SIZES.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  sortLabel: {
    fontSize: FONT_SIZES.sm,
    color: colors.textSecondary,
    fontWeight: '600',
    marginRight: SPACING.xs,
  },
  sortChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.background,
  },
  sortChipActive: {
    backgroundColor: colors.primaryLight + '30',
  },
  sortChipText: {
    fontSize: FONT_SIZES.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sortChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
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
