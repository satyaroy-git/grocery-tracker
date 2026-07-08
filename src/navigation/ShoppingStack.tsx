import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';
import { ShoppingStackParamList } from './types';

import ShoppingListScreen from '../screens/ShoppingListScreen';
import AddShoppingItemScreen from '../screens/AddShoppingItemScreen';
import PurchaseConfirmScreen from '../screens/PurchaseConfirmScreen';
import RecurringItemsScreen from '../screens/RecurringItemsScreen';

const Stack = createNativeStackNavigator<ShoppingStackParamList>();

export default function ShoppingStack() {
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
        name="ShoppingList"
        component={ShoppingListScreen}
        options={{ title: t.shoppingList }}
      />
      <Stack.Screen
        name="AddShoppingItem"
        component={AddShoppingItemScreen}
        options={{ title: t.addItem }}
      />
      <Stack.Screen
        name="PurchaseConfirm"
        component={PurchaseConfirmScreen}
        options={{ title: t.confirmPurchase }}
      />
      <Stack.Screen
        name="RecurringItems"
        component={RecurringItemsScreen}
        options={{ title: t.recurringItems }}
      />
    </Stack.Navigator>
  );
}
