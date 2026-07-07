import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { SettingsStackParamList } from './types';

import SettingsScreen from '../screens/SettingsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import HouseholdScreen from '../screens/HouseholdScreen';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

// OnboardingScreen expects an onComplete callback (it's normally rendered
// standalone by RootNavigator on first launch, with no "back" screen to
// return to). When replayed from Settings > "Replay Welcome Guide", there
// IS a screen to go back to, so this thin wrapper supplies that behavior.
function OnboardingRouteScreen() {
  const navigation = useNavigation();
  return <OnboardingScreen onComplete={() => navigation.goBack()} />;
}

export default function SettingsStack() {
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
        name="SettingsMain"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingRouteScreen}
        options={{ title: 'Welcome Guide' }}
      />
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{ title: 'Sign In' }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ title: 'Create Account' }}
      />
      <Stack.Screen
        name="Household"
        component={HouseholdScreen}
        options={{ title: 'Household' }}
      />
    </Stack.Navigator>
  );
}
