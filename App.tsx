import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import { initDatabase } from './src/database';
import RootNavigator from './src/navigation/RootNavigator';
import { LIGHT_COLORS } from './src/constants/theme';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { I18nProvider } from './src/i18n';
import { setupNotifications, scheduleExpiryAlerts, processRecurringItems } from './src/services/notifications';

// Configure how notifications are presented when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function AppContent() {
  const { colors, isDark } = useTheme();

  // Base react-navigation's own theme (used for screen background flashes,
  // native stack transitions, etc.) off our color palette so it matches
  // every screen instead of defaulting to react-navigation's own light/dark
  // colors, which don't match our brand palette.
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </SafeAreaProvider>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await initDatabase();
        // Request notification permissions and set up the notification channel
        await setupNotifications();
        // Schedule expiry alerts for items expiring within 7 days
        await scheduleExpiryAlerts();
        // Process any recurring shopping list items that are due today
        await processRecurringItems();
      } catch (error) {
        console.error('Failed to initialize:', error);
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  if (!isReady) {
    // ThemeProvider (and therefore the persisted theme preference) isn't
    // available yet since it reads from the DB we're still initializing -
    // this brief loading screen always renders in light mode, which is an
    // acceptable trade-off since it's only shown for a moment on cold start.
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={LIGHT_COLORS.primary} />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: LIGHT_COLORS.background,
  },
});
