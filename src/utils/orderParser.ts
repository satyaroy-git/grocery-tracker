/**
 * Parses pasted order text from Instamart, Blinkit, Flipkart, Zepto, etc.
 * Extracts item names, quantities, and units using pattern matching.
 * 
 * STRICT MODE: Only extracts lines that look like actual grocery items.
 */

export interface ParsedItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  selected: boolean;
}

// Common unit patterns
const UNIT_PATTERNS: { pattern: RegExp; unit: string }[] = [
  { pattern: /(\d+\.?\d*)\s*kg/i, unit: 'kg' },
  { pattern: /(\d+\.?\d*)\s*gm?s?(?!\w)/i, unit: 'g' },
  { pattern: /(\d+\.?\d*)\s*grams?/i, unit: 'g' },
  { pattern: /(\d+\.?\d*)\s*li?t(?:re|er)?s?/i, unit: 'liters' },
  { pattern: /(\d+\.?\d*)\s*ml/i, unit: 'ml' },
  { pattern: /(\d+\.?\d*)\s*(?:pc|pcs|pieces?)/i, unit: 'pieces' },
  { pattern: /(\d+\.?\d*)\s*(?:pkt|pkts|packets?)/i, unit: 'packets' },
  { pattern: /(\d+\.?\d*)\s*(?:btl|bottles?)/i, unit: 'bottles' },
  { pattern: /(\d+\.?\d*)\s*(?:dz|dozen)/i, unit: 'dozen' },
  { pattern: /(\d+\.?\d*)\s*(?:pack|packs)/i, unit: 'packets' },
  { pattern: /(\d+\.?\d*)\s*(?:can|cans)/i, unit: 'cans' },
  { pattern: /(\d+\.?\d*)\s*(?:bag|bags)/i, unit: 'bags' },
];

// Known grocery product keywords — if a line contains these, it's likely an item
const GROCERY_KEYWORDS = [
  // Grains
  'rice', 'wheat', 'flour', 'atta', 'maida', 'suji', 'rava', 'oats', 'cereal',
  'pasta', 'noodle', 'maggi', 'vermicelli', 'semolina', 'poha', 'daliya',
  // Dairy
  'milk', 'curd', 'yogurt', 'paneer', 'cheese', 'butter', 'ghee', 'cream',
  'dahi', 'lassi', 'buttermilk', 'amul', 'mother dairy', 'milky mist',
  // Vegetables
  'onion', 'potato', 'tomato', 'carrot', 'capsicum', 'spinach', 'broccoli',
  'cauliflower', 'cabbage', 'peas', 'beans', 'cucumber', 'ladyfinger',
  'bhindi', 'palak', 'methi', 'coriander', 'ginger', 'garlic', 'lemon',
  'chilli', 'brinjal', 'gourd', 'radish', 'beetroot', 'mushroom', 'corn',
  // Fruits
  'apple', 'banana', 'mango', 'orange', 'grape', 'watermelon', 'papaya',
  'pomegranate', 'guava', 'kiwi', 'strawberry', 'pineapple', 'litchi', 'pear',
  // Spices & condiments
  'salt', 'sugar', 'turmeric', 'chilli', 'pepper', 'cumin', 'coriander',
  'garam masala', 'sauce', 'ketchup', 'vinegar', 'soy sauce', 'mustard',
  'pickle', 'jam', 'honey', 'masala', 'powder', 'jeera',
  // Oils
  'oil', 'olive oil', 'coconut oil', 'mustard oil', 'refined', 'fortune',
  'saffola', 'sundrop',
  // Beverages
  'tea', 'coffee', 'juice', 'soda', 'water', 'cola', 'drink', 'squash',
  'tata tea', 'red label', 'bru', 'nescafe',
  // Snacks
  'chips', 'biscuit', 'cookie', 'namkeen', 'snack', 'popcorn', 'makhana',
  'chocolate', 'candy', 'lays', 'kurkure', 'britannia', 'parle', 'haldiram',
  // Meat & eggs
  'chicken', 'mutton', 'fish', 'egg', 'prawn', 'meat', 'keema', 'sausage',
  // Bread & bakery
  'bread', 'bun', 'rusk', 'cake', 'muffin', 'pav', 'roti', 'naan', 'tortilla',
  // Cleaning
  'soap', 'detergent', 'cleaner', 'dishwash', 'vim', 'surf', 'harpic', 'lizol',
  'tissue', 'wipe', 'dettol', 'colin',
  // Personal care
  'shampoo', 'toothpaste', 'toothbrush', 'brush', 'colgate',
  // Pulses & lentils
  'dal', 'daal', 'moong', 'toor', 'chana', 'rajma', 'lentil', 'urad',
  'masoor', 'arhar',
  // Brands commonly found on receipts
  'tata', 'amul', 'nestle', 'parle', 'britannia', 'haldiram', 'mtr',
  'dabur', 'patanjali', 'ashirvaad', 'aashirvaad', 'pilsbury', 'maggi',
  'knorr', 'kissan', 'saffola', 'fortune', 'sundrop',
];

// Category detection
const CATEGORY_KEYWORDS: { keywords: string[]; category: string }[] = [
  { keywords: ['rice', 'wheat', 'flour', 'atta', 'maida', 'oats', 'cereal', 'pasta', 'noodle', 'bread', 'roti', 'maggi', 'vermicelli', 'poha', 'suji', 'rava'], category: 'Grains & Cereals' },
  { keywords: ['milk', 'curd', 'yogurt', 'paneer', 'cheese', 'butter', 'ghee', 'cream', 'dahi', 'amul'], category: 'Dairy' },
  { keywords: ['onion', 'potato', 'tomato', 'carrot', 'capsicum', 'spinach', 'broccoli', 'cauliflower', 'cabbage', 'peas', 'beans', 'cucumber', 'ladyfinger', 'bhindi', 'palak', 'methi', 'ginger', 'garlic', 'mushroom', 'corn'], category: 'Vegetables' },
  { keywords: ['apple', 'banana', 'mango', 'orange', 'grape', 'watermelon', 'papaya', 'pomegranate', 'guava', 'kiwi', 'strawberry', 'pineapple'], category: 'Fruits' },
  { keywords: ['salt', 'sugar', 'turmeric', 'chilli', 'pepper', 'cumin', 'coriander', 'garam masala', 'sauce', 'ketchup', 'vinegar', 'soy sauce', 'mustard', 'pickle', 'jam', 'honey', 'masala', 'jeera'], category: 'Spices & Condiments' },
  { keywords: ['tea', 'coffee', 'juice', 'soda', 'water', 'cola', 'drink', 'squash', 'bru', 'nescafe'], category: 'Beverages' },
  { keywords: ['chips', 'biscuit', 'cookie', 'namkeen', 'snack', 'popcorn', 'makhana', 'chocolate', 'candy', 'lays', 'kurkure'], category: 'Snacks' },
  { keywords: ['chicken', 'mutton', 'fish', 'egg', 'prawn', 'meat', 'keema', 'sausage'], category: 'Meat & Poultry' },
  { keywords: ['oil', 'olive', 'coconut oil', 'mustard oil', 'refined', 'fortune', 'saffola'], category: 'Oils & Fats' },
  { keywords: ['soap', 'detergent', 'cleaner', 'dishwash', 'vim', 'surf', 'harpic', 'tissue', 'wipe', 'dettol', 'colin', 'lizol'], category: 'Cleaning Supplies' },
  { keywords: ['shampoo', 'toothpaste', 'toothbrush', 'colgate'], category: 'Personal Care' },
  { keywords: ['dal', 'daal', 'moong', 'toor', 'chana', 'rajma', 'lentil', 'urad', 'masoor'], category: 'Grains & Cereals' },
];

function generateSimpleId(): string {
  return Math.random().toString(36).substring(2, 12);
}

function detectCategory(itemName: string): string {
  const lower = itemName.toLowerCase();
  for (const { keywords, category } of CATEGORY_KEYWORDS) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) return category;
    }
  }
  return 'Other';
}

/**
 * Check if a line looks like a grocery item
 * Uses keyword matching + quantity/unit pattern detection
 */
function looksLikeGroceryItem(line: string): boolean {
  const lower = line.toLowerCase();

  // Must be at least 3 characters
  if (lower.length < 3) return false;

  // If it contains a known grocery keyword, it's likely an item
  for (const keyword of GROCERY_KEYWORDS) {
    if (lower.includes(keyword)) return true;
  }

  // If it has a quantity + unit pattern (e.g., "500g", "1kg", "2 liters"), likely an item
  for (const { pattern } of UNIT_PATTERNS) {
    if (pattern.test(line)) return true;
  }

  // If it has "x2", "x 3", "Qty: 2" pattern
  if (/\d+\s*[x×]/i.test(line) || /[x×]\s*\d+/i.test(line)) return true;
  if (/qty\s*[:=]\s*\d+/i.test(line)) return true;

  return false;
}

function extractQuantityAndUnit(text: string): { quantity: number; unit: string; cleanName: string } {
  for (const { pattern, unit } of UNIT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const quantity = parseFloat(match[1]);
      const cleanName = text.replace(pattern, '').replace(/\s+/g, ' ').trim();
      return { quantity, unit, cleanName };
    }
  }

  // Check for "2 x Item" or "x3" patterns
  const qtyMatch = text.match(/^(\d+)\s*[x×]\s*/i) || text.match(/[x×]\s*(\d+)$/i);
  if (qtyMatch) {
    const quantity = parseInt(qtyMatch[1]);
    const cleanName = text.replace(qtyMatch[0], '').trim();
    return { quantity, unit: 'pieces', cleanName };
  }

  return { quantity: 1, unit: 'pieces', cleanName: text };
}

/**
 * Parse pasted text from any grocery order into structured items.
 * Only includes lines that genuinely look like grocery items.
 */
export function parseOrderText(text: string): ParsedItem[] {
  if (!text || !text.trim()) return [];

  const items: ParsedItem[] = [];
  const seen = new Set<string>();

  // Split by newlines
  let lines = text.split(/\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  // If only one line, try splitting by commas
  if (lines.length === 1 && lines[0].includes(',')) {
    lines = lines[0].split(',').map((l) => l.trim()).filter((l) => l.length > 0);
  }

  // Blinkit/Zepto format: item name on one line, "Qty: N x ₹price" on next
  const mergedLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';

    if (/^Qty\s*[:=]/i.test(nextLine) || /^\d+\s*[x×]\s*[₹$]/i.test(nextLine)) {
      mergedLines.push(`${line} ${nextLine}`);
      i++;
    } else {
      mergedLines.push(line);
    }
  }

  for (let line of mergedLines) {
    // Skip common non-item lines
    if (isNonItemLine(line)) continue;

    // Remove list markers: "1.", "1)", "-", "•", "*"
    line = line.replace(/^[\d]+[.)]\s*/, '').replace(/^[-•*]\s*/, '').trim();

    // Remove price patterns
    line = line.replace(/\d+\s*[x×]\s*[₹$]\s*\d+\.?\d*/g, '').trim();
    line = line.replace(/[₹$]\s*\d+\.?\d*/g, '').replace(/Rs\.?\s*\d+\.?\d*/gi, '').trim();
    line = line.replace(/MRP\s*[:\-]?\s*[₹$]?\s*\d+[\.,]?\d*/gi, '').trim();

    // Extract quantity from "Qty: 2" before removing
    let blinktQty = 1;
    const qtyLineMatch = line.match(/Qty\s*[:=]\s*(\d+)/i);
    if (qtyLineMatch) {
      blinktQty = parseInt(qtyLineMatch[1]);
    }

    // Remove "Qty:" patterns
    line = line.replace(/Qty\s*[:=]\s*\d*\s*[x×]?\s*/gi, '').trim();

    if (line.length < 3) continue;

    // STRICT CHECK: Only keep lines that look like grocery items
    if (!looksLikeGroceryItem(line)) continue;

    const { quantity, unit, cleanName } = extractQuantityAndUnit(line);

    if (!cleanName || cleanName.length < 2) continue;

    // Use Blinkit qty if no quantity was found in the item name
    const finalQuantity = quantity === 1 && blinktQty > 1 ? blinktQty : quantity;

    // Capitalize first letter
    const name = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

    // Deduplicate
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({
      id: generateSimpleId(),
      name,
      quantity: finalQuantity,
      unit,
      category: detectCategory(name),
      selected: true,
    });
  }

  return items;
}

function isNonItemLine(line: string): boolean {
  const lower = line.toLowerCase();
  const skipPatterns = [
    'order id', 'order #', 'order no', 'order number', 'order placed',
    'delivered', 'delivery', 'arriving',
    'total', 'subtotal', 'sub total', 'grand total', 'amount paid',
    'discount', 'coupon', 'promo', 'offer applied',
    'payment', 'paid via', 'paid by', 'upi', 'card ending', 'wallet',
    'thank you', 'thanks for', 'rate your',
    'address', 'pin code', 'pincode', 'landmark',
    'phone', 'mobile', 'email', 'contact',
    'otp', 'verification',
    'free delivery', 'handling charge', 'platform fee',
    'delivery fee', 'delivery charge', 'convenience',
    'packaging', 'surge', 'tip',
    'bill details', 'order summary', 'item total',
    'gst', 'cgst', 'sgst', 'tax', 'inclusive',
    'savings', 'you saved', 'cashback',
    'blinkit', 'instamart', 'swiggy', 'zomato', 'flipkart',
    'zepto', 'bigbasket', 'jiomart', 'dunzo', 'grofers',
    'customer care', 'helpline', 'support', 'feedback',
    'fssai', 'license', 'gstin', 'cin',
    'date:', 'time:', 'placed on', 'delivered on',
    'items in this order', 'your order', 'order details',
    'download', 'app', 'play store', 'app store',
    'refund', 'cancel', 'return', 'replace',
  ];
  return skipPatterns.some((p) => lower.includes(p));
}

/**
 * LENIENT parser for OCR-extracted text from receipts.
 * Since we know the source is a receipt, we accept more lines as items.
 * Only skips lines that are clearly NOT items (noise lines).
 */
export function parseReceiptOcrText(text: string): ParsedItem[] {
  if (!text || !text.trim()) return [];

  const items: ParsedItem[] = [];
  const seen = new Set<string>();

  let lines = text.split(/\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  // Merge Blinkit "Qty:" lines with previous item line
  const mergedLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    if (/^Qty\s*[:=]/i.test(nextLine) || /^\d+\s*[x×]\s*[₹$]/i.test(nextLine)) {
      mergedLines.push(`${line} ${nextLine}`);
      i++;
    } else {
      mergedLines.push(line);
    }
  }

  for (let line of mergedLines) {
    if (isNonItemLine(line)) continue;

    // Remove list markers
    line = line.replace(/^[\d]+[.)]\s*/, '').replace(/^[-•*]\s*/, '').trim();

    // Remove prices
    line = line.replace(/\d+\s*[x×]\s*[₹$]\s*\d+\.?\d*/g, '').trim();
    line = line.replace(/[₹$]\s*\d+\.?\d*/g, '').replace(/Rs\.?\s*\d+\.?\d*/gi, '').trim();
    line = line.replace(/MRP\s*[:\-]?\s*[₹$]?\s*\d+[\.,]?\d*/gi, '').trim();

    // Extract Blinkit qty
    let blinktQty = 1;
    const qtyLineMatch = line.match(/Qty\s*[:=]\s*(\d+)/i);
    if (qtyLineMatch) blinktQty = parseInt(qtyLineMatch[1]);
    line = line.replace(/Qty\s*[:=]\s*\d*\s*[x×]?\s*/gi, '').trim();

    // Skip very short lines or lines that are just numbers
    if (line.length < 3) continue;
    if (/^\d+\.?\d*$/.test(line)) continue;
    if (/^\d+[\-\/]\d+[\-\/]\d+$/.test(line)) continue; // dates

    const { quantity, unit, cleanName } = extractQuantityAndUnit(line);
    if (!cleanName || cleanName.length < 2) continue;

    const finalQuantity = quantity === 1 && blinktQty > 1 ? blinktQty : quantity;
    const name = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({
      id: generateSimpleId(),
      name,
      quantity: finalQuantity,
      unit,
      category: detectCategory(name),
      selected: true,
    });
  }

  return items;
}

/**
 * Sample order text templates for user guidance
 */
export const PASTE_EXAMPLES = [
  {
    label: 'Blinkit receipt style',
    text: `Tata Salt Iodised 1kg
Qty: 1 x ₹24
Amul Taaza Toned Milk 500ml
Qty: 2 x ₹30
Fortune Sunlite Refined Sunflower Oil 1L
Qty: 1 x ₹155
Onion 1kg
Qty: 2 x ₹35
Maggi 2-Minute Masala Noodles
Qty: 4 x ₹14
Britannia 100% Whole Wheat Bread
Qty: 1 x ₹45`,
  },
  {
    label: 'Instamart / simple list',
    text: `Tata Salt 1kg
Amul Butter 500g
Mother Dairy Milk 1 ltr
Onion 2 kg
Fortune Oil 1 ltr
Maggi Noodles x4
Britannia Bread`,
  },
  {
    label: 'Comma-separated list',
    text: 'Rice 5kg, Milk 2 liters, Eggs 12 pcs, Onions 2kg, Oil 1 liter, Sugar 1kg, Toor Dal 1kg',
  },
];
