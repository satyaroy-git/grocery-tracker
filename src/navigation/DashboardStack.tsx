import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { DashboardStackParamList } from './types';

import InsightsScreen from '../screens/InsightsScreen';
import RecipeSuggestionsScreen from '../screens/RecipeSuggestionsScreen';

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
      <Stack.Screen
        name="RecipeSuggestions"
        component={RecipeSuggestionsScreen}
        options={{ title: 'Recipe Suggestions' }}
      />
    </Stack.Navigator>
  );
}
