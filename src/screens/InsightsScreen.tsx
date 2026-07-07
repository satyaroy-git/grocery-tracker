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
import { SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import {
  getAllItems,
  getAllRecentConsumptionLogs,
  getWeeklyConsumptionBreakdown,
  getExpenditureSummary,
  getSpendByCategory,
  getMonthlySpendTrend,
} from '../database';
import {
  GroceryItemWithStatus,
  ConsumptionLog,
  ExpenditureSummary,
  CategorySpend,
  MonthlySpend,
} from '../database';
import { formatMoney, formatQuantity } from '../utils/numberFormat';

export default function InsightsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [items, setItems] = useState<GroceryItemWithStatus[]>([]);
  const [recentLogs, setRecentLogs] = useState<ConsumptionLog[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ week: string; total: number }[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [expenditure, setExpenditure] = useState<ExpenditureSummary | null>(null);
  const [categorySpend, setCategorySpend] = useState<CategorySpend[]>([]);
  const [monthlySpend, setMonthlySpend] = useState<MonthlySpend[]>([]);

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
      const [allItems, logs, expSummary, catSpend, monthTrend] = await Promise.all([
        getAllItems(),
        getAllRecentConsumptionLogs(30),
        getExpenditureSummary(),
        getSpendByCategory(),
        getMonthlySpendTrend(6),
      ]);
      setItems(allItems);
      setRecentLogs(logs);
      setExpenditure(expSummary);
      setCategorySpend(catSpend);
      setMonthlySpend(monthTrend);
      if (allItems.length > 0 && !selectedItemId) {
        setSelectedItemId(allItems[0].id);
      }
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeeklyData = async (itemId: number) => {
    try {
      const data = await getWeeklyConsumptionBreakdown(itemId, 4);
      setWeeklyData(data);
    } catch (error) {
      console.error('Failed to load weekly data:', error);
      setWeeklyData([]);
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
  const maxMonthlySpend = monthlySpend.length > 0 ? Math.max(...monthlySpend.map((d) => d.total), 1) : 1;
  const selectedItem = items.find((i) => i.id === selectedItemId);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const topConsumed = getTopConsumedItems();
  const fastMoving = getFastMovingItems();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Summary Cards */}
      {/* NOTE: these count "Log Usage" events only (type !== 'restock'), NOT
          purchases/restocks - a user who has only scanned invoices / restocked
          items but never logged usage will correctly see 0 here even though
          Expenditure below shows real purchase activity. Labeled "Usage"
          explicitly (was just "This Week"/"This Month") to avoid this reading
          as a bug when it's really just an empty state. */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Ionicons name="calendar-outline" size={24} color={colors.primary} />
          <Text style={styles.summaryValue}>{getThisWeekConsumption()}</Text>
          <Text style={styles.summaryLabel}>Usage This Week</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="stats-chart-outline" size={24} color={colors.secondary} />
          <Text style={styles.summaryValue}>{getThisMonthConsumption()}</Text>
          <Text style={styles.summaryLabel}>Usage This Month</Text>
        </View>
      </View>
      {getThisMonthConsumption() === 0 && (
        <Text style={styles.usageHint}>
          These count items logged via "Log Usage" (consumption), not purchases/restocks.
          Open an item and tap "Log Usage" to start tracking usage here.
        </Text>
      )}

      {/* Expenditure Summary */}
      {expenditure && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="wallet-outline" size={20} color={colors.success} />
            <Text style={styles.cardTitle}>Expenditure</Text>
          </View>

          <View style={styles.spendSummaryRow}>
            <View style={styles.spendSummaryItem}>
              <Text style={styles.spendSummaryValue}>₹{formatMoney(expenditure.thisMonthSpend)}</Text>
              <Text style={styles.spendSummaryLabel}>This Month</Text>
            </View>
            <View style={styles.spendSummaryDivider} />
            <View style={styles.spendSummaryItem}>
              <Text style={styles.spendSummaryValue}>₹{formatMoney(expenditure.lastMonthSpend)}</Text>
              <Text style={styles.spendSummaryLabel}>Last Month</Text>
            </View>
            <View style={styles.spendSummaryDivider} />
            <View style={styles.spendSummaryItem}>
              <Text style={styles.spendSummaryValue}>₹{formatMoney(expenditure.totalSpend)}</Text>
              <Text style={styles.spendSummaryLabel}>All Time</Text>
            </View>
          </View>

          {expenditure.purchaseCount > 0 && (
            <Text style={styles.spendCaveat}>
              Based on {expenditure.purchaseCount} priced purchase{expenditure.purchaseCount === 1 ? '' : 's'}{' '}
              (initial purchases and restocks where a price was entered).
            </Text>
          )}

          {/* Monthly spend trend bar chart */}
          {monthlySpend.some((m) => m.total > 0) && (
            <>
              <Text style={styles.subChartTitle}>Last 6 Months</Text>
              <View style={styles.chartContainer}>
                {monthlySpend.map((data, index) => (
                  <View key={index} style={styles.barColumn}>
                    <Text style={styles.barValue}>₹{formatMoney(data.total)}</Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFillSpend,
                          { height: `${(data.total / maxMonthlySpend) * 100}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{data.month}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Spend by category */}
          {categorySpend.length > 0 && (
            <>
              <Text style={styles.subChartTitle}>By Category</Text>
              {categorySpend.slice(0, 6).map((cat, index) => (
                <View key={index} style={styles.categorySpendRow}>
                  <Text style={styles.categorySpendName} numberOfLines={1}>
                    {cat.category}
                  </Text>
                  <View style={styles.categorySpendBarTrack}>
                    <View
                      style={[
                        styles.categorySpendBarFill,
                        {
                          width: `${(cat.total / (categorySpend[0]?.total || 1)) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.categorySpendValue}>₹{formatMoney(cat.total)}</Text>
                </View>
              ))}
            </>
          )}

          {expenditure.purchaseCount === 0 && (
            <Text style={styles.emptyText}>
              No spend data yet. Add a price when creating an item or restocking to see expenditure insights here.
            </Text>
          )}
        </View>
      )}

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
                <Text style={styles.barValue}>{formatQuantity(data.total, 2)}</Text>
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
              <Text style={styles.rankValue}>{formatQuantity(item.total, 2)}</Text>
            </View>
          ))
        )}
      </View>

      {/* Fast Moving Alerts */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="warning-outline" size={20} color={colors.warning} />
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
                  {formatQuantity(item.currentQuantity)} {item.unit} remaining
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
  summaryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  summaryValue: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '700',
    color: colors.text,
    marginTop: SPACING.xs,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.sm,
    color: colors.textSecondary,
    marginTop: SPACING.xs,
  },
  usageHint: {
    fontSize: FONT_SIZES.xs,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: colors.text,
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
    borderColor: colors.border,
    marginRight: SPACING.sm,
  },
  itemChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  itemChipText: {
    fontSize: FONT_SIZES.sm,
    color: colors.textSecondary,
  },
  itemChipTextActive: {
    color: colors.surface,
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
    color: colors.textSecondary,
    marginBottom: SPACING.xs,
  },
  barTrack: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.border,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: BORDER_RADIUS.sm,
    minHeight: 4,
  },
  barLabel: {
    fontSize: FONT_SIZES.xs,
    color: colors.textSecondary,
    marginTop: SPACING.xs,
  },
  chartUnit: {
    fontSize: FONT_SIZES.xs,
    color: colors.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  spendSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  spendSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  spendSummaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  spendSummaryValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: colors.success,
  },
  spendSummaryLabel: {
    fontSize: FONT_SIZES.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  spendCaveat: {
    fontSize: FONT_SIZES.xs,
    color: colors.textLight,
    marginTop: SPACING.sm,
    lineHeight: 16,
  },
  subChartTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: colors.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  barFillSpend: {
    width: '100%',
    backgroundColor: colors.success,
    borderRadius: BORDER_RADIUS.sm,
    minHeight: 4,
  },
  categorySpendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  categorySpendName: {
    width: 90,
    fontSize: FONT_SIZES.sm,
    color: colors.text,
  },
  categorySpendBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: colors.border,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  categorySpendBarFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: BORDER_RADIUS.sm,
  },
  categorySpendValue: {
    width: 60,
    textAlign: 'right',
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  rankText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: colors.primary,
  },
  rankName: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: colors.text,
    fontWeight: '500',
  },
  rankValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  alertInfo: {
    flex: 1,
  },
  alertName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: colors.text,
  },
  alertDetail: {
    fontSize: FONT_SIZES.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  alertBadge: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  alertBadgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: colors.warning,
  },
});
