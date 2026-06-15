import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};

export type MainTabParamList = {
  DashboardTab: NavigatorScreenParams<DashboardStackParamList>;
  InventoryTab: NavigatorScreenParams<InventoryStackParamList>;
  ShoppingTab: NavigatorScreenParams<ShoppingStackParamList>;
  InsightsTab: undefined;
  FamilyTab: undefined;
  SettingsTab: undefined;
};

export type DashboardStackParamList = {
  Dashboard: undefined;
  LogUsage: { itemId?: string };
  Restock: { itemId: string };
};

export type InventoryStackParamList = {
  ItemList: undefined;
  ItemDetail: { itemId: string };
  AddItem: undefined;
  EditItem: { itemId: string };
  LogUsage: { itemId?: string };
  Restock: { itemId: string };
  BulkImport: undefined;
  BarcodeScanner: undefined;
  RecipeSuggestions: undefined;
};

export type ShoppingStackParamList = {
  ShoppingList: undefined;
  AddShoppingItem: undefined;
  PurchaseConfirm: { shoppingItemId: string };
  ShoppingTemplates: undefined;
};
