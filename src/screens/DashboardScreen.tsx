import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { GroceryItemWithStatus, getItemCount, getAllItems, getExpiringItems, getTotalSpendThisMonth } from '../database';
import { DashboardStackParamList } from '../navigation/types';
import { useTheme } from '../hooks/useTheme';

type NavProp = NativeStackNavigationProp<DashboardStackParamList>;

export default function DashboardScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [counts, setCounts] = useState({ total: 0, low: 0, outOfStock: 0 });
  const [items, setItems] = useState<GroceryItemWithStatus[]>([]);
  const [expiringItems, setExpiringItems] = useState<GroceryItemWithStatus[]>([]);
  const [monthlySpend, setMonthlySpend] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRestockPicker, setShowRestockPicker] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [countData, allItems, expiring, spend] = await Promise.all([getItemCount(), getAllItems(), getExpiringItems(), getTotalSpendThisMonth()]);
      setCounts(countData);
      setItems(allItems);
      setExpiringItems(expiring);
      setMonthlySpend(spend);
    } catch (error) { /* silent */ }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const filteredItems = items.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const getStatusColor = (status: string) => {
    switch (status) { case 'sufficient': return COLORS.success; case 'low': return COLORS.warning; case 'out_of_stock': return COLORS.danger; default: return COLORS.textSecondary; }
  };
  const getStatusBg = (status: string) => {
    switch (status) { case 'sufficient': return COLORS.successBg; case 'low': return COLORS.warningBg; case 'out_of_stock': return COLORS.dangerBg; default: return COLORS.background; }
  };
  const getStatusLabel = (status: string) => {
    switch (status) { case 'sufficient': return 'OK'; case 'low': return 'Low'; case 'out_of_stock': return 'Out'; default: return ''; }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: SPACING.sm }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}>
      <View style={styles.cardsRow}>
        <View style={[styles.card, { backgroundColor: COLORS.successBg }]}>
          <Ionicons name="cube-outline" size={24} color={COLORS.success} />
          <Text style={[styles.cardNumber, { color: COLORS.success }]}>{counts.total}</Text>
          <Text style={styles.cardLabel}>Total Items</Text>
        </View>
        <View style={[styles.card, { backgroundColor: COLORS.warningBg }]}>
          <Ionicons name="alert-circle-outline" size={24} color={COLORS.warning} />
          <Text style={[styles.cardNumber, { color: COLORS.warning }]}>{counts.low}</Text>
          <Text style={styles.cardLabel}>Running Low</Text>
        </View>
        <View style={[styles.card, { backgroundColor: COLORS.dangerBg }]}>
          <Ionicons name="close-circle-outline" size={24} color={COLORS.danger} />
          <Text style={[styles.cardNumber, { color: COLORS.danger }]}>{counts.outOfStock}</Text>
          <Text style={styles.cardLabel}>Out of Stock</Text>
        </View>
      </View>

      {/* Monthly Spend */}
      {monthlySpend > 0 && (
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.sm }}>
            <Ionicons name="wallet-outline" size={24} color={COLORS.primary} />
            <View style={{ marginLeft: SPACING.md }}>
              <Text style={{ fontSize: FONT_SIZES.xs, color: COLORS.textSecondary }}>This Month's Grocery Spend</Text>
              <Text style={{ fontSize: FONT_SIZES.xxl, fontWeight: '700', color: COLORS.primary }}>Rs. {monthlySpend.toFixed(0)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Weekly Digest Button */}
      <View style={styles.section}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.sm }}
          onPress={() => navigation.navigate('WeeklyDigest')}
        >
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="calendar-outline" size={22} color={COLORS.primary} />
          </View>
          <View style={{ marginLeft: SPACING.md, flex: 1 }}>
            <Text style={{ fontSize: FONT_SIZES.md, fontWeight: '600', color: colors.text }}>Weekly Digest</Text>
            <Text style={{ fontSize: FONT_SIZES.sm, color: colors.textSecondary }}>View your weekly summary</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: COLORS.primary }]} onPress={() => navigation.navigate('LogUsage', {})}>
            <Ionicons name="remove-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>Log Usage</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: COLORS.secondary }]} onPress={() => { if (items.length > 0) setShowRestockPicker(true); }}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>Restock</Text>
          </TouchableOpacity>
        </View>

        {/* Restock Item Picker */}
        {showRestockPicker && (
          <View style={{ backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, marginTop: SPACING.sm, padding: SPACING.sm, ...SHADOWS.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm, paddingHorizontal: SPACING.sm }}>
              <Text style={{ fontSize: FONT_SIZES.md, fontWeight: '600', color: colors.text }}>Select item to restock:</Text>
              <TouchableOpacity onPress={() => setShowRestockPicker(false)}>
                <Ionicons name="close-circle" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={{ flexDirection: 'row', alignItems: 'center', padding: SPACING.sm, borderRadius: BORDER_RADIUS.md, marginBottom: 4 }}
                onPress={() => { setShowRestockPicker(false); navigation.navigate('Restock', { itemId: item.id }); }}
              >
                <Ionicons name="cube-outline" size={18} color={COLORS.primary} />
                <Text style={{ flex: 1, marginLeft: SPACING.sm, fontSize: FONT_SIZES.md, color: colors.text }}>{item.name}</Text>
                <Text style={{ fontSize: FONT_SIZES.sm, color: colors.textSecondary }}>{parseFloat(item.currentQuantity.toFixed(2))} {item.unit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Search items..." placeholderTextColor={COLORS.textLight} value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={COLORS.textSecondary} /></TouchableOpacity>}
        </View>
      </View>

      {/* Expiry Alerts */}
      {expiringItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expiry Alerts</Text>
          {expiringItems.map((item) => (
            <View key={item.id} style={[styles.itemRow, { borderLeftWidth: 3, borderLeftColor: item.expiryStatus === 'expired' ? COLORS.danger : COLORS.warning }]}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={[styles.itemDetail, { color: item.expiryStatus === 'expired' ? COLORS.danger : COLORS.warning }]}>
                  {item.expiryStatus === 'expired' ? 'EXPIRED' : `Expires in ${item.daysUntilExpiry} day${item.daysUntilExpiry !== 1 ? 's' : ''}`}
                </Text>
              </View>
              <Ionicons name={item.expiryStatus === 'expired' ? 'warning' : 'time-outline'} size={20} color={item.expiryStatus === 'expired' ? COLORS.danger : COLORS.warning} />
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inventory Status</Text>
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}><Ionicons name="basket-outline" size={48} color={COLORS.textLight} /><Text style={styles.emptyText}>{items.length === 0 ? 'No items yet. Start by adding groceries!' : 'No items match your search.'}</Text></View>
        ) : (
          filteredItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.itemRow} onPress={() => navigation.navigate('LogUsage', { itemId: item.id })}>
              <View style={styles.itemInfo}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.itemDetail}>{parseFloat(item.currentQuantity.toFixed(2))} {item.unit} | {item.category}</Text></View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusBg(item.status) }]}><View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} /><Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{getStatusLabel(item.status)}</Text></View>
            </TouchableOpacity>
          ))
        )}
      </View>
      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  cardsRow: { flexDirection: 'row', padding: SPACING.md, paddingTop: SPACING.sm, gap: SPACING.sm },
  card: { flex: 1, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', ...SHADOWS.sm },
  cardNumber: { fontSize: FONT_SIZES.xxl, fontWeight: '700', marginTop: SPACING.xs },
  cardLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  section: { paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: SPACING.md, borderRadius: BORDER_RADIUS.md, gap: SPACING.sm, ...SHADOWS.sm },
  actionText: { color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, marginLeft: SPACING.sm, fontSize: FONT_SIZES.md, color: COLORS.text },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.sm, ...SHADOWS.sm },
  itemInfo: { flex: 1 },
  itemName: { fontSize: FONT_SIZES.md, fontWeight: '500', color: COLORS.text },
  itemDetail: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.full, gap: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: FONT_SIZES.xs, fontWeight: '600' },
});
