import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';
import { DashboardStackParamList } from './types';

import InsightsScreen from '../screens/InsightsScreen';
import RecipeSuggestionsScreen from '../screens/RecipeSuggestionsScreen';
import WeeklyMealPlanScreen from '../screens/WeeklyMealPlanScreen';

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export default function DashboardStack() {
  const { colors } = useTheme();
  const { t, language } = useTranslation();
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
        options={{ title: t.insightsTitle }}
      />
      <Stack.Screen
        name="RecipeSuggestions"
        component={RecipeSuggestionsScreen}
        options={{ title: t.recipeSuggestions }}
      />
      <Stack.Screen
        name="WeeklyMealPlan"
        component={WeeklyMealPlanScreen}
        options={{ title: language === 'hi' ? 'साप्ताहिक मील प्लान' : 'Weekly Meal Plan' }}
      />
    </Stack.Navigator>
  );
}
