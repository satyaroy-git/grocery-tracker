import React, { useEffect, useCallback } from 'react';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import AppNavigator from './src/navigation/AppNavigator';
import { processAutoDeductions } from './src/utils/autoConsumption';
import { COLORS } from './src/constants/theme';
import { ThemeProvider, useTheme } from './src/hooks/useTheme';

function AppContent() {
  const { colors, isDark } = useTheme();

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

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.primaryDark} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
