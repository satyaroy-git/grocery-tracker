import { DEFAULT_CATEGORIES } from '../constants/categories';

// Shared name -> category / name -> unit heuristics.
// Originally lived only inside invoiceParser.ts as private fallback functions
// (guessCategory/guessUnit), used only when the AI/barcode lookup didn't return
// a usable value. Extracted here so the exact same logic can also power
// auto-categorization while a user manually types an item name in
// AddItemScreen, EditItemScreen, and BarcodeScanScreen (manual-entry path).

export function guessCategoryFromName(name: string): string {
  const lower = name.toLowerCase();

  if (/milk|curd|paneer|cheese|butter|yogurt|dahi/i.test(lower)) return 'Dairy';
  if (/apple|banana|mango|orange|grape|papaya|fruit|lemon|watermelon|pineapple/i.test(lower)) return 'Fruits';
  if (/onion|tomato|potato|carrot|spinach|capsicum|vegetable|sabzi|brinjal|cucumber|corn/i.test(lower)) return 'Vegetables';
  if (/rice|atta|flour|wheat|poha|suji|maida/i.test(lower)) return 'Grains & Cereals';
  if (/dal|lentil|chana|rajma|moong|toor|urad/i.test(lower)) return 'Pulses & Dals';
  if (/ghee|cooking oil|mustard oil|sunflower oil|olive oil|vanaspati/i.test(lower)) return 'Oils & Ghee';
  if (/oats|cornflakes|muesli|cereal/i.test(lower)) return 'Breakfast & Cereals';
  if (/chips|biscuit|cookie|namkeen|snack|kurkure/i.test(lower)) return 'Snacks';
  if (/chocolate|candy|toffee|sweet|mithai/i.test(lower)) return 'Chocolates & Sweets';
  if (/tea|coffee/i.test(lower)) return 'Tea & Coffee';
  if (/juice|soda|water|drink|cola|beverage/i.test(lower)) return 'Beverages';
  if (/ketchup|sauce|jam|mayonnaise|spread/i.test(lower)) return 'Sauces & Spreads';
  if (/salt|sugar|turmeric|haldi|jeera|cumin|masala|spice/i.test(lower)) return 'Spices & Condiments';
  if (/almond|cashew|raisin|walnut|pista|dry fruit|nuts/i.test(lower)) return 'Dry Fruits & Nuts';
  if (/chicken|mutton|fish|egg|prawn|meat/i.test(lower)) return 'Meat & Seafood';
  if (/bread|bun|cake|pastry|bakery/i.test(lower)) return 'Bakery';
  if (/frozen|ice cream|kulfi/i.test(lower)) return 'Frozen Foods';
  if (/diaper|baby wipes|baby food|formula/i.test(lower)) return 'Baby Care';
  if (/vitamin|supplement|medicine|bandage|sanitizer/i.test(lower)) return 'Health & Wellness';
  if (/soap|shampoo|toothpaste|cream|lotion|deo|razor/i.test(lower)) return 'Personal Care';
  if (/detergent|dishwash|cleaner|mop|toilet clean/i.test(lower)) return 'Cleaning Supplies';
  if (/pet food|dog|cat litter/i.test(lower)) return 'Pet Care';
  if (/tissue|trash|foil|plastic wrap|container/i.test(lower)) return 'Kitchen & Home';
  if (/detergent|cleaner|mop|trash/i.test(lower)) return 'Household';

  return 'Other';
}

export function guessUnitFromName(name: string, quantity: number = 1): string {
  const lower = name.toLowerCase();
  // Items almost always counted individually, regardless of quantity size
  if (/egg|lemon|coconut|corn|cucumber|capsicum|brinjal|banana(?!\s?chips)/i.test(lower)) return 'nos';
  if (lower.includes('milk') || lower.includes('oil') || lower.includes('juice')) return 'L';
  if (lower.includes('water')) return 'L';
  if (quantity >= 100 && quantity <= 1000) return 'g'; // likely grams
  if (quantity > 1000) return 'mL';
  return 'pcs';
}

// Safety net: always return a category that's actually in the app's list,
// even if guessCategoryFromName somehow returns something unexpected.
export function safeCategoryGuess(name: string): string {
  const guess = guessCategoryFromName(name);
  return DEFAULT_CATEGORIES.includes(guess) ? guess : 'Other';
}
