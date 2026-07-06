import { DEFAULT_CATEGORIES } from '../constants/categories';

// Shared name -> category / name -> unit heuristics.
// Originally lived only inside invoiceParser.ts as private fallback functions
// (guessCategory/guessUnit), used only when the AI/barcode lookup didn't return
// a usable value. Extracted here so the exact same logic can also power
// auto-categorization while a user manually types an item name in
// AddItemScreen, EditItemScreen, and BarcodeScanScreen (manual-entry path).

export function guessCategoryFromName(name: string): string {
  const lower = name.toLowerCase();

  // --- Food & grocery ---
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

  // --- Personal care (checked before the broader household/cleaning rules
  // below, since words like "cream" or "wash" could otherwise be ambiguous) ---
  if (/toothpaste|toothbrush|mouthwash|dental floss|mouth wash/i.test(lower)) return 'Oral Care';
  if (/shampoo|conditioner|hair oil|hair gel|hair color|hair dye|hair spray/i.test(lower)) return 'Hair Care';
  if (/face wash|face cream|moisturi[sz]er|sunscreen|face pack|facial/i.test(lower)) return 'Skin Care';
  if (/body wash|bath soap|shower gel|body lotion|talc|talcum/i.test(lower)) return 'Bath & Body';
  if (/razor|shaving cream|shaving foam|aftershave|trimmer/i.test(lower)) return 'Grooming & Shaving';
  if (/diaper|baby wipes|baby food|formula|baby powder|baby oil/i.test(lower)) return 'Baby Care';
  if (/sanitary pad|tampon|menstrual/i.test(lower)) return 'Feminine Care';
  if (/vitamin|supplement|medicine|bandage|first aid|sanitizer|thermometer/i.test(lower)) return 'Health & Wellness';
  if (/soap|deo|deodorant|perfume|cologne|lotion|cream/i.test(lower)) return 'Personal Care';

  // --- Household & cleaning (specific rooms/purposes checked before the
  // generic Household/Cleaning Supplies catch-alls) ---
  if (/floor cleaner|floor clean|phenyl|floor wash|floor disinfectant/i.test(lower)) return 'Floor Care';
  if (/toilet clean|bathroom clean|harpic|toilet bowl|drain clean/i.test(lower)) return 'Bathroom Care';
  if (/detergent|fabric softener|laundry|stain remover|washing powder|whitener/i.test(lower)) return 'Laundry Care';
  if (/dishwash|dish soap|dish gel|scrub pad|scrubber/i.test(lower)) return 'Dishwashing';
  if (/air freshener|room spray|incense|agarbatti|fragrance/i.test(lower)) return 'Air Fresheners & Fragrance';
  if (/mosquito|insect repellent|pest control|cockroach|rat killer/i.test(lower)) return 'Pest Control';
  if (/tissue|napkin|paper towel|toilet paper|disposable/i.test(lower)) return 'Paper & Disposables';
  if (/pen|pencil|notebook|stapler|stationery|marker/i.test(lower)) return 'Stationery & Office';
  if (/foil|plastic wrap|container|cling film|garbage bag|trash bag/i.test(lower)) return 'Kitchen & Home';
  if (/battery|bulb|charger|extension cord/i.test(lower)) return 'Electronics & Batteries';
  if (/pet food|dog|cat litter|cat food/i.test(lower)) return 'Pet Care';
  if (/cleaner|mop|broom|trash|bin liner/i.test(lower)) return 'Cleaning Supplies';

  return 'Other';
}

export function guessUnitFromName(name: string, quantity: number = 1): string {
  const lower = name.toLowerCase();
  // Items almost always counted individually, regardless of quantity size
  if (/\begg|lemon|coconut|corn|cucumber|capsicum|brinjal|banana(?!\s?chips)/i.test(lower)) return 'nos';
  // Cleaning/personal-care liquids sold by volume
  if (/toothpaste|shampoo|conditioner|lotion|cream|sanitizer|shaving/i.test(lower)) return 'mL';
  if (/cleaner|phenyl|detergent|dishwash|fabric softener/i.test(lower)) return 'L';
  // NOTE: word boundaries (\b) are required here - without them, `oil` would
  // also match inside unrelated words like "toilet" (t-oil-et), incorrectly
  // suggesting "L" as the unit for things like "Toilet Cleaner".
  if (/\bmilk\b|\boil\b|\bjuice\b|\bwater\b/i.test(lower)) return 'L';
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
