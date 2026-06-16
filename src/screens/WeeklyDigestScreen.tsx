import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, COLORS } from '../constants/theme';
import { getRecentConsumptionLogs, getTotalSpendThisMonth, getExpiringItems } from '../database';
import { ConsumptionLog, GroceryItemWithStatus } from '../database/types';
import { getReorderPredictions, ReorderPrediction } from '../utils/predictions';
import { useTheme } from '../hooks/useTheme';

interface DigestData {
  consumedCount: number;
  restockedCount: number;
  weeklySpend: number;
  expiringItems: GroceryItemWithStatus[];
  predictions: ReorderPrediction[];
  topConsumed: { name: string; quantity: number }[];
}

export default function WeeklyDigestScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DigestData>({
    consumedCount: 0,
    restockedCount: 0,
    weeklySpend: 0,
    expiringItems: [],
    predictions: [],
    topConsumed: [],
  });

  const loadData = useCallback(async () => {
    try {
      const [logs, spend, expiring, predictions] = await Promise.all([
        getRecentConsumptionLogs(7),
        getTotalSpendThisMonth(),
        getExpiringItems(),
        getReorderPredictions(),
      ]);

      const consumptionLogs = logs.filter(
        (log: ConsumptionLog) => log.type === 'manual' || log.type === 'auto'
      );
      const restockLogs = logs.filter((log: ConsumptionLog) => log.type === 'restock');

      const weeklySpend = restockLogs.reduce(
        (sum: number, log: ConsumptionLog) => sum + (log.price ?? 0),
        0
      );

      const itemConsumption: Record<string, number> = {};
      for (const log of consumptionLogs) {
        const key = log.itemId;
        itemConsumption[key] = (itemConsumption[key] ?? 0) + log.quantity;
      }

      const topConsumed = Object.entries(itemConsumption)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      setData({
        consumedCount: consumptionLogs.length,
        restockedCount: restockLogs.length,
        weeklySpend,
        expiringItems: expiring,
        predictions: predictions.filter((p) => p.urgency !== 'ok').slice(0, 5),
        topConsumed,
      });
    } catch (_) { /* silent */ }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return COLORS.danger;
      case 'soon': return COLORS.warning;
      default: return COLORS.success;
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      <Text style={[styles.title, { color: colors.text }]}>This Week&apos;s Summary</Text>

      {/* Stats Cards Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="trending-down-outline" size={28} color={COLORS.primary} />
          <Text style={[styles.statNumber, { color: colors.text }]}>{data.consumedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Items Used</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="add-circle-outline" size={28} color={COLORS.success} />
          <Text style={[styles.statNumber, { color: colors.text }]}>{data.restockedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Restocked</Text>
        </View>
      </View>

      {/* Weekly Spend Card */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="wallet-outline" size={24} color={COLORS.primary} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Weekly Spend</Text>
        </View>
        <Text style={[styles.spendAmount, { color: COLORS.primary }]}>
          Rs. {data.weeklySpend.toFixed(0)}
        </Text>
      </View>

      {/* Expiring Soon Card */}
      {data.expiringItems.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={24} color={COLORS.warning} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Expiring Soon</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{data.expiringItems.length}</Text>
            </View>
          </View>
          {data.expiringItems.slice(0, 5).map((item) => (
            <View key={item.id} style={styles.listItem}>
              <Text style={[styles.listItemName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.listItemDetail, { color: COLORS.warning }]}>
                {item.daysUntilExpiry !== null && item.daysUntilExpiry >= 0
                  ? `${item.daysUntilExpiry}d left`
                  : 'Expired'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Reorder Predictions Card */}
      {data.predictions.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="reload-outline" size={24} color={COLORS.danger} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Running Out Soon</Text>
          </View>
          {data.predictions.map((pred) => (
            <View key={pred.itemId} style={styles.listItem}>
              <Text style={[styles.listItemName, { color: colors.text }]}>{pred.name}</Text>
              <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(pred.urgency) + '20' }]}>
                <Text style={[styles.urgencyText, { color: getUrgencyColor(pred.urgency) }]}>
                  {pred.daysUntilEmpty === 0 ? 'Empty' : `${pred.daysUntilEmpty}d`}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Top Consumed Items */}
      {data.topConsumed.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="flame-outline" size={24} color={COLORS.secondary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Most Used Items</Text>
          </View>
          {data.topConsumed.map((item, index) => (
            <View key={item.name} style={styles.listItem}>
              <View style={styles.rankContainer}>
                <Text style={[styles.rank, { color: colors.textSecondary }]}>#{index + 1}</Text>
                <Text style={[styles.listItemName, { color: colors.text }]}>{item.name}</Text>
              </View>
              <Text style={[styles.listItemDetail, { color: colors.textSecondary }]}>
                {item.quantity}x
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  statNumber: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
  },
  card: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    flex: 1,
  },
  spendAmount: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
  badge: {
    backgroundColor: COLORS.warning,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: '#fff',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '40',
  },
  listItemName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  listItemDetail: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  urgencyBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  urgencyText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rank: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    width: 24,
  },
});
