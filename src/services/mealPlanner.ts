import { getApiKey } from './config';
import { getAllItems } from '../database';
import { GroceryItemWithStatus } from '../database';

export interface MealItem {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  ingredients: string[];
  instructions: string;
  prepTime: string;
  servings: number;
}

export interface DayPlan {
  day: string; // e.g. "Monday", "Tuesday"
  date: string; // e.g. "2026-07-07"
  meals: MealItem[];
}

export interface WeeklyMealPlan {
  startDate: string;
  endDate: string;
  days: DayPlan[];
  missingIngredients: string[]; // Items needed but not in pantry
  shoppingList: { name: string; quantity: string }[];
}

/**
 * Generates a 7-day meal plan based on available pantry items.
 * Identifies missing ingredients and suggests a shopping list.
 */
export async function generateWeeklyMealPlan(
  dietPreference?: string
): Promise<WeeklyMealPlan> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key not configured. Please add your API key in the Scan Invoice screen.');
  }

  const items = await getAllItems();
  if (items.length === 0) {
    throw new Error('Your pantry is empty. Add some items first to generate a meal plan.');
  }

  // Build available ingredients list
  const ingredientsList = items
    .filter((item) => item.currentQuantity > 0)
    .map((item) => `${item.name} (${item.currentQuantity} ${item.unit})`)
    .join(', ');

  // Build expiring-soon priority list
  const expiringSoon = items
    .filter((item) => item.daysUntilExpiry !== null && item.daysUntilExpiry >= 0 && item.daysUntilExpiry <= 5)
    .map((item) => item.name);

  const expiryNote = expiringSoon.length > 0
    ? `\n\nIMPORTANT: These items are expiring soon and should be used first in the earlier days: ${expiringSoon.join(', ')}`
    : '';

  const dietNote = dietPreference
    ? `\n\nDietary preference: ${dietPreference}`
    : '';

  // Calculate week dates
  const today = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    weekDays.push(dayNames[d.getDay()]);
  }

  const prompt = `You are an expert Indian home cook and meal planning assistant. Create a complete 7-day meal plan based on available ingredients.

Available ingredients in pantry: ${ingredientsList}${expiryNote}${dietNote}

Rules:
1. Plan 3 meals + 1 snack for each of the 7 days (${weekDays.join(', ')})
2. Use available ingredients as much as possible
3. Prioritize items that are expiring soon (use them in the first 2-3 days)
4. Don't repeat the same meal within the week
5. Maintain nutritional balance (protein, carbs, vegetables)
6. Keep recipes practical for Indian home cooking (under 30-45 mins)
7. You can assume basic spices/staples are available (salt, oil, spices, water)
8. If some meals need ingredients NOT in the pantry, list them in missingIngredients
9. Keep instructions brief (2-3 sentences max per recipe)

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "days": [
    {
      "day": "${weekDays[0]}",
      "meals": [
        {"mealType": "breakfast", "name": "Recipe", "ingredients": ["item1", "item2"], "instructions": "Brief steps.", "prepTime": "15 mins", "servings": 2},
        {"mealType": "lunch", "name": "Recipe", "ingredients": ["item1", "item2"], "instructions": "Brief steps.", "prepTime": "30 mins", "servings": 2},
        {"mealType": "dinner", "name": "Recipe", "ingredients": ["item1", "item2"], "instructions": "Brief steps.", "prepTime": "30 mins", "servings": 2},
        {"mealType": "snack", "name": "Recipe", "ingredients": ["item1", "item2"], "instructions": "Brief steps.", "prepTime": "10 mins", "servings": 2}
      ]
    }
  ],
  "missingIngredients": ["ingredient not in pantry 1", "ingredient 2"],
  "shoppingList": [
    {"name": "ingredient name", "quantity": "500g"}
  ]
}

Generate all 7 days. Keep the JSON compact to fit within limits.`;

  // Call Gemini API
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash-lite'];

  for (const model of models) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192, // 7 days needs more tokens
          },
        }),
      }
    );

    if (response.status === 429) {
      continue; // Try next model
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!textContent) {
      throw new Error('AI returned an empty response. Please try again.');
    }

    // Parse JSON
    const cleaned = textContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Try to salvage truncated response
      const lastBrace = cleaned.lastIndexOf('}');
      if (lastBrace > 0) {
        try {
          // Try closing the arrays/objects
          let salvaged = cleaned.substring(0, lastBrace + 1);
          // Count open brackets to close them
          const openSquare = (salvaged.match(/\[/g) || []).length;
          const closeSquare = (salvaged.match(/\]/g) || []).length;
          const openCurly = (salvaged.match(/\{/g) || []).length;
          const closeCurly = (salvaged.match(/\}/g) || []).length;
          salvaged += ']'.repeat(Math.max(0, openSquare - closeSquare));
          salvaged += '}'.repeat(Math.max(0, openCurly - closeCurly - 1)) + '}';
          parsed = JSON.parse(salvaged);
        } catch {
          throw new Error('AI response was incomplete. Please try again.');
        }
      } else {
        throw new Error('AI response was incomplete. Please try again.');
      }
    }

    if (!parsed.days || !Array.isArray(parsed.days) || parsed.days.length === 0) {
      throw new Error('Invalid meal plan format. Please try again.');
    }

    // Calculate dates for each day
    const startDate = today.toISOString().split('T')[0];
    const endDateObj = new Date(today);
    endDateObj.setDate(today.getDate() + 6);
    const endDate = endDateObj.toISOString().split('T')[0];

    // Add dates to each day
    const daysWithDates: DayPlan[] = parsed.days.map((day: any, idx: number) => {
      const d = new Date(today);
      d.setDate(today.getDate() + idx);
      return {
        day: day.day || weekDays[idx],
        date: d.toISOString().split('T')[0],
        meals: day.meals || [],
      };
    });

    return {
      startDate,
      endDate,
      days: daysWithDates,
      missingIngredients: parsed.missingIngredients || [],
      shoppingList: parsed.shoppingList || [],
    };
  }

  throw new Error('Rate limit reached. Please wait 1-2 minutes and try again.');
}
