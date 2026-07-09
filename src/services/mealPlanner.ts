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

  const prompt = `You are an Indian home cook. Create a COMPACT 7-day meal plan from these pantry items.

Pantry: ${ingredientsList}${expiryNote}${dietNote}

For each of 7 days (${weekDays.join(', ')}), give 3 meals + 1 snack.

KEEP RESPONSES SHORT:
- instructions: max 1 sentence
- ingredients: max 4 items per meal
- Use items expiring soon first

JSON format (no markdown):
{"days":[{"day":"${weekDays[0]}","meals":[{"mealType":"breakfast","name":"Name","ingredients":["a","b"],"instructions":"One line.","prepTime":"15 min","servings":2},{"mealType":"lunch","name":"Name","ingredients":["a","b"],"instructions":"One line.","prepTime":"25 min","servings":2},{"mealType":"dinner","name":"Name","ingredients":["a","b"],"instructions":"One line.","prepTime":"30 min","servings":2},{"mealType":"snack","name":"Name","ingredients":["a"],"instructions":"One line.","prepTime":"5 min","servings":2}]}],"missingIngredients":[],"shoppingList":[]}

Generate ALL 7 days in this compact format.`;

  // Call Gemini API
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

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
            maxOutputTokens: 16384, // 7 days needs a lot of space
          },
        }),
      }
    );

    if (response.status === 429 || response.status === 503) {
      continue; // Rate limited or overloaded - try next model
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
      // Try to salvage truncated response - find the last complete day object
      try {
        // Find the last complete "meals" array closing bracket
        let salvaged = cleaned;
        // Try progressively shorter substrings to find valid JSON
        for (let i = cleaned.length; i > 100; i = cleaned.lastIndexOf('}', i - 1)) {
          try {
            const attempt = cleaned.substring(0, i + 1) + '],"missingIngredients":[],"shoppingList":[]}';
            const test = JSON.parse(attempt);
            if (test.days && test.days.length >= 1) {
              parsed = test;
              break;
            }
          } catch {
            continue;
          }
        }
        if (!parsed) {
          throw new Error('Could not salvage');
        }
      } catch {
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
