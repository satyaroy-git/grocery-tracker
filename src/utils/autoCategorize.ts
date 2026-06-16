/**
 * Auto-detect category based on item name.
 * Returns the best matching category or null if no match found.
 */

const CATEGORY_RULES: { keywords: string[]; category: string }[] = [
  // Grains & Cereals
  { keywords: ['rice', 'basmati', 'atta', 'wheat', 'flour', 'maida', 'suji', 'rava', 'semolina', 'oats', 'cereal', 'cornflakes', 'muesli', 'pasta', 'noodle', 'maggi', 'vermicelli', 'poha', 'daliya', 'ragi'], category: 'Grains & Cereals' },

  // Pulses & Lentils
  { keywords: ['dal', 'daal', 'toor', 'moong', 'masoor', 'urad', 'chana', 'rajma', 'kidney bean', 'lentil', 'chickpea', 'chole', 'black gram', 'lobia', 'kabuli'], category: 'Pulses & Lentils' },

  // Dairy & Eggs
  { keywords: ['milk', 'egg', 'curd', 'yogurt', 'dahi', 'paneer', 'cheese', 'butter', 'ghee', 'cream', 'khoya', 'mawa', 'lassi', 'buttermilk', 'chaach', 'amul', 'mother dairy'], category: 'Dairy & Eggs' },

  // Vegetables
  { keywords: ['onion', 'potato', 'tomato', 'aloo', 'tamatar', 'carrot', 'gajar', 'capsicum', 'shimla mirch', 'spinach', 'palak', 'cauliflower', 'gobi', 'cabbage', 'patta gobi', 'peas', 'matar', 'beans', 'cucumber', 'kheera', 'ladyfinger', 'bhindi', 'okra', 'brinjal', 'baingan', 'radish', 'mooli', 'beetroot', 'mushroom', 'corn', 'ginger', 'adrak', 'garlic', 'lehsun', 'green chilli', 'hari mirch', 'coriander', 'dhania', 'curry leaves', 'methi', 'lemon grass', 'bottle gourd', 'lauki', 'bitter gourd', 'karela', 'pumpkin', 'kaddu', 'sweet potato', 'shakarkandi', 'sprouts'], category: 'Vegetables' },

  // Fruits
  { keywords: ['apple', 'banana', 'kela', 'mango', 'aam', 'orange', 'santra', 'grapes', 'angoor', 'watermelon', 'tarbooz', 'papaya', 'pomegranate', 'anaar', 'guava', 'amrood', 'kiwi', 'strawberry', 'pineapple', 'ananas', 'litchi', 'pear', 'nashpati', 'plum', 'peach', 'cherry', 'coconut', 'nariyal', 'lemon', 'nimbu', 'lime', 'fig', 'anjeer', 'dates', 'khajoor', 'avocado'], category: 'Fruits' },

  // Spices & Condiments
  { keywords: ['salt', 'namak', 'sugar', 'cheeni', 'turmeric', 'haldi', 'chilli powder', 'mirch', 'pepper', 'kali mirch', 'cumin', 'jeera', 'coriander powder', 'dhania powder', 'garam masala', 'masala', 'bay leaf', 'tej patta', 'cinnamon', 'dalchini', 'cardamom', 'elaichi', 'cloves', 'laung', 'fennel', 'saunf', 'nutmeg', 'jaiphal', 'asafoetida', 'hing', 'sauce', 'ketchup', 'vinegar', 'soy sauce', 'mustard', 'pickle', 'achar', 'jam', 'honey', 'shahad', 'jaggery', 'gud', 'tamarind', 'imli', 'ajwain', 'kasoori methi'], category: 'Spices & Condiments' },

  // Oils & Ghee
  { keywords: ['oil', 'tel', 'ghee', 'olive oil', 'mustard oil', 'sarson', 'coconut oil', 'sunflower', 'groundnut oil', 'sesame oil', 'til', 'refined oil', 'fortune', 'saffola', 'sundrop', 'cooking oil', 'vanaspati'], category: 'Oils & Ghee' },

  // Beverages
  { keywords: ['tea', 'chai', 'coffee', 'juice', 'soda', 'cola', 'pepsi', 'coke', 'sprite', 'water', 'mineral water', 'drink', 'squash', 'sharbat', 'tata tea', 'red label', 'bru', 'nescafe', 'horlicks', 'bournvita', 'complan', 'tang', 'rooh afza', 'green tea', 'herbal tea'], category: 'Beverages' },

  // Snacks & Biscuits
  { keywords: ['chips', 'biscuit', 'cookie', 'namkeen', 'snack', 'popcorn', 'makhana', 'chocolate', 'candy', 'toffee', 'lays', 'kurkure', 'haldiram', 'britannia', 'parle', 'oreo', 'hide and seek', 'bourbon', 'marie', 'rusk', 'toast', 'mathri', 'chakli', 'sev', 'bhujia', 'mixture'], category: 'Snacks & Biscuits' },

  // Meat & Poultry
  { keywords: ['chicken', 'murgh', 'mutton', 'gosht', 'lamb', 'pork', 'meat', 'keema', 'mince', 'sausage', 'salami', 'bacon', 'ham', 'turkey'], category: 'Meat & Poultry' },

  // Seafood
  { keywords: ['fish', 'machli', 'prawn', 'jhinga', 'shrimp', 'crab', 'lobster', 'squid', 'salmon', 'tuna', 'pomfret', 'rohu', 'surmai', 'hilsa'], category: 'Seafood' },

  // Frozen Foods
  { keywords: ['frozen', 'ice cream', 'kulfi', 'peas frozen', 'frozen corn', 'frozen paratha', 'frozen momos', 'nuggets'], category: 'Frozen Foods' },

  // Bakery & Bread
  { keywords: ['bread', 'bun', 'pav', 'cake', 'muffin', 'pastry', 'croissant', 'donut', 'pizza base', 'tortilla', 'naan', 'kulcha', 'roti', 'paratha'], category: 'Bakery & Bread' },

  // Canned & Packed Foods
  { keywords: ['canned', 'tinned', 'packed', 'ready to eat', 'instant', 'soup', 'baked beans', 'corn can', 'tuna can', 'sardine'], category: 'Canned & Packed Foods' },

  // Dry Fruits & Nuts
  { keywords: ['almond', 'badam', 'cashew', 'kaju', 'walnut', 'akhrot', 'pistachio', 'pista', 'raisin', 'kishmish', 'dry fruit', 'peanut', 'moongfali', 'flax seed', 'chia seed', 'sunflower seed', 'pumpkin seed', 'trail mix', 'dates', 'apricot', 'fig', 'anjeer'], category: 'Dry Fruits & Nuts' },

  // Bathroom Cleaning
  { keywords: ['toilet cleaner', 'harpic', 'bathroom cleaner', 'toilet brush', 'air freshener', 'odonil', 'naphthalene', 'bathroom wipe', 'toilet rim', 'flush cleaner', 'commode'], category: 'Bathroom Cleaning' },

  // Floor & Kitchen Cleaning
  { keywords: ['floor cleaner', 'lizol', 'domex', 'phenyl', 'dishwash', 'vim', 'pril', 'scrubber', 'sponge', 'steel wool', 'garbage bag', 'dustbin bag', 'broom', 'jhadu', 'mop', 'pocha', 'wiper', 'colin', 'glass cleaner', 'kitchen cleaner', 'drain cleaner'], category: 'Floor & Kitchen Cleaning' },

  // Laundry
  { keywords: ['detergent', 'surf', 'tide', 'ariel', 'rin', 'washing powder', 'fabric softener', 'comfort', 'stain remover', 'vanish', 'bleach', 'drying rack', 'cloth clip'], category: 'Laundry' },

  // Personal Care
  { keywords: ['soap', 'body wash', 'shampoo', 'conditioner', 'toothpaste', 'colgate', 'toothbrush', 'mouthwash', 'listerine', 'deodorant', 'deo', 'perfume', 'face wash', 'moisturizer', 'sunscreen', 'razor', 'shaving', 'cream', 'lotion', 'tissue', 'napkin', 'sanitary pad', 'diaper', 'cotton', 'band aid', 'dettol', 'hand wash', 'sanitizer', 'hair oil', 'comb', 'nail cutter', 'lip balm'], category: 'Personal Care' },

  // Baby Care
  { keywords: ['baby', 'diaper', 'baby food', 'cerelac', 'baby soap', 'baby oil', 'baby powder', 'formula', 'bottle', 'nipple', 'pacifier', 'baby wipe'], category: 'Baby Care' },

  // Pet Supplies
  { keywords: ['dog food', 'cat food', 'pet food', 'pedigree', 'whiskas', 'pet treat', 'pet shampoo', 'litter', 'pet toy'], category: 'Pet Supplies' },
];

/**
 * Auto-detect category from item name.
 * Returns the best matching category or null.
 */
export function detectCategoryFromName(itemName: string): string | null {
  if (!itemName || itemName.trim().length < 2) return null;

  const lower = itemName.toLowerCase().trim();

  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword) || keyword.includes(lower)) {
        return rule.category;
      }
    }
  }

  return null;
}

/**
 * Auto-detect unit from item name.
 * Returns suggested unit or null.
 */
export function detectUnitFromName(itemName: string): string | null {
  if (!itemName) return null;
  const lower = itemName.toLowerCase();

  // Items typically counted in numbers
  const countItems = ['egg', 'banana', 'apple', 'orange', 'lemon', 'mango', 'guava', 'onion', 'potato', 'tomato', 'brush', 'broom', 'mop', 'sponge', 'scrubber'];
  if (countItems.some((item) => lower.includes(item))) return 'nos';

  // Items in bottles
  const bottleItems = ['cleaner', 'harpic', 'lizol', 'colin', 'phenyl', 'shampoo', 'body wash', 'hand wash', 'dishwash liquid', 'floor cleaner'];
  if (bottleItems.some((item) => lower.includes(item))) return 'bottles';

  // Items in packets
  const packetItems = ['biscuit', 'chips', 'noodle', 'maggi', 'namkeen', 'bread', 'pasta'];
  if (packetItems.some((item) => lower.includes(item))) return 'packets';

  // Items in liters/ml
  const liquidItems = ['milk', 'oil', 'juice', 'water', 'ghee', 'vinegar'];
  if (liquidItems.some((item) => lower.includes(item))) return 'liters';

  // Items in kg
  const weightItems = ['rice', 'atta', 'flour', 'sugar', 'salt', 'dal', 'chicken', 'mutton', 'fish', 'detergent'];
  if (weightItems.some((item) => lower.includes(item))) return 'kg';

  // Items in grams
  const gramItems = ['butter', 'cheese', 'paneer', 'masala', 'powder', 'spice', 'tea', 'coffee'];
  if (gramItems.some((item) => lower.includes(item))) return 'g';

  // Items in bars
  const barItems = ['soap', 'dishwash bar', 'vim bar'];
  if (barItems.some((item) => lower.includes(item))) return 'bars';

  // Items in tubes
  const tubeItems = ['toothpaste', 'cream', 'ointment'];
  if (tubeItems.some((item) => lower.includes(item))) return 'tubes';

  // Items in rolls
  const rollItems = ['tissue', 'toilet paper', 'garbage bag', 'aluminium foil', 'cling wrap'];
  if (rollItems.some((item) => lower.includes(item))) return 'rolls';

  return null;
}
