import { NavigatorScreenParams } from '@react-navigation/native';

export type InventoryStackParamList = {
  InventoryList: undefined;
  AddItem: undefined;
  EditItem: { itemId: number };
  ItemDetail: { itemId: number };
  LogUsage: { itemId: number; itemName: string };
  Restock: { itemId: number; itemName: string };
  ScanInvoice: undefined;
};

export type ShoppingStackParamList = {
  ShoppingList: undefined;
  AddShoppingItem: undefined;
  PurchaseConfirm: { itemId: number };
};

export type DashboardStackParamList = {
  Insights: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Onboarding: undefined;
};

export type RootTabParamList = {
  InventoryTab: NavigatorScreenParams<InventoryStackParamList>;
  ShoppingTab: NavigatorScreenParams<ShoppingStackParamList>;
  DashboardTab: NavigatorScreenParams<DashboardStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

// For useNavigation typing
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootTabParamList {}
  }
}
