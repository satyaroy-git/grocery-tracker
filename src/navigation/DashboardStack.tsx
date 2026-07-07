import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { DashboardStackParamList } from './types';

import InsightsScreen from '../screens/InsightsScreen';

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export default function DashboardStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="Insights"
        component={InsightsScreen}
        options={{ title: 'Insights' }}
      />
    </Stack.Navigator>
  );
}
