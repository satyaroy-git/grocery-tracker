import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { requestNotificationPermissions, checkAndNotifyLowStock } from './src/utils/notifications';
import { processAutoDeductions } from './src/utils/autoConsumption';
import { COLORS } from './src/constants/theme';

export default function App() {
  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    try {
      // Request notification permissions
      await requestNotificationPermissions();
      
      // Process any pending auto-deductions
      await processAutoDeductions();
      
      // Check for low-stock alerts
      await checkAndNotifyLowStock();
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
