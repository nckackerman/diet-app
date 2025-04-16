import { cache } from '../utils/cache.js';
import { logger } from '../utils/logger.js';
import { validateFoodData } from '../utils/validation.js';

const CACHE_KEY_FOODS = 'diet-app-foods';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export class FoodService {
  constructor() {
    this.foods = {};
  }

  async fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
    try {
      // Make sure the URL is absolute if it's not already
      const absoluteUrl = url.startsWith('http') ? url : new URL(url, window.location.origin).href;
      const response = await fetch(absoluteUrl, options);
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

  async loadFoods() {
    try {
      const data = await this.fetchWithRetry('data/foods.json');
      this.foods = data;
      cache.set(CACHE_KEY_FOODS, data);
      return data;
    } catch (error) {
      console.error('Error loading foods:', error);
      throw error;
    }
  }

  async forceRefresh() {
    try {
      const data = await this.fetchWithRetry('data/foods.json');
      this.foods = data;
      cache.set(CACHE_KEY_FOODS, data);
      return data;
    } catch (error) {
      console.error('Error refreshing foods:', error);
      throw error;
    }
  }

  getFoodByName(name) {
    return this.foods[name];
  }

  getFoodsByCategory(category) {
    return Object.entries(this.foods)
      .filter(([_, food]) => food.category === category)
      .map(([name, food]) => ({ name, ...food }));
  }

  getAllCategories() {
    return [...new Set(Object.values(this.foods).map(food => food.category))];
  }
} 