export const DEFAULT_CATEGORIES = [
  'Grains & Cereals',
  'Pulses & Lentils',
  'Dairy & Eggs',
  'Vegetables',
  'Fruits',
  'Spices & Condiments',
  'Oils & Ghee',
  'Beverages',
  'Snacks & Biscuits',
  'Meat & Poultry',
  'Seafood',
  'Frozen Foods',
  'Bakery & Bread',
  'Canned & Packed Foods',
  'Dry Fruits & Nuts',
  'Bathroom Cleaning',
  'Floor & Kitchen Cleaning',
  'Laundry',
  'Personal Care',
  'Baby Care',
  'Pet Supplies',
  'Stationery',
  'Other',
];

export const UNITS_OF_MEASUREMENT = [
  { label: 'Kilograms', value: 'kg' },
  { label: 'Grams', value: 'g' },
  { label: 'Liters', value: 'liters' },
  { label: 'Milliliters', value: 'ml' },
  { label: 'Numbers (count)', value: 'nos' },
  { label: 'Pieces', value: 'pieces' },
  { label: 'Packets', value: 'packets' },
  { label: 'Bottles', value: 'bottles' },
  { label: 'Cans', value: 'cans' },
  { label: 'Dozen', value: 'dozen' },
  { label: 'Bags', value: 'bags' },
  { label: 'Boxes', value: 'boxes' },
  { label: 'Bunches', value: 'bunches' },
  { label: 'Rolls', value: 'rolls' },
  { label: 'Bars', value: 'bars' },
  { label: 'Tubes', value: 'tubes' },
  { label: 'Sachets', value: 'sachets' },
  { label: 'Pouches', value: 'pouches' },
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
  // Grains & Cereals
  { name: 'Rice (Basmati)', category: 'Grains & Cereals', unit: 'kg', defaultQuantity: 5, threshold: 1 },
  { name: 'Wheat Flour (Atta)', category: 'Grains & Cereals', unit: 'kg', defaultQuantity: 5, threshold: 1 },
  { name: 'Bread', category: 'Bakery & Bread', unit: 'packets', defaultQuantity: 1, threshold: 1 },
  { name: 'Pasta / Noodles', category: 'Grains & Cereals', unit: 'packets', defaultQuantity: 3, threshold: 1 },
  { name: 'Oats', category: 'Grains & Cereals', unit: 'packets', defaultQuantity: 1, threshold: 1 },

  // Pulses & Lentils
  { name: 'Toor Dal', category: 'Pulses & Lentils', unit: 'kg', defaultQuantity: 1, threshold: 0.25 },
  { name: 'Moong Dal', category: 'Pulses & Lentils', unit: 'kg', defaultQuantity: 1, threshold: 0.25 },
  { name: 'Chana Dal', category: 'Pulses & Lentils', unit: 'kg', defaultQuantity: 1, threshold: 0.25 },
  { name: 'Rajma', category: 'Pulses & Lentils', unit: 'kg', defaultQuantity: 0.5, threshold: 0.25 },

  // Dairy & Eggs
  { name: 'Milk', category: 'Dairy & Eggs', unit: 'liters', defaultQuantity: 2, threshold: 0.5 },
  { name: 'Eggs', category: 'Dairy & Eggs', unit: 'nos', defaultQuantity: 12, threshold: 4 },
  { name: 'Butter', category: 'Dairy & Eggs', unit: 'g', defaultQuantity: 500, threshold: 100 },
  { name: 'Paneer', category: 'Dairy & Eggs', unit: 'g', defaultQuantity: 200, threshold: 100 },
  { name: 'Curd / Yogurt', category: 'Dairy & Eggs', unit: 'g', defaultQuantity: 400, threshold: 200 },
  { name: 'Cheese', category: 'Dairy & Eggs', unit: 'g', defaultQuantity: 200, threshold: 50 },

  // Vegetables
  { name: 'Onions', category: 'Vegetables', unit: 'kg', defaultQuantity: 2, threshold: 0.5 },
  { name: 'Tomatoes', category: 'Vegetables', unit: 'kg', defaultQuantity: 1, threshold: 0.25 },
  { name: 'Potatoes', category: 'Vegetables', unit: 'kg', defaultQuantity: 2, threshold: 0.5 },
  { name: 'Green Chillies', category: 'Vegetables', unit: 'g', defaultQuantity: 100, threshold: 25 },
  { name: 'Ginger', category: 'Vegetables', unit: 'g', defaultQuantity: 100, threshold: 25 },
  { name: 'Garlic', category: 'Vegetables', unit: 'g', defaultQuantity: 100, threshold: 25 },

  // Fruits
  { name: 'Bananas', category: 'Fruits', unit: 'nos', defaultQuantity: 6, threshold: 2 },
  { name: 'Apples', category: 'Fruits', unit: 'nos', defaultQuantity: 4, threshold: 2 },
  { name: 'Lemons', category: 'Fruits', unit: 'nos', defaultQuantity: 6, threshold: 2 },

  // Spices & Condiments
  { name: 'Salt', category: 'Spices & Condiments', unit: 'kg', defaultQuantity: 1, threshold: 0.2 },
  { name: 'Sugar', category: 'Spices & Condiments', unit: 'kg', defaultQuantity: 1, threshold: 0.2 },
  { name: 'Turmeric Powder', category: 'Spices & Condiments', unit: 'g', defaultQuantity: 200, threshold: 50 },
  { name: 'Red Chilli Powder', category: 'Spices & Condiments', unit: 'g', defaultQuantity: 200, threshold: 50 },
  { name: 'Garam Masala', category: 'Spices & Condiments', unit: 'g', defaultQuantity: 100, threshold: 25 },
  { name: 'Cumin Seeds (Jeera)', category: 'Spices & Condiments', unit: 'g', defaultQuantity: 100, threshold: 25 },

  // Oils & Ghee
  { name: 'Cooking Oil (Sunflower/Mustard)', category: 'Oils & Ghee', unit: 'liters', defaultQuantity: 2, threshold: 0.5 },
  { name: 'Ghee', category: 'Oils & Ghee', unit: 'g', defaultQuantity: 500, threshold: 100 },
  { name: 'Olive Oil', category: 'Oils & Ghee', unit: 'ml', defaultQuantity: 500, threshold: 100 },

  // Beverages
  { name: 'Tea (Chai)', category: 'Beverages', unit: 'g', defaultQuantity: 250, threshold: 50 },
  { name: 'Coffee', category: 'Beverages', unit: 'g', defaultQuantity: 200, threshold: 50 },
  { name: 'Drinking Water (Bottles)', category: 'Beverages', unit: 'bottles', defaultQuantity: 5, threshold: 2 },

  // Snacks
  { name: 'Biscuits', category: 'Snacks & Biscuits', unit: 'packets', defaultQuantity: 3, threshold: 1 },
  { name: 'Maggi Noodles', category: 'Snacks & Biscuits', unit: 'packets', defaultQuantity: 4, threshold: 2 },

  // Meat
  { name: 'Chicken', category: 'Meat & Poultry', unit: 'kg', defaultQuantity: 1, threshold: 0.5 },

  // Bathroom Cleaning
  { name: 'Toilet Cleaner (Harpic)', category: 'Bathroom Cleaning', unit: 'bottles', defaultQuantity: 1, threshold: 1 },
  { name: 'Bathroom Floor Cleaner', category: 'Bathroom Cleaning', unit: 'bottles', defaultQuantity: 1, threshold: 1 },
  { name: 'Toilet Brush', category: 'Bathroom Cleaning', unit: 'nos', defaultQuantity: 1, threshold: 1 },
  { name: 'Air Freshener', category: 'Bathroom Cleaning', unit: 'nos', defaultQuantity: 1, threshold: 1 },

  // Floor & Kitchen Cleaning
  { name: 'Floor Cleaner (Lizol/Domex)', category: 'Floor & Kitchen Cleaning', unit: 'bottles', defaultQuantity: 1, threshold: 1 },
  { name: 'Dishwash Liquid (Vim)', category: 'Floor & Kitchen Cleaning', unit: 'ml', defaultQuantity: 500, threshold: 100 },
  { name: 'Dishwash Bar', category: 'Floor & Kitchen Cleaning', unit: 'bars', defaultQuantity: 2, threshold: 1 },
  { name: 'Kitchen Wipes / Scrubber', category: 'Floor & Kitchen Cleaning', unit: 'nos', defaultQuantity: 3, threshold: 1 },
  { name: 'Garbage Bags', category: 'Floor & Kitchen Cleaning', unit: 'rolls', defaultQuantity: 2, threshold: 1 },
  { name: 'Broom / Mop', category: 'Floor & Kitchen Cleaning', unit: 'nos', defaultQuantity: 1, threshold: 1 },

  // Laundry
  { name: 'Detergent Powder (Surf/Tide)', category: 'Laundry', unit: 'kg', defaultQuantity: 1, threshold: 0.25 },
  { name: 'Fabric Softener', category: 'Laundry', unit: 'ml', defaultQuantity: 500, threshold: 100 },

  // Personal Care
  { name: 'Soap / Body Wash', category: 'Personal Care', unit: 'nos', defaultQuantity: 3, threshold: 1 },
  { name: 'Shampoo', category: 'Personal Care', unit: 'ml', defaultQuantity: 200, threshold: 50 },
  { name: 'Toothpaste', category: 'Personal Care', unit: 'tubes', defaultQuantity: 1, threshold: 1 },
  { name: 'Tissue Paper / Napkins', category: 'Personal Care', unit: 'rolls', defaultQuantity: 4, threshold: 1 },
  { name: 'Hand Wash', category: 'Personal Care', unit: 'ml', defaultQuantity: 250, threshold: 50 },
];
