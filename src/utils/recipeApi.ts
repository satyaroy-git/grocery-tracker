/**
 * Recipe suggestions with Indian cuisine focus.
 * Uses TheMealDB API (free) filtered to Indian recipes,
 * plus a built-in local database of popular Indian recipes.
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

// ============================================================
// BUILT-IN INDIAN RECIPES (no API needed, works offline)
// ============================================================

const INDIAN_RECIPES: Recipe[] = [
  {
    id: 'in_1', name: 'Dal Tadka', category: 'Main', area: 'Indian',
    thumbnail: 'https://www.themealdb.com/images/media/meals/wuxrtu1483564410.jpg',
    instructions: '1. Wash and pressure cook toor dal with turmeric for 3-4 whistles.\n2. Heat oil/ghee in a pan. Add cumin seeds, mustard seeds.\n3. Add chopped onions, sauté until golden.\n4. Add tomatoes, green chillies, ginger-garlic paste. Cook until soft.\n5. Add red chilli powder, coriander powder, salt.\n6. Add cooked dal, mix well. Simmer 5 mins.\n7. Garnish with coriander leaves and serve with rice or roti.',
    ingredients: ['toor dal', 'turmeric', 'cumin seeds', 'mustard seeds', 'onion', 'tomato', 'green chilli', 'ginger', 'garlic', 'red chilli powder', 'coriander powder', 'salt', 'oil', 'coriander leaves'],
    sourceUrl: null,
  },
  {
    id: 'in_2', name: 'Aloo Gobi', category: 'Main', area: 'Indian',
    thumbnail: 'https://www.themealdb.com/images/media/meals/1xxsyv1511386832.jpg',
    instructions: '1. Cut cauliflower into florets and potato into cubes.\n2. Heat oil, add cumin seeds and let them splutter.\n3. Add chopped onions, cook until translucent.\n4. Add ginger-garlic paste, sauté 1 min.\n5. Add turmeric, red chilli powder, coriander powder.\n6. Add potatoes, cook 5 mins covered.\n7. Add cauliflower, salt, cover and cook 10-12 mins.\n8. Garnish with coriander and serve with roti.',
    ingredients: ['potato', 'cauliflower', 'onion', 'cumin seeds', 'turmeric', 'red chilli powder', 'coriander powder', 'ginger', 'garlic', 'oil', 'salt', 'coriander leaves'],
    sourceUrl: null,
  },
  {
    id: 'in_3', name: 'Paneer Butter Masala', category: 'Main', area: 'Indian',
    thumbnail: 'https://www.themealdb.com/images/media/meals/pprrtw1511027813.jpg',
    instructions: '1. Soak cashews in warm water for 15 mins, blend into paste.\n2. Heat butter, add cumin, cardamom, bay leaf.\n3. Add onion puree, cook until golden.\n4. Add ginger-garlic paste, cook 2 mins.\n5. Add tomato puree, cook until oil separates.\n6. Add red chilli, turmeric, garam masala, salt.\n7. Add cashew paste and cream, simmer 5 mins.\n8. Add paneer cubes, cook 3-4 mins. Serve with naan.',
    ingredients: ['paneer', 'butter', 'onion', 'tomato', 'cashew', 'cream', 'ginger', 'garlic', 'cumin seeds', 'garam masala', 'red chilli powder', 'turmeric', 'salt'],
    sourceUrl: null,
  },
  {
    id: 'in_4', name: 'Chole (Chickpea Curry)', category: 'Main', area: 'Indian',
    thumbnail: 'https://www.themealdb.com/images/media/meals/tkxquw1505309329.jpg',
    instructions: '1. Soak chickpeas overnight, pressure cook until soft.\n2. Heat oil, add cumin, bay leaf, cinnamon.\n3. Add onions, cook until brown.\n4. Add ginger-garlic paste, tomatoes, cook until mushy.\n5. Add chole masala, turmeric, red chilli, salt.\n6. Add cooked chickpeas with water, simmer 15 mins.\n7. Garnish with onion rings, lemon, coriander.\n8. Serve with bhatura or rice.',
    ingredients: ['chickpeas', 'onion', 'tomato', 'ginger', 'garlic', 'cumin seeds', 'cinnamon', 'bay leaf', 'turmeric', 'red chilli powder', 'chole masala', 'salt', 'oil', 'lemon', 'coriander leaves'],
    sourceUrl: null,
  },
  {
    id: 'in_5', name: 'Egg Curry', category: 'Main', area: 'Indian',
    thumbnail: 'https://www.themealdb.com/images/media/meals/1529446352.jpg',
    instructions: '1. Boil eggs, peel and make slight cuts.\n2. Heat oil, add cumin seeds, onions. Sauté until golden.\n3. Add ginger-garlic paste, cook 1 min.\n4. Add tomato puree, turmeric, chilli powder, coriander powder.\n5. Cook until oil separates.\n6. Add water, bring to boil.\n7. Add eggs, simmer 10 mins.\n8. Garnish with coriander, serve with rice.',
    ingredients: ['egg', 'onion', 'tomato', 'ginger', 'garlic', 'cumin seeds', 'turmeric', 'red chilli powder', 'coriander powder', 'salt', 'oil', 'coriander leaves'],
    sourceUrl: null,
  },
  {
    id: 'in_6', name: 'Jeera Rice', category: 'Side', area: 'Indian',
    thumbnail: 'https://www.themealdb.com/images/media/meals/kos8861511458537.jpg',
    instructions: '1. Wash and soak basmati rice for 20 mins.\n2. Heat ghee, add cumin seeds, bay leaf, cloves.\n3. Let cumin splutter, add drained rice.\n4. Sauté 2 mins, add water (1:1.5 ratio), salt.\n5. Bring to boil, cover and cook on low 12-15 mins.\n6. Fluff with fork, serve with dal or curry.',
    ingredients: ['rice', 'ghee', 'cumin seeds', 'bay leaf', 'cloves', 'salt', 'water'],
    sourceUrl: null,
  },
  {
    id: 'in_7', name: 'Palak Paneer', category: 'Main', area: 'Indian',
    thumbnail: 'https://www.themealdb.com/images/media/meals/yuwtuu1511295751.jpg',
    instructions: '1. Blanch spinach in boiling water 2 mins, transfer to ice water.\n2. Blend spinach into smooth puree.\n3. Heat oil, add cumin, garlic, green chilli. Sauté 1 min.\n4. Add onion, cook until soft.\n5. Add spinach puree, turmeric, salt, garam masala.\n6. Simmer 5 mins, add cream.\n7. Add paneer cubes, cook 3 mins.\n8. Serve hot with roti or naan.',
    ingredients: ['spinach', 'paneer', 'onion', 'garlic', 'green chilli', 'cumin seeds', 'turmeric', 'garam masala', 'cream', 'oil', 'salt'],
    sourceUrl: null,
  },
  {
    id: 'in_8', name: 'Chicken Curry', category: 'Main', area: 'Indian',
    thumbnail: 'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg',
    instructions: '1. Marinate chicken with yogurt, turmeric, chilli powder for 30 mins.\n2. Heat oil, add whole spices (cardamom, cinnamon, cloves).\n3. Add onions, cook until brown.\n4. Add ginger-garlic paste, cook 2 mins.\n5. Add tomatoes, cook until mushy.\n6. Add marinated chicken, cook on high 5 mins.\n7. Add water, cover and simmer 20 mins.\n8. Add garam masala, garnish with coriander. Serve with rice.',
    ingredients: ['chicken', 'yogurt', 'onion', 'tomato', 'ginger', 'garlic', 'turmeric', 'red chilli powder', 'garam masala', 'cardamom', 'cinnamon', 'cloves', 'oil', 'salt', 'coriander leaves'],
    sourceUrl: null,
  },
  {
    id: 'in_9', name: 'Masala Omelette', category: 'Breakfast', area: 'Indian',
    thumbnail: 'https://www.themealdb.com/images/media/meals/1550441275.jpg',
    instructions: '1. Beat eggs with salt, turmeric, red chilli powder.\n2. Add finely chopped onion, tomato, green chilli, coriander.\n3. Heat oil in a pan.\n4. Pour egg mixture, cook on medium heat.\n5. Flip when bottom is set, cook other side.\n6. Serve hot with bread or paratha.',
    ingredients: ['egg', 'onion', 'tomato', 'green chilli', 'coriander leaves', 'turmeric', 'red chilli powder', 'salt', 'oil'],
    sourceUrl: null,
  },
  {
    id: 'in_10', name: 'Rajma (Kidney Bean Curry)', category: 'Main', area: 'Indian',
    thumbnail: 'https://www.themealdb.com/images/media/meals/kp0fts1511813860.jpg',
    instructions: '1. Soak rajma overnight, pressure cook until soft.\n2. Heat oil, add cumin seeds, bay leaf.\n3. Add onions, sauté until golden.\n4. Add ginger-garlic paste, tomatoes. Cook until oil separates.\n5. Add turmeric, red chilli, coriander powder, garam masala.\n6. Add cooked rajma with liquid, simmer 15-20 mins.\n7. Mash a few beans for thickness.\n8. Garnish with coriander, serve with jeera rice.',
    ingredients: ['rajma', 'onion', 'tomato', 'ginger', 'garlic', 'cumin seeds', 'bay leaf', 'turmeric', 'red chilli powder', 'coriander powder', 'garam masala', 'salt', 'oil', 'coriander leaves'],
    sourceUrl: null,
  },
  {
    id: 'in_11', name: 'Poha (Flattened Rice)', category: 'Breakfast', area: 'Indian',
    thumbnail: 'https://www.themealdb.com/images/media/meals/1525876468.jpg',
    instructions: '1. Wash poha in water, drain and set aside.\n2. Heat oil, add mustard seeds, curry leaves, peanuts.\n3. Add chopped onion, green chilli. Sauté 2 mins.\n4. Add turmeric, salt, sugar.\n5. Add drained poha, mix gently.\n6. Cook 3-4 mins on low heat.\n7. Squeeze lemon juice, garnish with coriander and sev.',
    ingredients: ['poha', 'onion', 'mustard seeds', 'curry leaves', 'peanuts', 'green chilli', 'turmeric', 'salt', 'sugar', 'lemon', 'oil', 'coriander leaves'],
    sourceUrl: null,
  },
  {
    id: 'in_12', name: 'Maggi Masala Noodles', category: 'Snack', area: 'Indian',
    thumbnail: 'https://www.themealdb.com/images/media/meals/ustsqw1468250014.jpg',
    instructions: '1. Boil water in a pan.\n2. Add Maggi noodles and tastemaker.\n3. Cook 2-3 mins, stirring occasionally.\n4. For extra flavor: sauté onion, tomato, peas in oil first.\n5. Add cooked noodles to the vegetables, mix well.\n6. Serve hot.',
    ingredients: ['maggi', 'onion', 'tomato', 'peas', 'oil', 'water'],
    sourceUrl: null,
  },
];

// ============================================================
// RECIPE MATCHING
// ============================================================

/**
 * Get recipe suggestions based on pantry ingredients.
 * First checks local Indian recipes, then fetches from TheMealDB.
 */
export async function getRecipeSuggestions(
  pantryIngredients: string[]
): Promise<{ recipe: Recipe; matchedIngredients: string[] }[]> {
  const pantryLower = pantryIngredients.map((i) => i.toLowerCase().split(' ')[0]);
  const results: { recipe: Recipe; matchedIngredients: string[] }[] = [];

  // Match against local Indian recipes
  for (const recipe of INDIAN_RECIPES) {
    const matched: string[] = [];
    for (const pantryItem of pantryLower) {
      if (pantryItem.length < 3) continue;
      for (const recipeIngredient of recipe.ingredients) {
        if (recipeIngredient.includes(pantryItem) || pantryItem.includes(recipeIngredient)) {
          matched.push(pantryItem);
          break;
        }
      }
    }
    if (matched.length >= 2) {
      results.push({ recipe, matchedIngredients: [...new Set(matched)] });
    }
  }

  // Sort by match count
  results.sort((a, b) => b.matchedIngredients.length - a.matchedIngredients.length);

  // Also try TheMealDB for Indian recipes
  try {
    const topIngredient = pantryLower.find((i) => i.length > 3) || pantryLower[0];
    if (topIngredient) {
      const apiRecipes = await searchMealDbIndian(topIngredient);
      for (const recipe of apiRecipes) {
        if (!results.find((r) => r.recipe.name === recipe.name)) {
          results.push({ recipe, matchedIngredients: [topIngredient] });
        }
      }
    }
  } catch (e) {
    // API failure is fine, we have local recipes
  }

  return results.slice(0, 12);
}

async function searchMealDbIndian(ingredient: string): Promise<Recipe[]> {
  try {
    const response = await fetch(
      `https://www.themealdb.com/api/json/v1/1/filter.php?a=Indian`
    );
    if (!response.ok) return [];
    const data = await response.json();
    if (!data.meals) return [];

    return data.meals.slice(0, 5).map((meal: any) => ({
      id: meal.idMeal,
      name: meal.strMeal,
      category: '',
      area: 'Indian',
      thumbnail: meal.strMealThumb,
      instructions: '',
      ingredients: [],
      sourceUrl: null,
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Get full recipe details by ID
 */
export async function getRecipeDetails(id: string): Promise<Recipe | null> {
  // Check local recipes first
  const local = INDIAN_RECIPES.find((r) => r.id === id);
  if (local) return local;

  // Fetch from TheMealDB
  try {
    const response = await fetch(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.meals || data.meals.length === 0) return null;

    const meal = data.meals[0];
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
    return null;
  }
}
