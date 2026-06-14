export const DEFAULT_CATEGORIES = [
  'Grains & Cereals',
  'Dairy',
  'Vegetables',
  'Fruits',
  'Spices & Condiments',
  'Beverages',
  'Snacks',
  'Meat & Poultry',
  'Seafood',
  'Frozen Foods',
  'Bakery',
  'Canned Goods',
  'Oils & Fats',
  'Cleaning Supplies',
  'Personal Care',
  'Other',
];

export const UNITS_OF_MEASUREMENT = [
  { label: 'Kilograms', value: 'kg' },
  { label: 'Grams', value: 'g' },
  { label: 'Liters', value: 'liters' },
  { label: 'Milliliters', value: 'ml' },
  { label: 'Pieces', value: 'pieces' },
  { label: 'Packets', value: 'packets' },
  { label: 'Bottles', value: 'bottles' },
  { label: 'Cans', value: 'cans' },
  { label: 'Dozen', value: 'dozen' },
  { label: 'Bags', value: 'bags' },
];

export const CONSUMPTION_FREQUENCIES = [
  { label: 'Per Day', value: 'daily' },
  { label: 'Per Week', value: 'weekly' },
  { label: 'Per Month', value: 'monthly' },
];

export const ALERT_FREQUENCIES = [
  { label: 'Instant', value: 'instant' },
  { label: 'Daily Digest', value: 'daily' },
  { label: 'Weekly Summary', value: 'weekly' },
];

export const ONBOARDING_TEMPLATES = [
  { name: 'Rice', category: 'Grains & Cereals', unit: 'kg', defaultQuantity: 5, threshold: 1 },
  { name: 'Wheat Flour', category: 'Grains & Cereals', unit: 'kg', defaultQuantity: 2, threshold: 0.5 },
  { name: 'Milk', category: 'Dairy', unit: 'liters', defaultQuantity: 2, threshold: 0.5 },
  { name: 'Eggs', category: 'Dairy', unit: 'pieces', defaultQuantity: 12, threshold: 3 },
  { name: 'Butter', category: 'Dairy', unit: 'g', defaultQuantity: 500, threshold: 100 },
  { name: 'Onions', category: 'Vegetables', unit: 'kg', defaultQuantity: 2, threshold: 0.5 },
  { name: 'Tomatoes', category: 'Vegetables', unit: 'kg', defaultQuantity: 1, threshold: 0.25 },
  { name: 'Potatoes', category: 'Vegetables', unit: 'kg', defaultQuantity: 2, threshold: 0.5 },
  { name: 'Garlic', category: 'Spices & Condiments', unit: 'pieces', defaultQuantity: 5, threshold: 2 },
  { name: 'Salt', category: 'Spices & Condiments', unit: 'kg', defaultQuantity: 1, threshold: 0.2 },
  { name: 'Sugar', category: 'Spices & Condiments', unit: 'kg', defaultQuantity: 1, threshold: 0.2 },
  { name: 'Cooking Oil', category: 'Oils & Fats', unit: 'liters', defaultQuantity: 2, threshold: 0.5 },
  { name: 'Tea', category: 'Beverages', unit: 'g', defaultQuantity: 250, threshold: 50 },
  { name: 'Coffee', category: 'Beverages', unit: 'g', defaultQuantity: 200, threshold: 50 },
  { name: 'Bread', category: 'Bakery', unit: 'packets', defaultQuantity: 2, threshold: 1 },
  { name: 'Chicken', category: 'Meat & Poultry', unit: 'kg', defaultQuantity: 1, threshold: 0.25 },
  { name: 'Pasta', category: 'Grains & Cereals', unit: 'packets', defaultQuantity: 3, threshold: 1 },
  { name: 'Cheese', category: 'Dairy', unit: 'g', defaultQuantity: 200, threshold: 50 },
  { name: 'Bananas', category: 'Fruits', unit: 'pieces', defaultQuantity: 6, threshold: 2 },
  { name: 'Apples', category: 'Fruits', unit: 'pieces', defaultQuantity: 6, threshold: 2 },
];
