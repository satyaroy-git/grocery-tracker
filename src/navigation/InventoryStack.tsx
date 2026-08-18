import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';
import { InventoryStackParamList } from './types';

import ItemDetailScreen from '../screens/ItemDetailScreen';
import AddItemScreen from '../screens/AddItemScreen';
import EditItemScreen from '../screens/EditItemScreen';
import LogUsageScreen from '../screens/LogUsageScreen';
import RestockScreen from '../screens/RestockScreen';
import ScanInvoiceScreen from '../screens/ScanInvoiceScreen';
import BarcodeScanScreen from '../screens/BarcodeScanScreen';
import VoiceCommandScreen from '../screens/VoiceCommandScreen';
import ShelfScanScreen from '../screens/ShelfScanScreen';

// Placeholder for inventory list - we'll use ItemDetailScreen pattern
import InventoryListScreen from '../screens/InventoryListScreen';

const Stack = createNativeStackNavigator<InventoryStackParamList>();

export default function InventoryStack() {
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
        name="InventoryList"
        component={InventoryListScreen}
        options={{ title: t.pantryTitle }}
      />
      <Stack.Screen
        name="AddItem"
        component={AddItemScreen}
        options={{ title: t.addItem }}
      />
      <Stack.Screen
        name="EditItem"
        component={EditItemScreen}
        options={{ title: t.editItem }}
      />
      <Stack.Screen
        name="ItemDetail"
        component={ItemDetailScreen}
        options={{ title: t.itemDetail }}
      />
      <Stack.Screen
        name="LogUsage"
        component={LogUsageScreen}
        options={{ title: t.logUsage }}
      />
      <Stack.Screen
        name="Restock"
        component={RestockScreen}
        options={{ title: t.restock }}
      />
      <Stack.Screen
        name="ScanInvoice"
        component={ScanInvoiceScreen}
        options={{ title: t.scanInvoice }}
      />
      <Stack.Screen
        name="BarcodeScan"
        component={BarcodeScanScreen}
        options={{ title: t.scanBarcode }}
      />
      <Stack.Screen
        name="VoiceCommand"
        component={VoiceCommandScreen}
        options={{ title: language === 'hi' ? 'वॉइस कमांड' : 'Voice Command' }}
      />
      <Stack.Screen
        name="ShelfScan"
        component={ShelfScanScreen}
        options={{ title: language === 'hi' ? 'शेल्फ स्कैन' : 'Shelf Scan' }}
      />
    </Stack.Navigator>
  );
}
