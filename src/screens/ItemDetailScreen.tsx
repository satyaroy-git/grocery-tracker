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
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { getItemById, deleteItem, getConsumptionLogs } from '../database';
import { GroceryItemWithStatus, ConsumptionLog } from '../database';
import { InventoryStackParamList } from '../navigation/types';

type ItemDetailRouteProp = RouteProp<InventoryStackParamList, 'ItemDetail'>;
type ItemDetailNavProp = NativeStackNavigationProp<InventoryStackParamList, 'ItemDetail'>;

export default function ItemDetailScreen() {
  const navigation = useNavigation<ItemDetailNavProp>();
  const route = useRoute<ItemDetailRouteProp>();
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sufficient':
        return { label: 'In Stock', color: COLORS.success, bg: COLORS.successBg };
      case 'low':
        return { label: 'Low Stock', color: COLORS.warning, bg: COLORS.warningBg };
      case 'out_of_stock':
        return { label: 'Out of Stock', color: COLORS.danger, bg: COLORS.dangerBg };
      default:
        return { label: 'Unknown', color: COLORS.textSecondary, bg: COLORS.background };
    }
  };

  const getProgressPercentage = () => {
    if (!item) return 0;
    const maxExpected = item.threshold * 3;
    return Math.min(1, item.currentQuantity / maxExpected);
  };

  const getProgressColor = () => {
    if (!item) return COLORS.success;
    if (item.status === 'out_of_stock') return COLORS.danger;
    if (item.status === 'low') return COLORS.warning;
    return COLORS.success;
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
        return COLORS.success;
      default:
        return COLORS.danger;
    }
  };

  if (loading || !item) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
            {parseFloat(item.currentQuantity.toFixed(2))} {item.unit}
          </Text>
          <Text style={styles.thresholdText}>
            Threshold: {item.threshold} {item.unit}
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

      {/* Consumption Mode */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Consumption Mode</Text>
        <View style={styles.modeRow}>
          <Ionicons
            name={item.consumptionMode === 'auto' ? 'sync-outline' : 'hand-left-outline'}
            size={20}
            color={COLORS.primary}
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
          style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
          onPress={() => navigation.navigate('LogUsage', { itemId: item.id })}
        >
          <Ionicons name="remove-circle-outline" size={22} color={COLORS.surface} />
          <Text style={styles.actionButtonText}>Log Usage</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.success }]}
          onPress={() => navigation.navigate('Restock', { itemId: item.id })}
        >
          <Ionicons name="add-circle-outline" size={22} color={COLORS.surface} />
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
                  {parseFloat(log.quantity.toFixed(2))} {item.unit}
                  {log.type === 'auto' ? ' (auto)' : ''}
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
          <Ionicons name="pencil-outline" size={20} color={COLORS.primary} />
          <Text style={styles.editButtonText}>Edit Item</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
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
  headerCard: {
    backgroundColor: COLORS.surface,
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
    color: COLORS.text,
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
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: SPACING.sm,
  },
  quantityValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
  },
  thresholdText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  daysText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  modeText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.text,
    fontWeight: '500',
  },
  modeDetail: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
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
    color: COLORS.surface,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logInfo: {
    flex: 1,
  },
  logText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  logNote: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  logDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
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
    borderColor: COLORS.primary,
  },
  editButtonText: {
    color: COLORS.primary,
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
    borderColor: COLORS.danger,
  },
  deleteButtonText: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});
