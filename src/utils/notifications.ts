import { Platform } from 'react-native';
import { getLowStockItems, getSettings, updateSettings } from '../database';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  console.log('expo-notifications not available');
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return false;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('low-stock', {
        name: 'Low Stock Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    return true;
  } catch (e) {
    console.log('Notification permissions error:', e);
    return false;
  }
}

export async function checkAndNotifyLowStock(): Promise<void> {
  if (!Notifications) return;
  try {
    const settings = await getSettings();
    const now = new Date().toISOString();

    if (settings.lastNotificationCheck) {
      const lastCheck = new Date(settings.lastNotificationCheck);
      const hoursSinceCheck = (Date.now() - lastCheck.getTime()) / (1000 * 60 * 60);
      switch (settings.alertFrequency) {
        case 'daily': if (hoursSinceCheck < 24) return; break;
        case 'weekly': if (hoursSinceCheck < 168) return; break;
        case 'instant': break;
      }
    }

    const lowStockItems = await getLowStockItems();
    if (lowStockItems.length === 0) return;

    const outOfStock = lowStockItems.filter((i) => i.currentQuantity <= 0);
    const runningLow = lowStockItems.filter((i) => i.currentQuantity > 0);

    if (outOfStock.length > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Out of Stock!',
          body: outOfStock.length === 1
            ? `${outOfStock[0].name} is out of stock.`
            : `${outOfStock.length} items are out of stock: ${outOfStock.slice(0, 3).map((i: any) => i.name).join(', ')}${outOfStock.length > 3 ? '...' : ''}`,
          data: { type: 'low-stock' },
        },
        trigger: null,
      });
    }

    if (runningLow.length > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Running Low',
          body: runningLow.length === 1
            ? `${runningLow[0].name} is running low (${runningLow[0].currentQuantity} ${runningLow[0].unit} left).`
            : `${runningLow.length} items running low: ${runningLow.slice(0, 3).map((i: any) => i.name).join(', ')}${runningLow.length > 3 ? '...' : ''}`,
          data: { type: 'low-stock' },
        },
        trigger: null,
      });
    }

    await updateSettings({ lastNotificationCheck: now });
  } catch (e) {
    console.log('Low stock notification error:', e);
  }
}

export async function scheduleAutoDeductionCheck(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Daily Stock Check',
        body: 'Checking your pantry levels...',
        data: { type: 'auto-check' },
      },
      trigger: { hour: 9, minute: 0, repeats: true },
    });
  } catch (e) {
    console.log('Schedule notification error:', e);
  }
}
