import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { GroceryItemWithStatus, getAllItems, deleteItem } from '../database';
import { InventoryStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<InventoryStackParamList>;

export default function ItemListScreen() {
  const navigation = useNavigation<NavProp>();
  const [items, setItems] = useState<GroceryItemWithStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadItems = useCallback(async () => { try { setItems(await getAllItems()); } catch (e) { console.error(e); } }, []);
  useFocusEffect(useCallback(() => { loadItems(); }, [loadItems]));
  const onRefresh = async () => { setRefreshing(true); await loadItems(); setRefreshing(false); };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    const matchesStatus = !selectedStatus || item.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = [...new Set(items.map((i) => i.category))];
  const getStatusColor = (s: string) => { switch (s) { case 'sufficient': return COLORS.success; case 'low': return COLORS.warning; case 'out_of_stock': return COLORS.danger; default: return COLORS.textSecondary; } };

  // Multi-select handlers
  const toggleSelectMode = () => {
    if (selectMode) {
      setSelectMode(false);
      setSelectedIds(new Set());
    } else {
      setSelectMode(true);
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(filteredItems.map((i) => i.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;

    Alert.alert(
      'Delete Items',
      `Are you sure you want to delete ${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const id of selectedIds) {
                await deleteItem(id);
              }
              setSelectMode(false);
              setSelectedIds(new Set());
              await loadItems();
              Alert.alert('Done', `${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''} deleted.`);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete some items.');
            }
          },
        },
      ]
    );
  };

  const handleItemPress = (item: GroceryItemWithStatus) => {
    if (selectMode) {
      toggleSelectItem(item.id);
    } else {
      navigation.navigate('ItemDetail', { itemId: item.id });
    }
  };

  const handleItemLongPress = (item: GroceryItemWithStatus) => {
    if (!selectMode) {
      setSelectMode(true);
      setSelectedIds(new Set([item.id]));
    }
  };

  const renderItem = ({ item }: { item: GroceryItemWithStatus }) => (
    <TouchableOpacity
      style={[styles.itemCard, selectMode && selectedIds.has(item.id) && styles.itemCardSelected]}
      onPress={() => handleItemPress(item)}
      onLongPress={() => handleItemLongPress(item)}
    >
      <View style={styles.itemRow}>
        {selectMode && (
          <View style={styles.checkboxContainer}>
            <Ionicons
              name={selectedIds.has(item.id) ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={selectedIds.has(item.id) ? COLORS.primary : COLORS.textLight}
            />
          </View>
        )}
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}><Text style={styles.itemName}>{item.name}</Text><View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} /></View>
          <Text style={styles.itemCategory}>{item.category}</Text>
          <View style={styles.itemFooter}><Text style={styles.itemQuantity}>{item.currentQuantity} {item.unit}</Text>{item.daysUntilEmpty !== null && <Text style={styles.daysLeft}>~{item.daysUntilEmpty}d left</Text>}</View>
          <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${Math.min(100, (item.currentQuantity / Math.max(item.threshold * 2, 1)) * 100)}%`, backgroundColor: getStatusColor(item.status) }]} /></View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Select mode header */}
      {selectMode && (
        <View style={styles.selectBar}>
          <TouchableOpacity onPress={toggleSelectMode} style={styles.selectBarBtn}>
            <Ionicons name="close" size={20} color={COLORS.text} />
            <Text style={styles.selectBarText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.selectedCount}>{selectedIds.size} selected</Text>
          <TouchableOpacity onPress={selectedIds.size === filteredItems.length ? deselectAll : selectAllVisible} style={styles.selectBarBtn}>
            <Text style={styles.selectAllText}>
              {selectedIds.size === filteredItems.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search - hidden in select mode */}
      {!selectMode && (
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
            <TextInput style={styles.searchInput} placeholder="Search pantry..." placeholderTextColor={COLORS.textLight} value={searchQuery} onChangeText={setSearchQuery} />
            {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={COLORS.textSecondary} /></TouchableOpacity>}
          </View>
          {/* Long-press hint */}
          {items.length > 0 && (
            <TouchableOpacity onPress={toggleSelectMode} style={styles.editButton}>
              <Ionicons name="trash-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.editButtonText}>Select</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Filters */}
      {!selectMode && (
        <View style={styles.filterSection}>
          <FlatList horizontal showsHorizontalScrollIndicator={false}
            data={[{ label: 'All', value: null }, { label: 'Low', value: 'low' }, { label: 'Out', value: 'out_of_stock' }, ...categories.map((c) => ({ label: c, value: c }))]}
            keyExtractor={(item) => item.label}
            renderItem={({ item: filter }) => {
              const isStatusFilter = ['low', 'out_of_stock'].includes(filter.value ?? '');
              const isActive = isStatusFilter ? selectedStatus === filter.value : filter.value === null ? !selectedCategory && !selectedStatus : selectedCategory === filter.value;
              return (<TouchableOpacity style={[styles.chip, isActive && styles.chipActive]} onPress={() => { if (filter.value === null) { setSelectedCategory(null); setSelectedStatus(null); } else if (isStatusFilter) { setSelectedStatus(selectedStatus === filter.value ? null : filter.value); setSelectedCategory(null); } else { setSelectedCategory(selectedCategory === filter.value ? null : filter.value); setSelectedStatus(null); } }}><Text style={[styles.chipText, isActive && styles.chipTextActive]}>{filter.label}</Text></TouchableOpacity>);
            }}
            contentContainerStyle={{ paddingHorizontal: SPACING.md }}
          />
        </View>
      )}

      {/* Items list */}
      <FlatList data={filteredItems} keyExtractor={(item) => item.id} renderItem={renderItem} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="basket-outline" size={48} color={COLORS.textLight} /><Text style={styles.emptyText}>{items.length === 0 ? 'Your pantry is empty.\nTap + to add items!' : 'No items match your filters.'}</Text></View>}
      />

      {/* Delete bar (select mode) */}
      {selectMode && selectedIds.size > 0 && (
        <View style={styles.deleteBar}>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteSelected}>
            <Ionicons name="trash" size={20} color="#fff" />
            <Text style={styles.deleteButtonText}>Delete {selectedIds.size} Item{selectedIds.size > 1 ? 's' : ''}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FABs (only in normal mode) */}
      {!selectMode && (
        <>
          <TouchableOpacity style={styles.recipeFab} onPress={() => navigation.navigate('RecipeSuggestions')}><Ionicons name="nutrition-outline" size={20} color="#fff" /></TouchableOpacity>
          <TouchableOpacity style={styles.barcodeFab} onPress={() => navigation.navigate('BarcodeScanner')}><Ionicons name="barcode-outline" size={20} color="#fff" /></TouchableOpacity>
          <TouchableOpacity style={styles.importFab} onPress={() => navigation.navigate('BulkImport')}><Ionicons name="clipboard-outline" size={22} color="#fff" /></TouchableOpacity>
          <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddItem')}><Ionicons name="add" size={28} color="#fff" /></TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  // Select mode bar
  selectBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  selectBarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  selectBarText: { fontSize: FONT_SIZES.md, color: COLORS.text },
  selectedCount: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.primary },
  selectAllText: { fontSize: FONT_SIZES.md, color: COLORS.primary, fontWeight: '500' },
  // Search row
  searchRow: { flexDirection: 'row', padding: SPACING.md, paddingBottom: SPACING.sm, gap: SPACING.sm, alignItems: 'center' },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, marginLeft: SPACING.sm, fontSize: FONT_SIZES.md, color: COLORS.text },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  editButtonText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  // Filters
  filterSection: { marginBottom: SPACING.sm },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.sm },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  // List
  listContent: { paddingHorizontal: SPACING.md, paddingBottom: 100 },
  itemCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm },
  itemCardSelected: { backgroundColor: COLORS.dangerBg, borderWidth: 1, borderColor: COLORS.danger },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  checkboxContainer: { marginRight: SPACING.sm },
  itemContent: { flex: 1 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.text },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  itemCategory: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.sm },
  itemQuantity: { fontSize: FONT_SIZES.md, fontWeight: '500', color: COLORS.text },
  daysLeft: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  progressBar: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, marginTop: SPACING.sm, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  // Empty
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl * 2 },
  emptyText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: 'center' },
  // Delete bar
  deleteBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.md, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.danger, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, gap: SPACING.sm, ...SHADOWS.md },
  deleteButtonText: { color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600' },
  // FABs
  fab: { position: 'absolute', bottom: SPACING.lg, right: SPACING.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', ...SHADOWS.lg },
  importFab: { position: 'absolute', bottom: SPACING.lg + 64, right: SPACING.lg, width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center', ...SHADOWS.md },
  barcodeFab: { position: 'absolute', bottom: SPACING.lg + 64 + 56, right: SPACING.lg, width: 48, height: 48, borderRadius: 24, backgroundColor: '#9C27B0', justifyContent: 'center', alignItems: 'center', ...SHADOWS.md },
  recipeFab: { position: 'absolute', bottom: SPACING.lg + 64 + 56 + 56, right: SPACING.lg, width: 48, height: 48, borderRadius: 24, backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center', ...SHADOWS.md },
});
