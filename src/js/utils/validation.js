export function validateFoodData(foodData) {
  const warnings = [];
  if (typeof foodData !== 'object' || foodData === null) {
    warnings.push('Invalid food data format');
    return { isValid: false, warnings };
  }

  for (const [foodName, food] of Object.entries(foodData)) {
    if (typeof foodName !== 'string') {
      warnings.push(`Invalid food name: ${foodName}`);
      continue;
    }
    if (typeof food.category !== 'string') {
      warnings.push(`Missing or invalid category for food: ${foodName}`);
    }
    if (typeof food.cal_per_gram !== 'number' || food.cal_per_gram <= 0) {
      warnings.push(`Invalid calories per gram for food: ${foodName}`);
    }
  }

  return { isValid: warnings.length === 0, warnings };
}

export function validateRecipeData(recipeData) {
  const warnings = [];
  if (!Array.isArray(recipeData)) {
    warnings.push('Invalid recipe data format');
    return { isValid: false, warnings };
  }

  for (const category of recipeData) {
    if (typeof category.category !== 'string') {
      warnings.push('Missing or invalid category name in recipe data');
      continue;
    }
    if (!Array.isArray(category.recipes)) {
      warnings.push(`Invalid recipes array for category: ${category.category}`);
      continue;
    }

    for (const recipe of category.recipes) {
      if (typeof recipe.name !== 'string') {
        warnings.push(`Invalid recipe name in category: ${category.category}`);
      }
      if (typeof recipe.servings !== 'number' || recipe.servings <= 0) {
        warnings.push(`Invalid servings for recipe: ${recipe.name}`);
      }
      if (!Array.isArray(recipe.foods)) {
        warnings.push(`Invalid foods array for recipe: ${recipe.name}`);
        continue;
      }
      if (!Array.isArray(recipe.notes)) {
        warnings.push(`Invalid notes array for recipe: ${recipe.name}`);
      }

      for (const food of recipe.foods) {
        if (typeof food.name !== 'string') {
          warnings.push(`Invalid food name in recipe: ${recipe.name}`);
        }
        if (typeof food.calories !== 'number' || food.calories <= 0) {
          warnings.push(`Invalid calories for food ${food.name} in recipe: ${recipe.name}`);
        }
      }
    }
  }

  return { isValid: warnings.length === 0, warnings };
} 