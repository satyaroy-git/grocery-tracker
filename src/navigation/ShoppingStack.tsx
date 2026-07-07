import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { ShoppingStackParamList } from './types';

import ShoppingListScreen from '../screens/ShoppingListScreen';
import AddShoppingItemScreen from '../screens/AddShoppingItemScreen';
import PurchaseConfirmScreen from '../screens/PurchaseConfirmScreen';

const Stack = createNativeStackNavigator<ShoppingStackParamList>();

export default function ShoppingStack() {
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
        name="ShoppingList"
        component={ShoppingListScreen}
        options={{ title: 'Shopping List' }}
      />
      <Stack.Screen
        name="AddShoppingItem"
        component={AddShoppingItemScreen}
        options={{ title: 'Add Item' }}
      />
      <Stack.Screen
        name="PurchaseConfirm"
        component={PurchaseConfirmScreen}
        options={{ title: 'Confirm Purchase' }}
      />
    </Stack.Navigator>
  );
}
