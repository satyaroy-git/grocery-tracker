import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { getSettings } from '../database';
import { RootTabParamList } from './types';

import InventoryStack from './InventoryStack';
import ShoppingStack from './ShoppingStack';
import DashboardStack from './DashboardStack';
import SettingsStack from './SettingsStack';

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function RootNavigator() {
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    async function check() {
      const settings = await getSettings();
      setOnboardingDone(settings.onboardingComplete);
    }
    check();
  }, []);

  if (onboardingDone === null) return null;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
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
