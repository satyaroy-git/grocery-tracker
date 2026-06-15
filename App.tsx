import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { processAutoDeductions } from './src/utils/autoConsumption';
import { COLORS } from './src/constants/theme';

export default function App() {
  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    try {
      // Process any pending auto-deductions
      await processAutoDeductions();

      // Try to set up notifications (may fail in Expo Go)
      try {
        const notifications = require('./src/utils/notifications');
        await notifications.requestNotificationPermissions();
        await notifications.checkAndNotifyLowStock();
      } catch (e) {
        console.log('Notifications not available in this environment');
      }
    } catch (error) {
      console.error('App initialization error:', error);
    }
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
