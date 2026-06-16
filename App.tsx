import React, { useEffect, useCallback } from 'react';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import AppNavigator from './src/navigation/AppNavigator';
import { processAutoDeductions } from './src/utils/autoConsumption';
import { COLORS } from './src/constants/theme';
import { ThemeProvider } from './src/hooks/useTheme';

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    try {
      await processAutoDeductions();
      try {
        const notifications = require('./src/utils/notifications');
        await notifications.requestNotificationPermissions();
        await notifications.checkAndNotifyLowStock();
      } catch (e) {
        // silent
      }
    } catch (error) {
      // error handled silently
    }
  }

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
        <AppNavigator />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
