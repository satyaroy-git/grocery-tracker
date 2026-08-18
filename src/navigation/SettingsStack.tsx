import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';
import { SettingsStackParamList } from './types';

import SettingsScreen from '../screens/SettingsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import HouseholdScreen from '../screens/HouseholdScreen';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

function OnboardingRouteScreen() {
  const navigation = useNavigation();
  return <OnboardingScreen onComplete={() => navigation.goBack()} />;
}

export default function SettingsStack() {
  const { colors } = useTheme();
  const { t } = useTranslation();
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
        options={{ title: t.settingsTitle }}
      />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingRouteScreen}
        options={{ title: t.replayGuide }}
      />
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{ title: t.signIn }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ title: t.createAccount }}
      />
      <Stack.Screen
        name="Household"
        component={HouseholdScreen}
        options={{ title: t.household }}
      />
    </Stack.Navigator>
  );
}
