import { getApiKey } from './config';
import { getAllItems } from '../database';

export interface RecipeSuggestion {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  ingredients: string[];
  instructions: string;
  prepTime: string;
  servings: number;
}

export interface DailyMealPlan {
  date: string;
  meals: RecipeSuggestion[];
}

/**
 * Generates daily recipe suggestions based on items currently in the pantry.
 * Uses Gemini AI to create practical meal ideas from available ingredients.
 */
export async function generateRecipeSuggestions(): Promise<DailyMealPlan | null> {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      throw new Error('Gemini API key not configured. Please add your API key in the Scan Invoice screen.');
    }

    const items = await getAllItems();
    if (items.length === 0) {
      throw new Error('Your pantry is empty. Add some items first to get recipe suggestions.');
    }

    // Build a list of available ingredients with quantities
    const ingredientsList = items
      .filter((item) => item.currentQuantity > 0)
      .map((item) => `${item.name} (${item.currentQuantity} ${item.unit})`)
      .join(', ');

    const prompt = `You are a helpful Indian home cook assistant. Based on the following ingredients available in my pantry, suggest a daily meal plan with 4 meals: breakfast, lunch, dinner, and a snack.

Available ingredients: ${ingredientsList}

Rules:
1. Only use ingredients from the list above (you can assume basic spices like salt, pepper, turmeric, chili powder are available)
2. Suggest practical, everyday Indian home-style recipes
3. Keep recipes simple (under 30 minutes prep for most)
4. Consider nutritional balance across the day
5. If ingredients are limited, suggest simpler recipes

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
{
  "meals": [
    {
      "mealType": "breakfast",
      "name": "Recipe Name",
      "ingredients": ["ingredient 1", "ingredient 2"],
      "instructions": "Step by step instructions in 2-3 sentences.",
      "prepTime": "15 mins",
      "servings": 2
    },
    {
      "mealType": "lunch",
      "name": "Recipe Name",
      "ingredients": ["ingredient 1", "ingredient 2"],
      "instructions": "Step by step instructions in 2-3 sentences.",
      "prepTime": "30 mins",
      "servings": 2
    },
    {
      "mealType": "dinner",
      "name": "Recipe Name",
      "ingredients": ["ingredient 1", "ingredient 2"],
      "instructions": "Step by step instructions in 2-3 sentences.",
      "prepTime": "30 mins",
      "servings": 2
    },
    {
      "mealType": "snack",
      "name": "Recipe Name",
      "ingredients": ["ingredient 1", "ingredient 2"],
      "instructions": "Step by step instructions in 2-3 sentences.",
      "prepTime": "10 mins",
      "servings": 2
    }
  ]
}`;

    // Try gemini-2.5-flash first (same model used for invoice scanning),
    // fall back to gemini-2.0-flash-lite if rate limited
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
    let lastError = '';

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
              maxOutputTokens: 4096,
            },
          }),
        }
      );

      if (response.status === 429 || response.status === 503) {
        // Rate limited or overloaded on this model - try the next one
        const errorData = await response.json().catch(() => null);
        lastError = errorData?.error?.message || 'Rate limit exceeded';
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error?.message || `Gemini API error: ${response.status}`
        );
      }

      const data = await response.json();
      const textContent =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!textContent) {
        throw new Error('AI returned an empty response. Please try again.');
      }

      // Parse the JSON response (strip any markdown code blocks if present)
      const cleaned = textContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        // If JSON is truncated, try to salvage what we can
        // Attempt to find the last complete meal object
        const lastBracket = cleaned.lastIndexOf('}');
        if (lastBracket > 0) {
          try {
            const salvaged = cleaned.substring(0, lastBracket + 1) + ']}';
            parsed = JSON.parse(salvaged);
          } catch {
            throw new Error('AI response was incomplete. Please try again — this usually works on a second attempt.');
          }
        } else {
          throw new Error('AI response was incomplete. Please try again — this usually works on a second attempt.');
        }
      }

      if (!parsed.meals || !Array.isArray(parsed.meals) || parsed.meals.length === 0) {
        throw new Error('AI returned an invalid format. Please try again.');
      }

      const today = new Date().toISOString().split('T')[0];

      return {
        date: today,
        meals: parsed.meals as RecipeSuggestion[],
      };
    }

    // All models rate limited
    throw new Error(
      'Gemini API rate limit reached. The free tier has a limited number of requests per minute. Please wait 1-2 minutes and try again.\n\nTip: If this happens frequently, upgrade to a paid Gemini plan at https://ai.google.dev/pricing'
    );
  } catch (error: any) {
    throw new Error(error.message || 'Failed to generate recipe suggestions');
  }
}
