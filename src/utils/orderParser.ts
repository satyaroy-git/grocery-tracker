/**
 * Order text parser for grocery receipts.
 * Supports: Blinkit, Instamart, Flipkart, Zepto, BigBasket
 * 
 * Two modes:
 * - parseOrderText(): STRICT - for manual paste (only known grocery keywords)
 * - parseReceiptOcrText(): LENIENT - for OCR text (accepts any product-like line)
 */

export interface ParsedItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  selected: boolean;
}

// Unit patterns to detect quantity+unit in text
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

// Category keywords for auto-categorization
const CATEGORY_MAP: { keywords: string[]; category: string }[] = [
  { keywords: ['rice', 'wheat', 'flour', 'atta', 'maida', 'oats', 'cereal', 'pasta', 'noodle', 'bread', 'roti', 'maggi', 'vermicelli', 'poha', 'suji', 'rava', 'dal', 'daal', 'moong', 'toor', 'chana', 'rajma', 'lentil', 'urad', 'masoor'], category: 'Grains & Cereals' },
  { keywords: ['milk', 'curd', 'yogurt', 'paneer', 'cheese', 'butter', 'ghee', 'cream', 'dahi', 'amul', 'lassi'], category: 'Dairy' },
  { keywords: ['onion', 'potato', 'tomato', 'carrot', 'capsicum', 'spinach', 'broccoli', 'cauliflower', 'cabbage', 'peas', 'beans', 'cucumber', 'bhindi', 'palak', 'methi', 'ginger', 'garlic', 'mushroom', 'corn', 'lemon'], category: 'Vegetables' },
  { keywords: ['apple', 'banana', 'mango', 'orange', 'grape', 'watermelon', 'papaya', 'pomegranate', 'guava', 'kiwi', 'strawberry', 'pineapple'], category: 'Fruits' },
  { keywords: ['salt', 'sugar', 'turmeric', 'chilli', 'pepper', 'cumin', 'coriander', 'masala', 'sauce', 'ketchup', 'vinegar', 'mustard', 'pickle', 'jam', 'honey', 'jeera'], category: 'Spices & Condiments' },
  { keywords: ['tea', 'coffee', 'juice', 'soda', 'water', 'cola', 'drink', 'bru', 'nescafe'], category: 'Beverages' },
  { keywords: ['chips', 'biscuit', 'cookie', 'namkeen', 'snack', 'popcorn', 'makhana', 'chocolate', 'candy', 'lays', 'kurkure'], category: 'Snacks' },
  { keywords: ['chicken', 'mutton', 'fish', 'egg', 'prawn', 'meat', 'keema', 'sausage'], category: 'Meat & Poultry' },
  { keywords: ['oil', 'olive', 'coconut oil', 'mustard oil', 'refined', 'fortune', 'saffola'], category: 'Oils & Fats' },
  { keywords: ['soap', 'detergent', 'cleaner', 'dishwash', 'vim', 'surf', 'harpic', 'tissue', 'wipe', 'dettol'], category: 'Cleaning Supplies' },
  { keywords: ['shampoo', 'toothpaste', 'toothbrush', 'colgate', 'deodorant'], category: 'Personal Care' },
];

// Lines that are DEFINITELY not items
const NOISE_PATTERNS = [
  'order id', 'order #', 'order no', 'order number', 'order placed',
  'delivered', 'delivery', 'arriving', 'shipped',
  'total', 'subtotal', 'sub total', 'grand total', 'amount paid', 'net amount',
  'discount', 'coupon', 'promo', 'offer applied', 'savings',
  'payment', 'paid via', 'paid by', 'upi', 'card ending', 'wallet', 'razorpay',
  'thank you', 'thanks for', 'rate your', 'feedback',
  'address', 'pin code', 'pincode', 'landmark', 'flat', 'floor',
  'phone', 'mobile', 'email', 'contact',
  'otp', 'verification',
  'free delivery', 'handling charge', 'platform fee', 'convenience',
  'delivery fee', 'delivery charge', 'surge', 'tip', 'packaging',
  'bill details', 'order summary', 'item total', 'price details',
  'gst', 'cgst', 'sgst', 'igst', 'tax', 'inclusive of',
  'cashback', 'you saved', 'wallet credit',
  'blinkit', 'instamart', 'swiggy', 'zomato', 'flipkart',
  'zepto', 'bigbasket', 'jiomart', 'dunzo', 'grofers',
  'customer care', 'helpline', 'support',
  'fssai', 'license', 'gstin', 'cin', 'pan no',
  'date:', 'time:', 'placed on', 'delivered on', 'expected',
  'items in this order', 'your order', 'order details',
  'download', 'play store', 'app store',
  'refund', 'cancel', 'return', 'replace',
  'description', 'hsn', 'sac code', 'particulars', 'sr no', 's.no',
  'seller', 'sold by', 'marketed by', 'manufactured', 'packed by',
  'warehouse', 'store name', 'hub', 'dark store',
  'signature', 'authorized', 'for blinkit', 'for swiggy',
  'quantity', 'rate', 'amount', 'unit price',
  'invoice', 'receipt', 'bill',
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 12);
}

function detectCategory(name: string): string {
  const lower = name.toLowerCase();
  for (const { keywords, category } of CATEGORY_MAP) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return 'Other';
}

function isNoiseLine(line: string): boolean {
  const lower = line.toLowerCase();
  return NOISE_PATTERNS.some((p) => lower.includes(p));
}

function extractQuantityAndUnit(text: string): { quantity: number; unit: string; cleanName: string } {
  // Try unit patterns first
  for (const { pattern, unit } of UNIT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const quantity = parseFloat(match[1]);
      const cleanName = text.replace(pattern, '').replace(/\s+/g, ' ').trim();
      return { quantity, unit, cleanName };
    }
  }
  // "2 x Item" or "x3" patterns
  const qtyMatch = text.match(/^(\d+)\s*[x×]\s*/i) || text.match(/[x×]\s*(\d+)\s*$/i);
  if (qtyMatch) {
    return { quantity: parseInt(qtyMatch[1]), unit: 'pieces', cleanName: text.replace(qtyMatch[0], '').trim() };
  }
  return { quantity: 1, unit: 'pieces', cleanName: text };
}

/**
 * Clean a raw line: remove prices, codes, special chars
 */
function cleanLine(line: string): string {
  let s = line;
  // Remove prices: ₹123, Rs.45, $5.99, 24.00, etc. at end of line
  s = s.replace(/[₹$]\s*[\d,]+\.?\d*/g, '');
  s = s.replace(/Rs\.?\s*[\d,]+\.?\d*/gi, '');
  s = s.replace(/MRP\s*[:\-]?\s*[₹$]?\s*[\d,]+\.?\d*/gi, '');
  // Remove "Qty: N x ₹price" patterns
  s = s.replace(/\d+\s*[x×]\s*[₹$]\s*[\d,]+\.?\d*/g, '');
  // Remove standalone decimal numbers at end (likely prices): "24.00" "112.50"
  s = s.replace(/\s+\d+\.\d{2}\s*$/g, '');
  // Remove HSN-like codes (6-8 digit numbers)
  s = s.replace(/\b\d{6,8}\b/g, '');
  // Remove list markers
  s = s.replace(/^[\d]+[.)]\s*/, '').replace(/^[-•*]\s*/, '');
  // Remove leading/trailing special chars
  s = s.replace(/^[\-\|:;,.\s]+/, '').replace(/[\-\|:;,.\s]+$/, '');
  // Collapse whitespace
  s = s.replace(/\s{2,}/g, ' ');
  return s.trim();
}

/**
 * Extract a quantity number that appears AFTER the item name in a table row.
 * In receipt tables: "Tata Salt 1kg   25010090   1   24.00   24.00"
 * The qty is typically a small integer (1-99) among other numbers.
 */
function extractTableQuantity(originalLine: string, cleanedName: string): number {
  // Look for numbers in the original line that weren't part of the item name
  const remaining = originalLine.replace(cleanedName, '');
  // Find all standalone small integers (1-99) — likely quantities
  const numbers = remaining.match(/\b([1-9]\d?)\b/g);
  if (numbers && numbers.length > 0) {
    // First small number is usually the quantity
    return parseInt(numbers[0]);
  }
  return 1;
}

// ============================================================
// STRICT PARSER (for manual text paste)
// Only accepts lines with known grocery keywords
// ============================================================

const GROCERY_KEYWORDS = [
  'rice', 'wheat', 'flour', 'atta', 'maida', 'oats', 'cereal', 'pasta', 'noodle', 'maggi',
  'milk', 'curd', 'yogurt', 'paneer', 'cheese', 'butter', 'ghee', 'cream', 'dahi', 'amul',
  'onion', 'potato', 'tomato', 'carrot', 'capsicum', 'spinach', 'cauliflower', 'cabbage',
  'peas', 'beans', 'cucumber', 'bhindi', 'palak', 'methi', 'ginger', 'garlic', 'mushroom',
  'apple', 'banana', 'mango', 'orange', 'grape', 'watermelon', 'papaya', 'pomegranate',
  'salt', 'sugar', 'turmeric', 'chilli', 'pepper', 'cumin', 'masala', 'sauce', 'ketchup',
  'oil', 'olive', 'fortune', 'saffola', 'sundrop',
  'tea', 'coffee', 'juice', 'water', 'cola', 'bru', 'nescafe',
  'chips', 'biscuit', 'cookie', 'namkeen', 'snack', 'chocolate', 'lays', 'kurkure',
  'chicken', 'mutton', 'fish', 'egg', 'prawn', 'meat',
  'bread', 'bun', 'rusk', 'cake', 'pav',
  'soap', 'detergent', 'dishwash', 'vim', 'surf', 'harpic', 'tissue', 'dettol',
  'shampoo', 'toothpaste', 'colgate',
  'dal', 'moong', 'toor', 'chana', 'rajma', 'lentil', 'urad', 'masoor',
  'tata', 'nestle', 'parle', 'britannia', 'haldiram', 'mtr', 'dabur', 'patanjali',
  'ashirvaad', 'aashirvaad', 'maggi', 'knorr', 'kissan', 'mother dairy',
];

function looksLikeGroceryItem(line: string): boolean {
  const lower = line.toLowerCase();
  if (lower.length < 3) return false;
  if (GROCERY_KEYWORDS.some((k) => lower.includes(k))) return true;
  if (UNIT_PATTERNS.some(({ pattern }) => pattern.test(line))) return true;
  if (/\d+\s*[x×]/i.test(line) || /[x×]\s*\d+/i.test(line)) return true;
  if (/qty\s*[:=]\s*\d+/i.test(line)) return true;
  return false;
}

export function parseOrderText(text: string): ParsedItem[] {
  if (!text || !text.trim()) return [];
  const items: ParsedItem[] = [];
  const seen = new Set<string>();

  let lines = text.split(/\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 1 && lines[0].includes(',')) {
    lines = lines[0].split(',').map((l) => l.trim()).filter((l) => l.length > 0);
  }

  // Merge "Qty:" lines with previous
  const merged = mergeQtyLines(lines);

  for (let line of merged) {
    if (isNoiseLine(line)) continue;
    const cleaned = cleanLine(line);
    if (cleaned.length < 3) continue;
    if (!looksLikeGroceryItem(cleaned)) continue;

    let blinktQty = extractBlinktQty(line);
    const { quantity, unit, cleanName } = extractQuantityAndUnit(cleaned);
    if (!cleanName || cleanName.length < 2) continue;

    const finalQty = quantity === 1 && blinktQty > 1 ? blinktQty : quantity;
    const name = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({ id: generateId(), name, quantity: finalQty, unit, category: detectCategory(name), selected: true });
  }
  return items;
}

// ============================================================
// LENIENT PARSER (for OCR-extracted receipt text)
// Accepts any line that looks like a product (not just known keywords)
// ============================================================

/**
 * Determines if a line looks like a product entry from a receipt.
 * A product line typically:
 * - Starts with text (the product name)
 * - May contain a weight/volume (500g, 1kg, 1L)
 * - Is NOT just a number, date, or single word
 */
function looksLikeProductLine(line: string): boolean {
  if (line.length < 4) return false;

  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(line)) return false;

  // Must have at least 2 word characters (not just "1" or "A")
  if ((line.match(/[a-zA-Z]/g) || []).length < 2) return false;

  // Should NOT be all caps single short word (usually headers)
  if (line.length < 6 && /^[A-Z]+$/.test(line)) return false;

  return true;
}

export function parseReceiptOcrText(text: string): ParsedItem[] {
  if (!text || !text.trim()) return [];
  const items: ParsedItem[] = [];
  const seen = new Set<string>();

  let lines = text.split(/\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  // Merge "Qty:" lines
  const merged = mergeQtyLines(lines);

  for (let line of merged) {
    if (isNoiseLine(line)) continue;

    const originalLine = line;
    const cleaned = cleanLine(line);
    if (cleaned.length < 4) continue;
    if (!looksLikeProductLine(cleaned)) continue;

    // Skip if it's just numbers after cleaning
    if (/^\d+[\s.,-]*\d*$/.test(cleaned)) continue;

    let blinktQty = extractBlinktQty(originalLine);
    const { quantity, unit, cleanName } = extractQuantityAndUnit(cleaned);
    if (!cleanName || cleanName.length < 2) continue;

    // Also try to get qty from the table row numbers
    let tableQty = extractTableQuantity(originalLine, cleanName);
    const finalQty = quantity > 1 ? quantity : (blinktQty > 1 ? blinktQty : tableQty);

    const name = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({ id: generateId(), name, quantity: finalQty, unit, category: detectCategory(name), selected: true });
  }
  return items;
}

// ============================================================
// HELPERS
// ============================================================

function mergeQtyLines(lines: string[]): string[] {
  const merged: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    if (/^Qty\s*[:=]/i.test(nextLine) || /^\d+\s*[x×]\s*[₹$]/i.test(nextLine)) {
      merged.push(`${line} ${nextLine}`);
      i++;
    } else {
      merged.push(line);
    }
  }
  return merged;
}

function extractBlinktQty(line: string): number {
  const match = line.match(/Qty\s*[:=]\s*(\d+)/i);
  return match ? parseInt(match[1]) : 1;
}

// ============================================================
// SAMPLE TEMPLATES
// ============================================================

export const PASTE_EXAMPLES = [
  {
    label: 'Blinkit receipt',
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
    label: 'Simple item list',
    text: `Tata Salt 1kg
Amul Butter 500g
Mother Dairy Milk 1 ltr
Onion 2 kg
Fortune Oil 1 ltr
Maggi Noodles x4
Britannia Bread`,
  },
  {
    label: 'Comma-separated',
    text: 'Rice 5kg, Milk 2 liters, Eggs 12 pcs, Onions 2kg, Oil 1 liter, Sugar 1kg, Toor Dal 1kg',
  },
];
