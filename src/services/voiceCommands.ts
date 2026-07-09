import { getApiKey } from './config';
import { createItem, getAllItems, logConsumption, addToShoppingList, restockItem } from '../database';
import { GroceryItemWithStatus } from '../database';
import { safeCategoryGuess, guessUnitFromName } from '../utils/itemClassifier';

export type ActionType = 'add_item' | 'log_usage' | 'add_to_shopping' | 'restock' | 'recipe' | 'unknown';

export interface ParsedCommand {
  action: ActionType;
  itemName: string;
  quantity: number;
  unit: string;
  category?: string;
  price?: number;
  confidence: 'high' | 'medium' | 'low';
  summary: string; // Human-readable summary of what will happen
  summaryHi: string; // Hindi summary
}

/**
 * Parses a natural language command into a structured pantry action using Gemini AI.
 * Examples:
 * - "Add 2 kg rice" → { action: 'add_item', itemName: 'Rice', quantity: 2, unit: 'kg' }
 * - "I used 500ml milk" → { action: 'log_usage', itemName: 'Milk', quantity: 0.5, unit: 'L' }
 * - "Buy eggs" → { action: 'add_to_shopping', itemName: 'Eggs', quantity: 12, unit: 'nos' }
 * - "Restock 1L oil" → { action: 'restock', itemName: 'Oil', quantity: 1, unit: 'L' }
 */
export async function parseVoiceCommand(command: string): Promise<ParsedCommand> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key not configured.');
  }

  if (!command.trim()) {
    throw new Error('Please enter a command.');
  }

  // Get existing items for context (helps AI match item names)
  const existingItems = await getAllItems();
  const itemNames = existingItems
    .map((i) => i.name)
    .slice(0, 30) // Limit to avoid huge prompts
    .join(', ');

  const prompt = `You are a pantry management assistant. Parse the following voice command into a structured action.

User's command: "${command}"

Existing pantry items: ${itemNames || 'None yet'}

Rules:
1. Determine the ACTION type:
   - "add", "bought", "got", "purchased", "new" → add_item (add new item to pantry)
   - "used", "consumed", "finished", "took", "made" → log_usage (deduct from existing item)
   - "buy", "need", "shopping", "get from store" → add_to_shopping (add to shopping list)
   - "restock", "refill", "topped up" → restock (add quantity to existing item)
   - "cook", "recipe", "suggest", "what to make", "what should I cook", "meal", "dinner ideas", "lunch ideas", "kya banau", "खाना" → recipe (suggest recipes)
   - If unclear → add_item (default)

2. Extract ITEM NAME (capitalize properly, e.g. "rice" → "Rice")
3. Extract QUANTITY (number, default 1 if not specified)
4. Extract UNIT (kg, L, mL, g, nos, pkt, etc. - infer from item if not specified)
5. Extract PRICE if mentioned (number after ₹ or "rupees" or "rs")
6. If the command matches an existing pantry item name (even partially), prefer that exact name

Respond ONLY with valid JSON (no markdown):
{
  "action": "add_item",
  "itemName": "Rice",
  "quantity": 2,
  "unit": "kg",
  "price": null,
  "confidence": "high",
  "summary": "Add 2 kg Rice to pantry",
  "summaryHi": "पैंट्री में 2 kg चावल जोड़ें"
}`;

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

  for (const model of models) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
        }),
      }
    );

    if (response.status === 429 || response.status === 503) {
      continue;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const parsed = JSON.parse(cleaned);
      return {
        action: parsed.action || 'add_item',
        itemName: parsed.itemName || command,
        quantity: parsed.quantity || 1,
        unit: parsed.unit || 'nos',
        category: parsed.category,
        price: parsed.price || undefined,
        confidence: parsed.confidence || 'medium',
        summary: parsed.summary || `${parsed.action}: ${parsed.itemName}`,
        summaryHi: parsed.summaryHi || parsed.summary || `${parsed.action}: ${parsed.itemName}`,
      };
    } catch {
      throw new Error('Failed to parse command. Please try rephrasing.');
    }
  }

  throw new Error('AI service unavailable. Please try again in a minute.');
}

/**
 * Executes a parsed command against the database.
 * Returns a success message.
 */
export async function executeCommand(cmd: ParsedCommand): Promise<string> {
  const existingItems = await getAllItems();

  switch (cmd.action) {
    case 'add_item': {
      const category = cmd.category || safeCategoryGuess(cmd.itemName);
      await createItem({
        name: cmd.itemName,
        category,
        unit: cmd.unit,
        currentQuantity: cmd.quantity,
        threshold: Math.max(1, Math.round(cmd.quantity * 0.2)),
        consumptionMode: 'manual',
        autoConsumptionRate: null,
        autoConsumptionFrequency: null,
        price: cmd.price || null,
        expiryDate: null,
      });
      return `Added ${cmd.quantity} ${cmd.unit} ${cmd.itemName} to pantry`;
    }

    case 'log_usage': {
      // Find matching existing item
      const match = findBestMatch(cmd.itemName, existingItems);
      if (!match) {
        throw new Error(`"${cmd.itemName}" not found in your pantry. Add it first.`);
      }
      if (match.currentQuantity < cmd.quantity) {
        throw new Error(`Only ${match.currentQuantity} ${match.unit} of ${match.name} available.`);
      }
      await logConsumption(match.id, cmd.quantity, 'manual', `Voice: used ${cmd.quantity} ${cmd.unit}`);
      return `Logged usage: ${cmd.quantity} ${match.unit} of ${match.name}`;
    }

    case 'add_to_shopping': {
      const category = cmd.category || safeCategoryGuess(cmd.itemName);
      await addToShoppingList(cmd.itemName, category, cmd.unit, cmd.quantity);
      return `Added ${cmd.itemName} to shopping list`;
    }

    case 'restock': {
      const match = findBestMatch(cmd.itemName, existingItems);
      if (!match) {
        throw new Error(`"${cmd.itemName}" not found in your pantry. Use "Add" instead.`);
      }
      await restockItem(match.id, cmd.quantity);
      return `Restocked ${match.name}: +${cmd.quantity} ${match.unit}`;
    }

    case 'recipe': {
      return '__NAVIGATE_RECIPE__';
    }

    default:
      throw new Error('Unknown action. Please try rephrasing your command.');
  }
}

/**
 * Finds the best matching item in the pantry by name (case-insensitive, partial match).
 */
function findBestMatch(name: string, items: GroceryItemWithStatus[]): GroceryItemWithStatus | null {
  const lower = name.toLowerCase();

  // Exact match first
  const exact = items.find((i) => i.name.toLowerCase() === lower);
  if (exact) return exact;

  // Partial match (item name contains the search term or vice versa)
  const partial = items.find(
    (i) => i.name.toLowerCase().includes(lower) || lower.includes(i.name.toLowerCase())
  );
  if (partial) return partial;

  // Word-level match (any word matches)
  const words = lower.split(/\s+/);
  const wordMatch = items.find((i) =>
    words.some((w) => i.name.toLowerCase().includes(w) && w.length > 2)
  );
  return wordMatch || null;
}
