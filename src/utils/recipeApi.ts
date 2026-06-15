/**
 * Recipe suggestions based on pantry ingredients.
 * Uses TheMealDB free API (no API key needed for basic access).
 */

export interface Recipe {
  id: string;
  name: string;
  category: string;
  area: string;
  thumbnail: string;
  instructions: string;
  ingredients: string[];
  sourceUrl: string | null;
}

/**
 * Search for recipes that use a given ingredient
 */
export async function searchRecipesByIngredient(ingredient: string): Promise<Recipe[]> {
  try {
    const response = await fetch(
      `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`
    );
    if (!response.ok) return [];

    const data = await response.json();
    if (!data.meals) return [];

    // Return basic info (without full details)
    return data.meals.slice(0, 5).map((meal: any) => ({
      id: meal.idMeal,
      name: meal.strMeal,
      category: '',
      area: '',
      thumbnail: meal.strMealThumb,
      instructions: '',
      ingredients: [],
      sourceUrl: null,
    }));
  } catch (error) {
    console.error('Recipe search failed:', error);
    return [];
  }
}

/**
 * Get full recipe details by ID
 */
export async function getRecipeDetails(id: string): Promise<Recipe | null> {
  try {
    const response = await fetch(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`
    );
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.meals || data.meals.length === 0) return null;

    const meal = data.meals[0];

    // Extract ingredients
    const ingredients: string[] = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (ingredient && ingredient.trim()) {
        ingredients.push(`${measure?.trim() || ''} ${ingredient.trim()}`.trim());
      }
    }

    return {
      id: meal.idMeal,
      name: meal.strMeal,
      category: meal.strCategory || '',
      area: meal.strArea || '',
      thumbnail: meal.strMealThumb || '',
      instructions: meal.strInstructions || '',
      ingredients,
      sourceUrl: meal.strSource || null,
    };
  } catch (error) {
    console.error('Recipe details failed:', error);
    return null;
  }
}

/**
 * Get recipe suggestions based on multiple pantry ingredients.
 * Searches for each ingredient and returns unique recipes sorted by match count.
 */
export async function getRecipeSuggestions(
  pantryIngredients: string[]
): Promise<{ recipe: Recipe; matchedIngredients: string[] }[]> {
  // Use top 5 ingredients for searching (API rate limits)
  const searchTerms = pantryIngredients
    .map((i) => i.toLowerCase().split(' ')[0]) // Use first word (e.g., "chicken" from "Chicken Breast 500g")
    .filter((term) => term.length > 2)
    .slice(0, 5);

  const allRecipes: Map<string, { recipe: Recipe; matched: Set<string> }> = new Map();

  for (const term of searchTerms) {
    const recipes = await searchRecipesByIngredient(term);
    for (const recipe of recipes) {
      if (allRecipes.has(recipe.id)) {
        allRecipes.get(recipe.id)!.matched.add(term);
      } else {
        allRecipes.set(recipe.id, { recipe, matched: new Set([term]) });
      }
    }
  }

  // Sort by number of matched ingredients (most matches first)
  const results = Array.from(allRecipes.values())
    .map(({ recipe, matched }) => ({
      recipe,
      matchedIngredients: Array.from(matched),
    }))
    .sort((a, b) => b.matchedIngredients.length - a.matchedIngredients.length)
    .slice(0, 10);

  return results;
}
