import * as FileSystem from 'expo-file-system';
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

// The LLM prompt specifically designed for Indian grocery invoice parsing
const INVOICE_PARSE_PROMPT = `You are a grocery invoice parser specialized in Indian online grocery delivery platforms (Blinkit, Swiggy Instamart, BigBasket, Zepto, JioMart, Amazon Fresh, DMart Ready).

Analyze the provided grocery invoice image and extract ALL purchased items.

For each item, provide:
1. "name": Clean product name (remove brand prefixes if it's a common item, keep brand for branded products)
2. "quantity": Numeric quantity purchased (parse from "2 x 500g" as quantity=2, or "1 kg" as quantity=1)
3. "unit": One of: "kg", "g", "L", "mL", "pcs", "pkt", "btl", "dz", "box", "can", "bag"
4. "category": One of: "Dairy", "Fruits", "Vegetables", "Grains & Cereals", "Snacks", "Beverages", "Spices & Condiments", "Meat & Seafood", "Bakery", "Frozen", "Personal Care", "Household", "Other"
5. "price": Price paid for this item (number, INR)
6. "brand": Brand name if visible

IMPORTANT RULES:
- Parse weight/volume from product names: "Amul Toned Milk 500ml" → unit: "mL", quantity: 500
- For packaged items sold as packs: "Maggi Noodles 4-pack" → unit: "pkt", quantity: 4
- If quantity shows "2 x 1L Milk", that means 2 items of 1L each → quantity: 2, unit: "L"  
- Normalize names: remove excessive brand/variant text, keep it recognizable
- For produce sold by weight: "Onion 1kg" → name: "Onion", quantity: 1, unit: "kg"
- Recognize common Indian grocery items and categorize appropriately
- Items like "Atta" → "Grains & Cereals", "Ghee" → "Dairy", "Haldi" → "Spices & Condiments"

Return a JSON object with this structure:
{
  "storeName": "detected store name or null",
  "invoiceDate": "date if visible in YYYY-MM-DD format or null",
  "totalAmount": total bill amount as number or null,
  "items": [
    {
      "name": "Item Name",
      "quantity": 1,
      "unit": "kg",
      "category": "Category",
      "price": 50,
      "brand": "Brand or null"
    }
  ]
}

Return ONLY valid JSON, no markdown formatting, no code blocks.`;

/**
 * Parse a grocery invoice image using OpenAI GPT-4 Vision API
 */
export async function parseInvoiceImage(imageUri: string): Promise<InvoiceParseResult> {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return {
        success: false,
        items: [],
        error: 'OpenAI API key not configured. Please set it in Settings.',
      };
    }

    // Read the image as base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Determine image MIME type from URI
    const mimeType = getMimeType(imageUri);

    // Call OpenAI GPT-4 Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: INVOICE_PARSE_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please parse this grocery invoice image and extract all items with their details.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 4096,
        temperature: 0.1, // Low temperature for accurate extraction
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMsg = errorData?.error?.message || `API request failed with status ${response.status}`;
      return {
        success: false,
        items: [],
        error: `OpenAI API Error: ${errorMsg}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        items: [],
        error: 'No response from AI model.',
      };
    }

    // Parse the JSON response
    const parsed = parseJsonResponse(content);
    if (!parsed) {
      return {
        success: false,
        items: [],
        error: 'Failed to parse AI response. The invoice might be unclear.',
      };
    }

    // Validate and clean the items
    const validatedItems = validateAndCleanItems(parsed.items || []);

    return {
      success: true,
      items: validatedItems,
      storeName: parsed.storeName || undefined,
      invoiceDate: parsed.invoiceDate || undefined,
      totalAmount: parsed.totalAmount || undefined,
    };
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
 * Parse invoice from text (for copy-pasted invoice text)
 */
export async function parseInvoiceText(invoiceText: string): Promise<InvoiceParseResult> {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return {
        success: false,
        items: [],
        error: 'OpenAI API key not configured. Please set it in Settings.',
      };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: INVOICE_PARSE_PROMPT,
          },
          {
            role: 'user',
            content: `Please parse this grocery invoice/order text and extract all items:\n\n${invoiceText}`,
          },
        ],
        max_tokens: 4096,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMsg = errorData?.error?.message || `API request failed with status ${response.status}`;
      return {
        success: false,
        items: [],
        error: `OpenAI API Error: ${errorMsg}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        items: [],
        error: 'No response from AI model.',
      };
    }

    const parsed = parseJsonResponse(content);
    if (!parsed) {
      return {
        success: false,
        items: [],
        error: 'Failed to parse AI response.',
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

const VALID_UNITS = ['kg', 'g', 'L', 'mL', 'pcs', 'pkt', 'btl', 'dz', 'box', 'can', 'bag'];

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
  if (lower.includes('milk') || lower.includes('oil') || lower.includes('juice')) return 'L';
  if (lower.includes('water')) return 'L';
  if (quantity >= 100 && quantity <= 1000) return 'g'; // likely grams
  if (quantity > 1000) return 'mL';
  return 'pcs';
}

function guessCategory(name: string): string {
  const lower = name.toLowerCase();

  if (/milk|curd|paneer|cheese|butter|ghee|yogurt|dahi/i.test(lower)) return 'Dairy';
  if (/apple|banana|mango|orange|grape|papaya|fruit/i.test(lower)) return 'Fruits';
  if (/onion|tomato|potato|carrot|spinach|capsicum|vegetable|sabzi/i.test(lower)) return 'Vegetables';
  if (/rice|atta|flour|dal|lentil|wheat|oats|cereal|bread/i.test(lower)) return 'Grains & Cereals';
  if (/chips|biscuit|cookie|namkeen|snack|chocolate/i.test(lower)) return 'Snacks';
  if (/tea|coffee|juice|soda|water|drink|cola/i.test(lower)) return 'Beverages';
  if (/salt|sugar|turmeric|haldi|jeera|cumin|masala|spice|sauce|ketchup/i.test(lower)) return 'Spices & Condiments';
  if (/chicken|mutton|fish|egg|prawn|meat/i.test(lower)) return 'Meat & Seafood';
  if (/soap|shampoo|toothpaste|cream|lotion|deo/i.test(lower)) return 'Personal Care';
  if (/detergent|cleaner|mop|tissue|trash/i.test(lower)) return 'Household';

  return 'Other';
}

function suggestThreshold(item: ParsedInvoiceItem): number {
  // Suggest a reasonable threshold based on the item
  const { quantity, unit } = item;

  switch (unit) {
    case 'kg':
      return Math.max(0.25, quantity * 0.2);
    case 'g':
      return Math.max(50, quantity * 0.2);
    case 'L':
      return Math.max(0.25, quantity * 0.2);
    case 'mL':
      return Math.max(100, quantity * 0.2);
    case 'pcs':
      return Math.max(1, Math.floor(quantity * 0.2));
    case 'pkt':
      return 1;
    default:
      return Math.max(1, Math.floor(quantity * 0.2));
  }
}
