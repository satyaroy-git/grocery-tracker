import { NavigatorScreenParams } from '@react-navigation/native';

export type InventoryStackParamList = {
  InventoryList: undefined;
  AddItem: undefined;
  EditItem: { itemId: number };
  ItemDetail: { itemId: number };
  // itemId is optional - LogUsageScreen supports both being opened directly
  // (no preselected item, user searches/picks one) and being opened from
  // ItemDetailScreen for a specific item. Only itemId is needed since the
  // screen reloads full item details itself; itemName was never actually
  // passed by any caller and was never required.
  LogUsage: { itemId?: number } | undefined;
  Restock: { itemId: number };
  ScanInvoice: undefined;
  BarcodeScan: undefined;
  VoiceCommand: undefined;
};

export type ShoppingStackParamList = {
  ShoppingList: undefined;
  AddShoppingItem: undefined;
  PurchaseConfirm: { shoppingItemId: number };
  RecurringItems: undefined;
};

export type DashboardStackParamList = {
  Insights: undefined;
  RecipeSuggestions: undefined;
  WeeklyMealPlan: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Onboarding: undefined;
  SignIn: undefined;
  SignUp: undefined;
  Household: undefined;
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
