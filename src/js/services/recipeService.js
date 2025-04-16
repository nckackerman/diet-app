import { cache } from '../utils/cache.js';
import { logger } from '../utils/logger.js';
import { validateRecipeData } from '../utils/validation.js';

const CACHE_KEY_RECIPES = 'diet-app-recipes';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export class RecipeService {
  constructor(foodService) {
    this.foodService = foodService;
    this.recipes = [];
    this.originalRecipes = [];
  }

  async loadRecipes() {
    try {
      const cachedRecipes = cache.get(CACHE_KEY_RECIPES);
      if (cachedRecipes) {
        logger.info('Using cached recipe data');
        this.recipes = cachedRecipes;
        this.originalRecipes = JSON.parse(JSON.stringify(cachedRecipes));
        // Load custom notes after recipes are loaded
        this.loadCustomNotes();
        return this.recipes;
      }

      const data = await this.fetchWithRetry('data/recipes.json');
      const { isValid, warnings } = validateRecipeData(data);
      
      if (!isValid) {
        logger.error('Recipe data validation failed', { warnings });
        throw new Error('Invalid recipe data');
      }
      
      this.recipes = data;
      this.originalRecipes = JSON.parse(JSON.stringify(data));
      cache.set(CACHE_KEY_RECIPES, data);
      // Load custom notes after recipes are loaded
      this.loadCustomNotes();
      return this.recipes;
    } catch (error) {
      logger.error('Error loading recipes', { error });
      throw error;
    }
  }

  loadCustomNotes() {
    try {
      const storedNotes = localStorage.getItem('customRecipeNotes');
      console.log('Loading stored notes:', storedNotes);
      if (storedNotes) {
        const customNotes = JSON.parse(storedNotes);
        console.log('Parsed custom notes:', customNotes);
        
        // Apply stored notes to recipes
        this.recipes.forEach(category => {
          category.recipes.forEach(recipe => {
            if (customNotes[recipe.name]) {
              console.log('Applying notes to recipe:', recipe.name, customNotes[recipe.name]);
              // Only add notes that aren't already present
              const existingNotes = new Set(recipe.notes || []);
              customNotes[recipe.name].forEach(note => {
                if (!existingNotes.has(note)) {
                  if (!recipe.notes) recipe.notes = [];
                  recipe.notes.push(note);
                }
              });
              console.log('Updated recipe notes:', recipe.notes);
            }
          });
        });
      }
    } catch (error) {
      console.error('Error loading custom notes:', error);
    }
  }

  saveCustomNotes() {
    try {
      const customNotes = {};
      this.recipes.forEach(category => {
        category.recipes.forEach(recipe => {
          if (recipe.notes) {
            const customNoteItems = recipe.notes.filter(note => note.startsWith('Custom:'));
            if (customNoteItems.length > 0) {
              customNotes[recipe.name] = customNoteItems;
            }
          }
        });
      });
      console.log('Saving custom notes:', customNotes); // Debug log
      localStorage.setItem('customRecipeNotes', JSON.stringify(customNotes));
    } catch (error) {
      console.error('Error saving custom notes:', error);
    }
  }

  async fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      if (retries > 0) {
        logger.warn(`Retrying fetch (${retries} attempts remaining)`, { url, error });
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  }

  async forceRefresh() {
    try {
      const data = await this.fetchWithRetry('data/recipes.json');
      this.recipes = data;
      this.originalRecipes = JSON.parse(JSON.stringify(data));
      cache.set(CACHE_KEY_RECIPES, data);
      logger.info('Recipe data force refreshed', { recipeCount: data.length });
      return data;
    } catch (error) {
      logger.error('Error force refreshing recipe data', { error });
      throw error;
    }
  }

  scaleRecipeToCalories(recipe, targetCalories) {
    const totalCalories = recipe.foods.reduce((sum, food) => sum + food.calories, 0);
    const scaleFactor = targetCalories / totalCalories;
    
    return {
      ...recipe,
      foods: recipe.foods.map(food => ({
        ...food,
        calories: food.calories * scaleFactor
      }))
    };
  }

  sortRecipes(recipes, sortBy) {
    return recipes.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });
  }

  resetRecipes() {
    this.recipes = JSON.parse(JSON.stringify(this.originalRecipes));
  }

  getRecipesByCategory(category) {
    if (!category) return this.recipes;
    return this.recipes.filter(cat => cat.category === category);
  }

  addCustomNote(recipe, note) {
    console.log('Adding custom note to recipe:', recipe.name);
    console.log('Current notes before adding:', recipe.notes);
    if (!recipe.notes) {
      recipe.notes = [];
      console.log('Initialized empty notes array');
    }
    const customNote = `Custom: ${note.trim()}`;
    recipe.notes.push(customNote);
    console.log('Added note:', customNote);
    console.log('Updated notes array:', recipe.notes);
    
    // Update the original recipes to maintain the note
    const originalRecipe = this.originalRecipes.find(r => r.name === recipe.name);
    if (originalRecipe) {
      console.log('Found original recipe, updating notes');
      if (!originalRecipe.notes) {
        originalRecipe.notes = [];
      }
      originalRecipe.notes.push(customNote);
      console.log('Updated original recipe notes:', originalRecipe.notes);
    } else {
      console.log('Original recipe not found for:', recipe.name);
    }

    // Save custom notes to localStorage
    this.saveCustomNotes();
  }

  removeCustomNote(recipe, noteIndex) {
    console.log('Removing custom note from recipe:', recipe.name);
    if (recipe.notes && recipe.notes.length > noteIndex) {
      const removedNote = recipe.notes.splice(noteIndex, 1)[0];
      console.log('Removed note:', removedNote);
      
      // Update the original recipes
      const originalRecipe = this.originalRecipes.find(r => r.name === recipe.name);
      if (originalRecipe) {
        const originalNoteIndex = originalRecipe.notes.findIndex(note => note === removedNote);
        if (originalNoteIndex !== -1) {
          originalRecipe.notes.splice(originalNoteIndex, 1);
        }
      }

      // Save updated notes to localStorage
      this.saveCustomNotes();
      return true;
    }
    return false;
  }
} 