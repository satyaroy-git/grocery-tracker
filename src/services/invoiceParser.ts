// Expo SDK 54 renamed the classic file API to expo-file-system/legacy
// (the default `expo-file-system` export is now the new object-oriented API).
import * as FileSystem from 'expo-file-system/legacy';
import { CreateItemInput } from '../database';
import { DEFAULT_CATEGORIES } from '../constants/categories';
import { getApiKey } from './config';

// Types for parsed invoice data
export interface ParsedInvoiceItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  price?: number;
  brand?: string;
}

export interface InvoiceParseResult {
  success: boolean;
  items: ParsedInvoiceItem[];
  storeName?: string;
  invoiceDate?: string;
  totalAmount?: number;
  error?: string;
}

// Full list of units the app supports (kept in sync with constants/categories.ts UNITS_OF_MEASUREMENT)
const VALID_UNITS_LIST = [
  'kg', 'g', 'mg', 'L', 'mL', 'pcs', 'nos', 'dz', 'pkt', 'pouch', 'sachet',
  'btl', 'jar', 'tube', 'box', 'can', 'bag', 'bunch', 'tray', 'roll', 'strip',
  'pair', 'set',
];

// The LLM prompt specifically designed for Indian grocery invoice parsing
const INVOICE_PARSE_PROMPT = `You are a grocery invoice parser specialized in Indian online grocery delivery platforms (Blinkit, Swiggy Instamart, BigBasket, Zepto, JioMart, Amazon Fresh, DMart Ready).

Analyze the provided grocery invoice image and extract ALL purchased items.

For each item, provide:
1. "name": Clean product name (remove brand prefixes if it's a common item, keep brand for branded products)
2. "quantity": Numeric quantity purchased (parse from "2 x 500g" as quantity=2, or "1 kg" as quantity=1)
3. "unit": Pick the single best-fitting unit from: ${VALID_UNITS_LIST.join(', ')}
4. "category": Pick the single best-fitting category from: ${DEFAULT_CATEGORIES.join(', ')}
5. "price": Price paid for this item (number, INR)
6. "brand": Brand name if visible

IMPORTANT RULES:
- Parse weight/volume from product names: "Amul Toned Milk 500ml" → unit: "mL", quantity: 500
- For packaged items sold as packs: "Maggi Noodles 4-pack" → unit: "pkt", quantity: 4
- If quantity shows "2 x 1L Milk", that means 2 items of 1L each → quantity: 2, unit: "L"
- Normalize names: remove excessive brand/variant text, keep it recognizable
- For produce sold by weight: "Onion 1kg" → name: "Onion", quantity: 1, unit: "kg"
- For items counted individually with no weight given (eggs, lemons, single fruits/vegetables sold per piece), use unit "nos" or "pcs" — e.g. "Eggs 6" → name: "Eggs", quantity: 6, unit: "nos"
- Recognize common Indian grocery items and categorize appropriately, e.g.:
  "Atta"/"Rice"/"Poha" → "Grains & Cereals", "Toor Dal"/"Moong Dal"/"Chana" → "Pulses & Dals",
  "Ghee"/"Cooking Oil"/"Mustard Oil" → "Oils & Ghee", "Haldi"/"Jeera"/"Garam Masala" → "Spices & Condiments",
  "Tea"/"Coffee" → "Tea & Coffee", "Ketchup"/"Jam"/"Mayonnaise" → "Sauces & Spreads",
  "Almonds"/"Cashews"/"Raisins" → "Dry Fruits & Nuts", "Cornflakes"/"Muesli"/"Oats" → "Breakfast & Cereals",
  "Chocolate"/"Candy" → "Chocolates & Sweets", "Frozen Peas"/"Ice Cream" → "Frozen Foods",
  "Diapers"/"Baby Wipes" → "Baby Care", "Detergent"/"Dishwash" → "Cleaning Supplies",
  "Pet Food" → "Pet Care"

Extract every item you find and return them in the structured format requested.`;

// JSON Schema Gemini uses to constrain its response (guarantees valid, parseable JSON).
// Constraining category/unit to enums keeps AI output aligned with what the app
// actually supports, so users rarely need to correct them in the review screen.
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    storeName: { type: 'STRING', nullable: true },
    invoiceDate: { type: 'STRING', nullable: true },
    totalAmount: { type: 'NUMBER', nullable: true },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          quantity: { type: 'NUMBER' },
          unit: { type: 'STRING', enum: VALID_UNITS_LIST },
          category: { type: 'STRING', enum: DEFAULT_CATEGORIES },
          price: { type: 'NUMBER', nullable: true },
          brand: { type: 'STRING', nullable: true },
        },
        required: ['name', 'quantity', 'unit', 'category'],
      },
    },
  },
  required: ['items'],
};

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Parse a grocery invoice image using the Gemini API (multimodal vision)
 */
export async function parseInvoiceImage(imageUri: string): Promise<InvoiceParseResult> {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return {
        success: false,
        items: [],
        error: 'Gemini API key not configured. Please set it in Settings.',
      };
    }

    // Read the image as base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Determine image MIME type from URI
    const mimeType = getMimeType(imageUri);

    const response = await fetch(
      `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: INVOICE_PARSE_PROMPT },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      }
    );

    return await handleGeminiResponse(response);
  } catch (error: any) {
    console.error('Invoice parsing error:', error);
    return {
      success: false,
      items: [],
      error: `Failed to parse invoice: ${error.message || 'Unknown error'}`,
    };
  }
}

/**
 * Parse invoice from text (for copy-pasted invoice text) using Gemini
 */
export async function parseInvoiceText(invoiceText: string): Promise<InvoiceParseResult> {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return {
        success: false,
        items: [],
        error: 'Gemini API key not configured. Please set it in Settings.',
      };
    }

    const response = await fetch(
      `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${INVOICE_PARSE_PROMPT}\n\nHere is the invoice/order text to parse:\n\n${invoiceText}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      }
    );

    return await handleGeminiResponse(response);
  } catch (error: any) {
    console.error('Invoice text parsing error:', error);
    return {
      success: false,
      items: [],
      error: `Failed to parse invoice: ${error.message || 'Unknown error'}`,
    };
  }
}

/**
 * Shared response handling for both image and text Gemini calls
 */
async function handleGeminiResponse(response: Response): Promise<InvoiceParseResult> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMsg = errorData?.error?.message || `API request failed with status ${response.status}`;
    return {
      success: false,
      items: [],
      error: `Gemini API Error: ${errorMsg}`,
    };
  }

  const data = await response.json();

  // Check for content blocked by safety filters or other non-STOP finish reasons
  const candidate = data.candidates?.[0];
  if (!candidate) {
    return {
      success: false,
      items: [],
      error: 'No response from Gemini. The invoice might be unclear or blocked by safety filters.',
    };
  }

  const content = candidate.content?.parts?.[0]?.text;
  if (!content) {
    return {
      success: false,
      items: [],
      error: 'Gemini returned an empty response.',
    };
  }

  const parsed = parseJsonResponse(content);
  if (!parsed) {
    return {
      success: false,
      items: [],
      error: 'Failed to parse AI response. The invoice might be unclear.',
    };
  }

  const validatedItems = validateAndCleanItems(parsed.items || []);

  return {
    success: true,
    items: validatedItems,
    storeName: parsed.storeName || undefined,
    invoiceDate: parsed.invoiceDate || undefined,
    totalAmount: parsed.totalAmount || undefined,
  };
}

/**
 * Convert parsed invoice items to database CreateItemInput format
 */
export function convertToCreateItemInputs(items: ParsedInvoiceItem[]): CreateItemInput[] {
  return items.map((item) => ({
    name: item.name,
    category: item.category,
    unit: item.unit,
    currentQuantity: item.quantity,
    threshold: suggestThreshold(item),
    consumptionMode: 'manual' as const,
    autoConsumptionRate: null,
    autoConsumptionFrequency: null,
  }));
}

// Helper functions

function getMimeType(uri: string): string {
  const extension = uri.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    default: return 'image/jpeg';
  }
}

function parseJsonResponse(content: string): any {
  try {
    // Try direct JSON parse first
    return JSON.parse(content);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // Fall through
      }
    }

    // Try to find JSON object in the response
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // Fall through
      }
    }

    return null;
  }
}

// Reuse the same list defined above (near the prompt) for validation
const VALID_UNITS = VALID_UNITS_LIST;

function validateAndCleanItems(items: any[]): ParsedInvoiceItem[] {
  return items
    .filter((item) => item && item.name && typeof item.name === 'string')
    .map((item) => {
      // Clean name
      const name = item.name.trim().substring(0, 100);

      // Validate quantity
      let quantity = parseFloat(item.quantity);
      if (isNaN(quantity) || quantity <= 0) quantity = 1;

      // Validate unit
      let unit = item.unit?.toLowerCase() || 'pcs';
      if (!VALID_UNITS.includes(unit)) {
        unit = guessUnit(name, quantity);
      }

      // Validate category
      let category = item.category || 'Other';
      if (!DEFAULT_CATEGORIES.includes(category)) {
        category = guessCategory(name);
      }

      // Price
      let price: number | undefined;
      if (item.price && !isNaN(parseFloat(item.price))) {
        price = parseFloat(item.price);
      }

      return {
        name,
        quantity,
        unit,
        category,
        price,
        brand: item.brand || undefined,
      };
    });
}

function guessUnit(name: string, quantity: number): string {
  const lower = name.toLowerCase();
  // Items almost always counted individually, regardless of quantity size
  if (/egg|lemon|coconut|corn|cucumber|capsicum|brinjal|banana(?!\s?chips)/i.test(lower)) return 'nos';
  if (lower.includes('milk') || lower.includes('oil') || lower.includes('juice')) return 'L';
  if (lower.includes('water')) return 'L';
  if (quantity >= 100 && quantity <= 1000) return 'g'; // likely grams
  if (quantity > 1000) return 'mL';
  return 'pcs';
}

function guessCategory(name: string): string {
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

function suggestThreshold(item: ParsedInvoiceItem): number {
  // Suggest a reasonable low-stock threshold based on the item.
  // IMPORTANT: the threshold must always be strictly LESS than the quantity
  // just purchased, otherwise the item is immediately flagged as "low stock"
  // the moment it's added (status is currentQuantity <= threshold).
  const { quantity, unit } = item;

  let suggested: number;
  switch (unit) {
    case 'kg':
    case 'L':
      suggested = quantity * 0.2;
      break;
    case 'g':
    case 'mL':
    case 'mg':
      suggested = quantity * 0.2;
      break;
    case 'pcs':
    case 'nos':
    case 'pkt':
    case 'pouch':
    case 'sachet':
    case 'box':
    case 'can':
    case 'bag':
    case 'bottle':
    case 'btl':
    case 'jar':
    case 'tube':
    case 'bunch':
    case 'tray':
    case 'roll':
    case 'strip':
    case 'pair':
    case 'set':
      suggested = Math.floor(quantity * 0.2);
      break;
    case 'dz':
      suggested = quantity * 0.2;
      break;
    default:
      suggested = quantity * 0.2;
  }

  // Cap the threshold so it can never reach or exceed the purchased quantity.
  // For small quantities (e.g. quantity = 1), this results in threshold = 0,
  // meaning the item won't show "low stock" until it's actually used up.
  const maxAllowed = quantity > 1 ? quantity - 1 : 0;
  return Math.max(0, Math.min(suggested, maxAllowed));
}
