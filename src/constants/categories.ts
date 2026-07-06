export const DEFAULT_CATEGORIES = [
  'Dairy',
  'Fruits',
  'Vegetables',
  'Grains & Cereals',
  'Snacks',
  'Beverages',
  'Spices & Condiments',
  'Meat & Seafood',
  'Bakery',
  'Frozen',
  'Personal Care',
  'Household',
  'Other',
];

export const UNITS_OF_MEASUREMENT = [
  { label: 'Kilograms (kg)', value: 'kg' },
  { label: 'Grams (g)', value: 'g' },
  { label: 'Litres (L)', value: 'L' },
  { label: 'Millilitres (mL)', value: 'mL' },
  { label: 'Pieces (pcs)', value: 'pcs' },
  { label: 'Packets (pkt)', value: 'pkt' },
  { label: 'Bottles (btl)', value: 'btl' },
  { label: 'Dozen (dz)', value: 'dz' },
  { label: 'Boxes (box)', value: 'box' },
  { label: 'Cans (can)', value: 'can' },
  { label: 'Bags (bag)', value: 'bag' },
];

export const CONSUMPTION_FREQUENCIES = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

export const ONBOARDING_TEMPLATES = [
  { name: 'Rice', category: 'Grains & Cereals', unit: 'kg', defaultQuantity: 5, threshold: 1 },
  { name: 'Wheat Flour (Atta)', category: 'Grains & Cereals', unit: 'kg', defaultQuantity: 5, threshold: 1 },
  { name: 'Milk', category: 'Dairy', unit: 'L', defaultQuantity: 2, threshold: 0.5 },
  { name: 'Eggs', category: 'Dairy', unit: 'pcs', defaultQuantity: 12, threshold: 3 },
  { name: 'Cooking Oil', category: 'Spices & Condiments', unit: 'L', defaultQuantity: 2, threshold: 0.5 },
  { name: 'Sugar', category: 'Grains & Cereals', unit: 'kg', defaultQuantity: 2, threshold: 0.5 },
  { name: 'Salt', category: 'Spices & Condiments', unit: 'kg', defaultQuantity: 1, threshold: 0.25 },
  { name: 'Tea', category: 'Beverages', unit: 'g', defaultQuantity: 250, threshold: 50 },
  { name: 'Coffee', category: 'Beverages', unit: 'g', defaultQuantity: 200, threshold: 50 },
  { name: 'Bread', category: 'Bakery', unit: 'pkt', defaultQuantity: 1, threshold: 0 },
  { name: 'Butter', category: 'Dairy', unit: 'g', defaultQuantity: 500, threshold: 100 },
  { name: 'Onions', category: 'Vegetables', unit: 'kg', defaultQuantity: 2, threshold: 0.5 },
  { name: 'Tomatoes', category: 'Vegetables', unit: 'kg', defaultQuantity: 1, threshold: 0.25 },
  { name: 'Potatoes', category: 'Vegetables', unit: 'kg', defaultQuantity: 2, threshold: 0.5 },
  { name: 'Bananas', category: 'Fruits', unit: 'dz', defaultQuantity: 1, threshold: 0 },
];

export const ALERT_FREQUENCIES = [
  { label: 'Daily', value: 'daily' },
  { label: 'Every 2 days', value: 'every_2_days' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Never', value: 'never' },
];
