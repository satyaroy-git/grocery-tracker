import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { GroceryItemWithStatus, getAllItems } from '../database';
import { InventoryStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<InventoryStackParamList>;

export default function ItemListScreen() {
  const navigation = useNavigation<NavProp>();
  const [items, setItems] = useState<GroceryItemWithStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

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

  const renderItem = ({ item }: { item: GroceryItemWithStatus }) => (
    <TouchableOpacity style={styles.itemCard} onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}>
      <View style={styles.itemHeader}><Text style={styles.itemName}>{item.name}</Text><View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} /></View>
      <Text style={styles.itemCategory}>{item.category}</Text>
      <View style={styles.itemFooter}><Text style={styles.itemQuantity}>{item.currentQuantity} {item.unit}</Text>{item.daysUntilEmpty !== null && <Text style={styles.daysLeft}>~{item.daysUntilEmpty}d left</Text>}</View>
      <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${Math.min(100, (item.currentQuantity / Math.max(item.threshold * 2, 1)) * 100)}%`, backgroundColor: getStatusColor(item.status) }]} /></View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Search pantry..." placeholderTextColor={COLORS.textLight} value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={COLORS.textSecondary} /></TouchableOpacity>}
        </View>
      </View>
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
      <FlatList data={filteredItems} keyExtractor={(item) => item.id} renderItem={renderItem} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={<View style={styles.emptyState}><Ionicons name="basket-outline" size={48} color={COLORS.textLight} /><Text style={styles.emptyText}>{items.length === 0 ? 'Your pantry is empty.\nTap + to add items!' : 'No items match your filters.'}</Text></View>}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddItem')}><Ionicons name="add" size={28} color="#fff" /></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchRow: { padding: SPACING.md, paddingBottom: SPACING.sm },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, marginLeft: SPACING.sm, fontSize: FONT_SIZES.md, color: COLORS.text },
  filterSection: { marginBottom: SPACING.sm },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.sm },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  listContent: { paddingHorizontal: SPACING.md, paddingBottom: 80 },
  itemCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.text },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  itemCategory: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.sm },
  itemQuantity: { fontSize: FONT_SIZES.md, fontWeight: '500', color: COLORS.text },
  daysLeft: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  progressBar: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, marginTop: SPACING.sm, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl * 2 },
  emptyText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: 'center' },
  fab: { position: 'absolute', bottom: SPACING.lg, right: SPACING.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', ...SHADOWS.lg },
});
