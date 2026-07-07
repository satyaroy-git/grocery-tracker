import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { getItemById, deleteItem, getConsumptionLogs } from '../database';
import { GroceryItemWithStatus, ConsumptionLog } from '../database';
import { InventoryStackParamList } from '../navigation/types';
import { formatMoney, formatQuantity } from '../utils/numberFormat';

type ItemDetailRouteProp = RouteProp<InventoryStackParamList, 'ItemDetail'>;
type ItemDetailNavProp = NativeStackNavigationProp<InventoryStackParamList, 'ItemDetail'>;

export default function ItemDetailScreen() {
  const navigation = useNavigation<ItemDetailNavProp>();
  const route = useRoute<ItemDetailRouteProp>();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { itemId } = route.params;

  const [item, setItem] = useState<GroceryItemWithStatus | null>(null);
  const [logs, setLogs] = useState<ConsumptionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [itemId])
  );

  const loadData = async () => {
    try {
      const [itemData, logsData] = await Promise.all([
        getItemById(itemId),
        getConsumptionLogs(itemId, 20),
      ]);
      setItem(itemData);
      setLogs(logsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load item details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItem(itemId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item.');
            }
          },
        },
      ]
    );
  };

  // NOTE: ItemStatus (see database/index.ts computeStatus) only ever produces
  // 'ok' | 'low' | 'empty'. This previously checked for 'sufficient' /
  // 'out_of_stock', which never match, so the badge always fell through to
  // "Unknown" regardless of actual stock level.
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return { label: 'In Stock', color: colors.success, bg: colors.successBg };
      case 'low':
        return { label: 'Low Stock', color: colors.warning, bg: colors.warningBg };
      case 'empty':
        return { label: 'Out of Stock', color: colors.danger, bg: colors.dangerBg };
      default:
        return { label: 'Unknown', color: colors.textSecondary, bg: colors.background };
    }
  };

  const getProgressPercentage = () => {
    if (!item) return 0;
    const maxExpected = item.threshold * 3;
    return Math.min(1, item.currentQuantity / maxExpected);
  };

  const getProgressColor = () => {
    if (!item) return colors.success;
    if (item.status === 'empty') return colors.danger;
    if (item.status === 'low') return colors.warning;
    return colors.success;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'manual':
        return 'remove-circle-outline';
      case 'auto':
        return 'sync-outline';
      case 'restock':
        return 'add-circle-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'restock':
        return colors.success;
      default:
        return colors.danger;
    }
  };

  if (loading || !item) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const statusBadge = getStatusBadge(item.status);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
            <Text style={[styles.statusText, { color: statusBadge.color }]}>
              {statusBadge.label}
            </Text>
          </View>
        </View>
        <Text style={styles.categoryText}>{item.category}</Text>
      </View>

      {/* Quantity Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Stock Level</Text>
        <View style={styles.quantityRow}>
          <Text style={styles.quantityValue}>
            {formatQuantity(item.currentQuantity)} {item.unit}
          </Text>
          <Text style={styles.thresholdText}>
            Threshold: {formatQuantity(item.threshold)} {item.unit}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${getProgressPercentage() * 100}%`,
                backgroundColor: getProgressColor(),
              },
            ]}
          />
        </View>
        {item.daysUntilEmpty !== null && (
          <Text style={styles.daysText}>
            ~{item.daysUntilEmpty} days until empty
          </Text>
        )}
      </View>

      {/* Price & Expiry - only rendered if at least one is set, since both are optional */}
      {(item.price !== null || item.expiryDate !== null) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Purchase Details</Text>
          {item.price !== null && (
            <View style={styles.detailRow}>
              <Ionicons name="pricetag-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.detailValue}>₹{formatMoney(item.price)}</Text>
            </View>
          )}
          {item.expiryDate !== null && (
            <View style={styles.detailRow}>
              <Ionicons
                name={item.isExpired ? 'alert-circle' : 'calendar-outline'}
                size={18}
                color={item.isExpired ? colors.danger : item.isExpiringSoon ? colors.warning : colors.textSecondary}
              />
              <Text style={styles.detailLabel}>Expiry</Text>
              <Text
                style={[
                  styles.detailValue,
                  item.isExpired && { color: colors.danger },
                  item.isExpiringSoon && !item.isExpired && { color: colors.warning },
                ]}
              >
                {new Date(item.expiryDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
                {item.isExpired && ' (Expired)'}
                {item.isExpiringSoon && !item.isExpired && ` (${item.daysUntilExpiry}d left)`}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Consumption Mode */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Consumption Mode</Text>
        <View style={styles.modeRow}>
          <Ionicons
            name={item.consumptionMode === 'auto' ? 'sync-outline' : 'hand-left-outline'}
            size={20}
            color={colors.primary}
          />
          <Text style={styles.modeText}>
            {item.consumptionMode === 'auto' ? 'Automatic' : 'Manual'}
          </Text>
        </View>
        {item.consumptionMode === 'auto' && item.autoConsumptionRate && (
          <Text style={styles.modeDetail}>
            Rate: {item.autoConsumptionRate} {item.unit} / {item.autoConsumptionFrequency}
          </Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('LogUsage', { itemId: item.id })}
        >
          <Ionicons name="remove-circle-outline" size={22} color={colors.surface} />
          <Text style={styles.actionButtonText}>Log Usage</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.success }]}
          onPress={() => navigation.navigate('Restock', { itemId: item.id })}
        >
          <Ionicons name="add-circle-outline" size={22} color={colors.surface} />
          <Text style={styles.actionButtonText}>Restock</Text>
        </TouchableOpacity>
      </View>

      {/* Activity Log */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Activity</Text>
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>No activity yet</Text>
        ) : (
          logs.slice(0, 10).map((log) => (
            <View key={log.id} style={styles.logItem}>
              <Ionicons name={getLogIcon(log.type)} size={18} color={getLogColor(log.type)} />
              <View style={styles.logInfo}>
                <Text style={styles.logText}>
                  {log.type === 'restock' ? '+' : '-'}
                  {formatQuantity(log.quantity)} {item.unit}
                  {log.type === 'auto' ? ' (auto)' : ''}
                  {log.price !== null && log.price !== undefined ? ` · ₹${formatMoney(log.price)}` : ''}
                </Text>
                {log.note && <Text style={styles.logNote}>{log.note}</Text>}
              </View>
              <Text style={styles.logDate}>{formatDate(log.createdAt)}</Text>
            </View>
          ))
        )}
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditItem', { itemId: item.id })}
        >
          <Ionicons name="pencil-outline" size={20} color={colors.primary} />
          <Text style={styles.editButtonText}>Edit Item</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
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
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  categoryText: {
    fontSize: FONT_SIZES.md,
    color: colors.textSecondary,
    marginTop: SPACING.xs,
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
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: SPACING.sm,
  },
  quantityValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  thresholdText: {
    fontSize: FONT_SIZES.sm,
    color: colors.textSecondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  daysText: {
    fontSize: FONT_SIZES.sm,
    color: colors.textSecondary,
    marginTop: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  detailLabel: {
    fontSize: FONT_SIZES.md,
    color: colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: colors.text,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  modeText: {
    fontSize: FONT_SIZES.lg,
    color: colors.text,
    fontWeight: '500',
  },
  modeDetail: {
    fontSize: FONT_SIZES.md,
    color: colors.textSecondary,
    marginTop: SPACING.xs,
    marginLeft: SPACING.lg + SPACING.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.sm,
  },
  actionButtonText: {
    color: colors.surface,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logInfo: {
    flex: 1,
  },
  logText: {
    fontSize: FONT_SIZES.md,
    color: colors.text,
    fontWeight: '500',
  },
  logNote: {
    fontSize: FONT_SIZES.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logDate: {
    fontSize: FONT_SIZES.xs,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editButtonText: {
    color: colors.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});
