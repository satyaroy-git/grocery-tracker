import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';

import { RootStackParamList, MainTabParamList, DashboardStackParamList, InventoryStackParamList, ShoppingStackParamList } from './types';
import { COLORS } from '../constants/theme';
import { isOnboardingCompleted } from '../database';
import { useTheme } from '../hooks/useTheme';

import DashboardScreen from '../screens/DashboardScreen';
import ItemListScreen from '../screens/ItemListScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import AddItemScreen from '../screens/AddItemScreen';
import EditItemScreen from '../screens/EditItemScreen';
import LogUsageScreen from '../screens/LogUsageScreen';
import RestockScreen from '../screens/RestockScreen';
import ShoppingListScreen from '../screens/ShoppingListScreen';
import AddShoppingItemScreen from '../screens/AddShoppingItemScreen';
import PurchaseConfirmScreen from '../screens/PurchaseConfirmScreen';
import InsightsScreen from '../screens/InsightsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

import BulkImportScreen from '../screens/BulkImportScreen';
import BarcodeScannerScreen from '../screens/BarcodeScannerScreen';
import RecipeSuggestionsScreen from '../screens/RecipeSuggestionsScreen';

import ShoppingTemplatesScreen from '../screens/ShoppingTemplatesScreen';
import FamilySharingScreen from '../screens/FamilySharingScreen';
import WeeklyDigestScreen from '../screens/WeeklyDigestScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const InventoryStack = createNativeStackNavigator<InventoryStackParamList>();
const ShoppingStack = createNativeStackNavigator<ShoppingStackParamList>();

function DashboardStackNavigator() {
  const { colors } = useTheme();
  return (
    <DashboardStack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '600', fontFamily: 'Poppins_600SemiBold' } }}>
      <DashboardStack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'PantryPal', headerTitleStyle: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#fff' } }} />
      <DashboardStack.Screen name="LogUsage" component={LogUsageScreen} options={{ title: 'Log Usage' }} />
      <DashboardStack.Screen name="Restock" component={RestockScreen} options={{ title: 'Restock Item' }} />
      <DashboardStack.Screen name="WeeklyDigest" component={WeeklyDigestScreen} options={{ title: 'Weekly Summary' }} />
    </DashboardStack.Navigator>
  );
}

function InventoryStackNavigator() {
  const { colors } = useTheme();
  return (
    <InventoryStack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '600', fontFamily: 'Poppins_600SemiBold' } }}>
      <InventoryStack.Screen name="ItemList" component={ItemListScreen} options={{ title: 'My Pantry' }} />
      <InventoryStack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: 'Item Details' }} />
      <InventoryStack.Screen name="AddItem" component={AddItemScreen} options={{ title: 'Add Item' }} />
      <InventoryStack.Screen name="EditItem" component={EditItemScreen} options={{ title: 'Edit Item' }} />
      <InventoryStack.Screen name="LogUsage" component={LogUsageScreen} options={{ title: 'Log Usage' }} />
      <InventoryStack.Screen name="Restock" component={RestockScreen} options={{ title: 'Restock Item' }} />
      <InventoryStack.Screen name="BulkImport" component={BulkImportScreen} options={{ title: 'Quick Import' }} />
      <InventoryStack.Screen name="BarcodeScanner" component={BarcodeScannerScreen} options={{ title: 'Scan Barcode', headerShown: false }} />
      <InventoryStack.Screen name="RecipeSuggestions" component={RecipeSuggestionsScreen} options={{ title: 'Recipes', headerShown: false }} />
    </InventoryStack.Navigator>
  );
}

function ShoppingStackNavigator() {
  const { colors } = useTheme();
  return (
    <ShoppingStack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '600', fontFamily: 'Poppins_600SemiBold' } }}>
      <ShoppingStack.Screen name="ShoppingList" component={ShoppingListScreen} options={{ title: 'Shopping List' }} />
      <ShoppingStack.Screen name="AddShoppingItem" component={AddShoppingItemScreen} options={{ title: 'Add to List' }} />
      <ShoppingStack.Screen name="PurchaseConfirm" component={PurchaseConfirmScreen} options={{ title: 'Confirm Purchase' }} />
      <ShoppingStack.Screen name="ShoppingTemplates" component={ShoppingTemplatesScreen} options={{ title: 'Templates' }} />
    </ShoppingStack.Navigator>
  );
}

function MainTabNavigator() {
  const { colors, isDark } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.disabled,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: 4, height: 60 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500', fontFamily: 'Poppins_500Medium' },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          switch (route.name) {
            case 'DashboardTab': iconName = focused ? 'home' : 'home-outline'; break;
            case 'InventoryTab': iconName = focused ? 'list' : 'list-outline'; break;
            case 'ShoppingTab': iconName = focused ? 'cart' : 'cart-outline'; break;
            case 'InsightsTab': iconName = focused ? 'stats-chart' : 'stats-chart-outline'; break;
            case 'FamilyTab': iconName = focused ? 'people' : 'people-outline'; break;
            case 'SettingsTab': iconName = focused ? 'settings' : 'settings-outline'; break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="DashboardTab" component={DashboardStackNavigator} options={{ title: 'Home' }} />
      <Tab.Screen name="InventoryTab" component={InventoryStackNavigator} options={{ title: 'Pantry' }} />
      <Tab.Screen name="ShoppingTab" component={ShoppingStackNavigator} options={{ title: 'Shop' }} />
      <Tab.Screen name="InsightsTab" component={InsightsScreen} options={{ title: 'Insights', headerShown: true, headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff' }} />
      <Tab.Screen name="FamilyTab" component={FamilySharingScreen} options={{ title: 'Family', headerShown: true, headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', headerTitle: 'Family Sharing' }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ title: 'Settings', headerShown: true, headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { colors, isDark } = useTheme();

  useEffect(() => { checkOnboarding(); }, []);

  async function checkOnboarding() {
    try {
      const completed = await isOnboardingCompleted();
      setShowOnboarding(!completed);
    } catch (error) { setShowOnboarding(true); }
    finally { setIsLoading(false); }
  }

  if (isLoading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <NavigationContainer theme={{ dark: isDark, fonts: { regular: { fontFamily: 'Poppins_400Regular', fontWeight: '400' }, medium: { fontFamily: 'Poppins_500Medium', fontWeight: '500' }, bold: { fontFamily: 'Poppins_700Bold', fontWeight: '700' }, heavy: { fontFamily: 'Poppins_700Bold', fontWeight: '700' } }, colors: { primary: colors.primary, background: colors.background, card: colors.surface, text: colors.text, border: colors.border, notification: colors.danger } }}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {showOnboarding ? <RootStack.Screen name="Onboarding" component={OnboardingScreen} /> : null}
        <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
