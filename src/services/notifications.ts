import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getAllItems, getSettings, updateSettings, getRecurringItems, addToShoppingList } from '../database';
import { GroceryItemWithStatus, RecurringItem } from '../database';

// ─── SETUP ────────────────────────────────────────────────────────────────────

/**
 * Requests notification permissions and sets up the Android notification
 * channel. Should be called once on app launch (idempotent - safe to call
 * multiple times; Android channels are created-or-updated, not duplicated).
 */
export async function setupNotifications(): Promise<boolean> {
  // Request permission (iOS requires explicit permission; Android grants by
  // default on API < 33, requires runtime permission on API 33+)
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted');
    return false;
  }

  // Set up Android notification channel (required for Android 8+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('pantry-alerts', {
      name: 'Pantry Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
    });
  }

  return true;
}

// ─── EXPIRY NOTIFICATIONS ─────────────────────────────────────────────────────

/**
 * Scans all pantry items and schedules local notifications for items expiring
 * within 7 days. Called on app launch and whenever items are added/updated.
 *
 * Strategy: cancel all previously scheduled expiry notifications first, then
 * re-schedule from scratch. This is simpler and more reliable than trying to
 * diff against what was previously scheduled (which expo-notifications doesn't
 * make easy to query by category).
 */
export async function scheduleExpiryAlerts(): Promise<void> {
  try {
    const settings = await getSettings();
    if (!settings.notificationsEnabled) return;

    // Cancel all existing scheduled notifications with our identifier prefix
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.identifier.startsWith('expiry-')) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }

    const items = await getAllItems();
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    for (const item of items) {
      if (!item.expiryDate) continue;

      const expiryDate = new Date(item.expiryDate);
      // Only schedule if expiry is in the future and within 7 days
      if (expiryDate <= now || expiryDate > sevenDaysFromNow) continue;

      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Schedule notification for 8 AM on the day that's 7 days before expiry
      // (or immediately if already within the window)
      const triggerDate = new Date(expiryDate);
      triggerDate.setDate(triggerDate.getDate() - Math.min(daysUntilExpiry, 7));
      triggerDate.setHours(8, 0, 0, 0);

      // If the trigger time is already past (e.g. item expires tomorrow and
      // it's already past 8 AM today), schedule for 5 seconds from now
      const triggerTime = triggerDate.getTime() > now.getTime()
        ? triggerDate
        : new Date(now.getTime() + 5000);

      const daysText = daysUntilExpiry === 1
        ? 'tomorrow'
        : `in ${daysUntilExpiry} days`;

      await Notifications.scheduleNotificationAsync({
        identifier: `expiry-${item.id}`,
        content: {
          title: 'Expiry Alert',
          body: `${item.name} expires ${daysText}! Use it soon or add to your meal plan.`,
          data: { itemId: item.id, type: 'expiry' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerTime,
          channelId: 'pantry-alerts',
        },
      });
    }
  } catch (error) {
    console.error('Failed to schedule expiry alerts:', error);
  }
}

// ─── LOW STOCK NOTIFICATIONS ──────────────────────────────────────────────────

/**
 * Fires an immediate local notification when an item drops below its low-stock
 * threshold. Called from logConsumption/deductQuantity in the database layer.
 */
export async function triggerLowStockAlert(
  itemName: string,
  currentQuantity: number,
  unit: string,
  threshold: number
): Promise<void> {
  try {
    const settings = await getSettings();
    if (!settings.notificationsEnabled) return;

    await Notifications.scheduleNotificationAsync({
      identifier: `lowstock-${Date.now()}`,
      content: {
        title: 'Low Stock Alert',
        body: `${itemName} is running low! Only ${currentQuantity} ${unit} left (threshold: ${threshold} ${unit}).`,
        data: { type: 'low_stock' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(Date.now() + 1000), // 1 second from now (immediate)
        channelId: 'pantry-alerts',
      },
    });
  } catch (error) {
    console.error('Failed to trigger low stock alert:', error);
  }
}

// ─── RECURRING ITEMS ──────────────────────────────────────────────────────────

/**
 * Processes all enabled recurring items whose nextDueDate is today or in the
 * past. For each due item, adds it to the shopping list and advances
 * nextDueDate to the next occurrence.
 *
 * Called on every app launch. Idempotent for a given day since it advances
 * nextDueDate after processing - calling multiple times on the same day won't
 * double-add.
 */
export async function processRecurringItems(): Promise<void> {
  try {
    const { processAndAdvanceRecurringItems } = await import('../database');
    await processAndAdvanceRecurringItems();
  } catch (error) {
    console.error('Failed to process recurring items:', error);
  }
}
