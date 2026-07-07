import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { SPACING } from '../constants/theme';
import { getSettings } from '../database';
import { RootTabParamList } from './types';

import InventoryStack from './InventoryStack';
import ShoppingStack from './ShoppingStack';
import DashboardStack from './DashboardStack';
import SettingsStack from './SettingsStack';
import OnboardingScreen from '../screens/OnboardingScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

// Standard Android 3-button nav bar is ~48dp; gesture nav is shorter. We
// don't know which the device uses ahead of time, so this is just a sane
// floor - insets.bottom (the real, accurate value for the current device)
// is always added on top of it, not used instead of it.
const MIN_TAB_BAR_CONTENT_HEIGHT = 56;

export default function RootNavigator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    async function check() {
      const settings = await getSettings();
      setOnboardingDone(settings.onboardingComplete);
    }
    check();
  }, []);

  if (onboardingDone === null) return null;

  // First launch: show the onboarding/welcome guide before the main tab
  // navigator exists at all, so there's nothing to navigate "back" to.
  // Previously this check existed but was never actually acted on - the
  // Tab.Navigator (and the rest of the app) rendered unconditionally
  // regardless of onboardingComplete, so new users never saw this screen.
  if (!onboardingDone) {
    return <OnboardingScreen onComplete={() => setOnboardingDone(true)} />;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        // On Android SDK 54+ edge-to-edge is on by default, so content draws
        // behind the system nav bar/gesture pill. @react-navigation/bottom-tabs
        // v7 normally accounts for this itself, but we set it explicitly here
        // too so the tab bar (and therefore the labels/icons in it) never sit
        // underneath or get clipped by the system nav bar on any device/OS
        // combination.
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: MIN_TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: SPACING.xs,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          switch (route.name) {
            case 'InventoryTab':
              iconName = focused ? 'cube' : 'cube-outline';
              break;
            case 'ShoppingTab':
              iconName = focused ? 'cart' : 'cart-outline';
              break;
            case 'DashboardTab':
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
              break;
            case 'SettingsTab':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="InventoryTab"
        component={InventoryStack}
        options={{ tabBarLabel: 'Pantry' }}
      />
      <Tab.Screen
        name="ShoppingTab"
        component={ShoppingStack}
        options={{ tabBarLabel: 'Shopping' }}
      />
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStack}
        options={{ tabBarLabel: 'Insights' }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}
