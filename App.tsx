import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { initDatabase } from './src/database';
import RootNavigator from './src/navigation/RootNavigator';
import { LIGHT_COLORS } from './src/constants/theme';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

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
      } catch (error) {
        console.error('Failed to initialize database:', error);
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
      <AppContent />
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
