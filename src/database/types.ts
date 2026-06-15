export type ConsumptionMode = 'manual' | 'auto';
export type ConsumptionFrequency = 'daily' | 'weekly' | 'monthly';
export type AlertFrequency = 'instant' | 'daily' | 'weekly';
export type ItemStatus = 'sufficient' | 'low' | 'out_of_stock';

export interface GroceryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentQuantity: number;
  threshold: number;
  consumptionMode: ConsumptionMode;
  autoConsumptionRate: number | null;
  autoConsumptionFrequency: ConsumptionFrequency | null;
  lastAutoDeduction: string | null;
  expiryDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsumptionLog {
  id: string;
  itemId: string;
  quantity: number;
  type: 'manual' | 'auto' | 'restock';
  note: string | null;
  createdAt: string;
}

export interface ShoppingListItem {
  id: string;
  itemId: string | null;
  name: string;
  category: string;
  unit: string;
  quantityNeeded: number;
  isPurchased: boolean;
  isManuallyAdded: boolean;
  createdAt: string;
}

export interface AppSettings {
  id: string;
  defaultConsumptionMode: ConsumptionMode;
  alertFrequency: AlertFrequency;
  onboardingCompleted: boolean;
  lastNotificationCheck: string | null;
}

export interface Category {
  id: string;
  name: string;
  isCustom: boolean;
}

export interface GroceryItemWithStatus extends GroceryItem {
  status: ItemStatus;
  daysUntilEmpty: number | null;
  daysUntilExpiry: number | null;
  expiryStatus: 'fresh' | 'expiring_soon' | 'expired' | null;
}

export interface ShoppingTemplate {
  id: string;
  name: string;
  items: ShoppingTemplateItem[];
  createdAt: string;
  lastUsed: string | null;
}

export interface ShoppingTemplateItem {
  name: string;
  category: string;
  unit: string;
  quantity: number;
}
