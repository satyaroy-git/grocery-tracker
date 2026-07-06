import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../constants/theme';
import { InventoryStackParamList } from './types';

import ItemDetailScreen from '../screens/ItemDetailScreen';
import AddItemScreen from '../screens/AddItemScreen';
import EditItemScreen from '../screens/EditItemScreen';
import LogUsageScreen from '../screens/LogUsageScreen';
import RestockScreen from '../screens/RestockScreen';
import ScanInvoiceScreen from '../screens/ScanInvoiceScreen';
import BarcodeScanScreen from '../screens/BarcodeScanScreen';

// Placeholder for inventory list - we'll use ItemDetailScreen pattern
import InventoryListScreen from '../screens/InventoryListScreen';

const Stack = createNativeStackNavigator<InventoryStackParamList>();

export default function InventoryStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="InventoryList"
        component={InventoryListScreen}
        options={{ title: 'My Pantry' }}
      />
      <Stack.Screen
        name="AddItem"
        component={AddItemScreen}
        options={{ title: 'Add Item' }}
      />
      <Stack.Screen
        name="EditItem"
        component={EditItemScreen}
        options={{ title: 'Edit Item' }}
      />
      <Stack.Screen
        name="ItemDetail"
        component={ItemDetailScreen}
        options={{ title: 'Item Details' }}
      />
      <Stack.Screen
        name="LogUsage"
        component={LogUsageScreen}
        options={{ title: 'Log Usage' }}
      />
      <Stack.Screen
        name="Restock"
        component={RestockScreen}
        options={{ title: 'Restock' }}
      />
      <Stack.Screen
        name="ScanInvoice"
        component={ScanInvoiceScreen}
        options={{ title: 'Scan Invoice' }}
      />
      <Stack.Screen
        name="BarcodeScan"
        component={BarcodeScanScreen}
        options={{ title: 'Scan Barcode' }}
      />
    </Stack.Navigator>
  );
}
