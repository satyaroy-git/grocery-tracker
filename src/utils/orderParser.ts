/**
 * Parses pasted order text from Instamart, Blinkit, Flipkart, Zepto, etc.
 * Extracts item names, quantities, and units using pattern matching.
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
  { pattern: /(\d+\.?\d*)\s*gm?s?/i, unit: 'g' },
  { pattern: /(\d+\.?\d*)\s*grams?/i, unit: 'g' },
  { pattern: /(\d+\.?\d*)\s*li?t(?:re|er)?s?/i, unit: 'liters' },
  { pattern: /(\d+\.?\d*)\s*ml/i, unit: 'ml' },
  { pattern: /(\d+\.?\d*)\s*(?:pc|pcs|pieces?)/i, unit: 'pieces' },
  { pattern: /(\d+\.?\d*)\s*(?:pkt|pkts|packets?)/i, unit: 'packets' },
  { pattern: /(\d+\.?\d*)\s*(?:btl|bottles?)/i, unit: 'bottles' },
  { pattern: /(\d+\.?\d*)\s*(?:dz|dozen)/i, unit: 'dozen' },
  { pattern: /(\d+\.?\d*)\s*(?:pack|packs)/i, unit: 'packets' },
];

// Category detection keywords
const CATEGORY_KEYWORDS: { keywords: string[]; category: string }[] = [
  { keywords: ['rice', 'wheat', 'flour', 'atta', 'maida', 'oats', 'cereal', 'pasta', 'noodle', 'bread', 'roti'], category: 'Grains & Cereals' },
  { keywords: ['milk', 'curd', 'yogurt', 'paneer', 'cheese', 'butter', 'ghee', 'cream', 'dahi'], category: 'Dairy' },
  { keywords: ['onion', 'potato', 'tomato', 'carrot', 'capsicum', 'spinach', 'broccoli', 'cauliflower', 'cabbage', 'peas', 'beans', 'cucumber', 'ladyfinger', 'bhindi', 'palak', 'methi'], category: 'Vegetables' },
  { keywords: ['apple', 'banana', 'mango', 'orange', 'grape', 'watermelon', 'papaya', 'pomegranate', 'guava', 'kiwi', 'strawberry', 'pineapple'], category: 'Fruits' },
  { keywords: ['salt', 'sugar', 'turmeric', 'chilli', 'pepper', 'cumin', 'coriander', 'garam masala', 'sauce', 'ketchup', 'vinegar', 'soy sauce', 'mustard', 'pickle', 'jam', 'honey'], category: 'Spices & Condiments' },
  { keywords: ['tea', 'coffee', 'juice', 'soda', 'water', 'cola', 'drink', 'squash', 'shake'], category: 'Beverages' },
  { keywords: ['chips', 'biscuit', 'cookie', 'namkeen', 'snack', 'popcorn', 'makhana', 'chocolate', 'candy'], category: 'Snacks' },
  { keywords: ['chicken', 'mutton', 'fish', 'egg', 'prawn', 'meat', 'keema', 'sausage'], category: 'Meat & Poultry' },
  { keywords: ['oil', 'olive oil', 'coconut oil', 'mustard oil', 'refined'], category: 'Oils & Fats' },
  { keywords: ['soap', 'detergent', 'cleaner', 'dishwash', 'shampoo', 'toothpaste', 'brush', 'tissue', 'wipe'], category: 'Cleaning Supplies' },
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

function extractQuantityAndUnit(text: string): { quantity: number; unit: string; cleanName: string } {
  for (const { pattern, unit } of UNIT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const quantity = parseFloat(match[1]);
      const cleanName = text.replace(pattern, '').replace(/\s+/g, ' ').trim();
      return { quantity, unit, cleanName };
    }
  }

  // Check for leading quantity like "2 x Item" or "x3"
  const qtyMatch = text.match(/^(\d+)\s*[x×]\s*/i) || text.match(/[x×]\s*(\d+)$/i);
  if (qtyMatch) {
    const quantity = parseInt(qtyMatch[1]);
    const cleanName = text.replace(qtyMatch[0], '').trim();
    return { quantity, unit: 'pieces', cleanName };
  }

  // Check for just a number at the start
  const numMatch = text.match(/^(\d+\.?\d*)\s+/);
  if (numMatch) {
    return { quantity: parseFloat(numMatch[1]), unit: 'pieces', cleanName: text.replace(numMatch[0], '').trim() };
  }

  return { quantity: 1, unit: 'pieces', cleanName: text };
}

/**
 * Parse pasted text from any grocery order into structured items
 */
export function parseOrderText(text: string): ParsedItem[] {
  if (!text || !text.trim()) return [];

  const items: ParsedItem[] = [];
  const seen = new Set<string>();

  // Split by common delimiters: newlines, commas (if no newlines), numbered lists
  let lines = text.split(/\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  // If only one line, try splitting by commas
  if (lines.length === 1 && lines[0].includes(',')) {
    lines = lines[0].split(',').map((l) => l.trim()).filter((l) => l.length > 0);
  }

  for (let line of lines) {
    // Skip common non-item lines
    if (isNonItemLine(line)) continue;

    // Remove list markers: "1.", "1)", "-", "•", "*"
    line = line.replace(/^[\d]+[.)]\s*/, '').replace(/^[-•*]\s*/, '').trim();

    // Remove price patterns: "₹123", "Rs 45.00", "$5.99"
    line = line.replace(/[₹$]\s*\d+\.?\d*/g, '').replace(/Rs\.?\s*\d+\.?\d*/gi, '').trim();

    // Remove "Qty:" patterns
    line = line.replace(/Qty\s*[:=]\s*/gi, '').trim();

    if (line.length < 2) continue;

    const { quantity, unit, cleanName } = extractQuantityAndUnit(line);

    if (!cleanName || cleanName.length < 2) continue;

    // Capitalize first letter
    const name = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

    // Deduplicate
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({
      id: generateSimpleId(),
      name,
      quantity,
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
    'order id', 'order #', 'order no', 'delivered', 'delivery',
    'total', 'subtotal', 'grand total', 'discount', 'coupon',
    'payment', 'paid', 'invoice', 'receipt', 'thank you',
    'address', 'pin code', 'phone', 'email', 'otp',
    'free delivery', 'handling charge', 'platform fee',
    'your order', 'order summary', 'bill details', 'gst',
    'cgst', 'sgst', 'tax', 'savings', 'you saved',
  ];
  return skipPatterns.some((p) => lower.includes(p));
}

/**
 * Sample order text templates for user guidance
 */
export const PASTE_EXAMPLES = [
  {
    label: 'Instamart / Blinkit style',
    text: `Tata Salt 1kg
Amul Butter 500g
Mother Dairy Milk 1 ltr
Onion 2 kg
Fortune Oil 1 ltr
Maggi Noodles x4
Britannia Bread`,
  },
  {
    label: 'Simple comma list',
    text: 'Rice 5kg, Milk 2 liters, Eggs 12 pcs, Onions 2kg, Oil 1 liter, Sugar 1kg',
  },
];
