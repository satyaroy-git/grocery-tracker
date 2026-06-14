import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import {
  getAllItems,
  getRecentConsumptionLogs,
  getWeeklyConsumption,
} from '../database';
import { GroceryItemWithStatus, ConsumptionLog } from '../database';

export default function InsightsScreen() {
  const [items, setItems] = useState<GroceryItemWithStatus[]>([]);
  const [recentLogs, setRecentLogs] = useState<ConsumptionLog[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ week: string; total: number }[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    if (selectedItemId) {
      loadWeeklyData(selectedItemId);
    }
  }, [selectedItemId]);

  const loadData = async () => {
    try {
      const [allItems, logs] = await Promise.all([
        getAllItems(),
        getRecentConsumptionLogs(30),
      ]);
      setItems(allItems);
      setRecentLogs(logs);
      if (allItems.length > 0 && !selectedItemId) {
        setSelectedItemId(allItems[0].id);
      }
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeeklyData = async (itemId: string) => {
    try {
      const data = await getWeeklyConsumption(itemId, 4);
      setWeeklyData(data);
    } catch (error) {
      console.error('Failed to load weekly data:', error);
    }
  };

  const getThisWeekConsumption = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return recentLogs.filter(
      (log) => log.type !== 'restock' && new Date(log.createdAt) >= weekAgo
    ).length;
  };

  const getThisMonthConsumption = () => {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    return recentLogs.filter(
      (log) => log.type !== 'restock' && new Date(log.createdAt) >= monthAgo
    ).length;
  };

  const getTopConsumedItems = () => {
    const consumptionByItem: Record<string, { name: string; total: number }> = {};
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 30);

    recentLogs
      .filter((log) => log.type !== 'restock' && new Date(log.createdAt) >= weekAgo)
      .forEach((log) => {
        const item = items.find((i) => i.id === log.itemId);
        if (item) {
          if (!consumptionByItem[log.itemId]) {
            consumptionByItem[log.itemId] = { name: item.name, total: 0 };
          }
          consumptionByItem[log.itemId].total += log.quantity;
        }
      });

    return Object.values(consumptionByItem)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  };

  const getFastMovingItems = () => {
    return items
      .filter((item) => item.daysUntilEmpty !== null && item.daysUntilEmpty <= 7)
      .sort((a, b) => (a.daysUntilEmpty || 0) - (b.daysUntilEmpty || 0))
      .slice(0, 5);
  };

  const maxWeeklyValue = weeklyData.length > 0 ? Math.max(...weeklyData.map((d) => d.total)) : 1;
  const selectedItem = items.find((i) => i.id === selectedItemId);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const topConsumed = getTopConsumedItems();
  const fastMoving = getFastMovingItems();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
          <Text style={styles.summaryValue}>{getThisWeekConsumption()}</Text>
          <Text style={styles.summaryLabel}>This Week</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="stats-chart-outline" size={24} color={COLORS.secondary} />
          <Text style={styles.summaryValue}>{getThisMonthConsumption()}</Text>
          <Text style={styles.summaryLabel}>This Month</Text>
        </View>
      </View>

      {/* Weekly Chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weekly Consumption</Text>

        {/* Item Selector */}
        {items.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemSelector}>
            {items.slice(0, 10).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.itemChip,
                  selectedItemId === item.id && styles.itemChipActive,
                ]}
                onPress={() => setSelectedItemId(item.id)}
              >
                <Text
                  style={[
                    styles.itemChipText,
                    selectedItemId === item.id && styles.itemChipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Bar Chart */}
        {weeklyData.length === 0 ? (
          <Text style={styles.emptyText}>No consumption data for this item yet</Text>
        ) : (
          <View style={styles.chartContainer}>
            {weeklyData.map((data, index) => (
              <View key={index} style={styles.barColumn}>
                <Text style={styles.barValue}>{data.total.toFixed(1)}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${(data.total / maxWeeklyValue) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>W{index + 1}</Text>
              </View>
            ))}
          </View>
        )}

        {selectedItem && (
          <Text style={styles.chartUnit}>
            Unit: {selectedItem.unit}
          </Text>
        )}
      </View>

      {/* Top Consumed */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top Consumed (30 days)</Text>
        {topConsumed.length === 0 ? (
          <Text style={styles.emptyText}>No consumption data yet</Text>
        ) : (
          topConsumed.map((item, index) => (
            <View key={index} style={styles.rankingItem}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              <Text style={styles.rankName}>{item.name}</Text>
              <Text style={styles.rankValue}>{item.total.toFixed(1)}</Text>
            </View>
          ))
        )}
      </View>

      {/* Fast Moving Alerts */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="warning-outline" size={20} color={COLORS.warning} />
          <Text style={styles.cardTitle}>Fast-Moving Items</Text>
        </View>
        {fastMoving.length === 0 ? (
          <Text style={styles.emptyText}>No fast-moving items detected</Text>
        ) : (
          fastMoving.map((item) => (
            <View key={item.id} style={styles.alertItem}>
              <View style={styles.alertInfo}>
                <Text style={styles.alertName}>{item.name}</Text>
                <Text style={styles.alertDetail}>
                  {item.currentQuantity} {item.unit} remaining
                </Text>
              </View>
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>
                  {item.daysUntilEmpty}d left
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
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
  summaryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  summaryValue: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  itemSelector: {
    marginBottom: SPACING.md,
  },
  itemChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  itemChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  itemChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  itemChipTextActive: {
    color: COLORS.surface,
    fontWeight: '600',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 150,
    gap: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barValue: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  barTrack: {
    flex: 1,
    width: '100%',
    backgroundColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    minHeight: 4,
  },
  barLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  chartUnit: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  rankText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.primary,
  },
  rankName: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  rankValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  alertInfo: {
    flex: 1,
  },
  alertName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.text,
  },
  alertDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  alertBadge: {
    backgroundColor: COLORS.warningBg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  alertBadgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.warning,
  },
});
