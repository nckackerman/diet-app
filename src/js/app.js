import { FoodService } from './services/foodService.js';
import { RecipeService } from './services/recipeService.js';
import { RecipeList } from './components/RecipeList.js';
import { FoodCalculator } from './components/FoodCalculator.js';
import { logger } from './utils/logger.js';

class DietApp {
  constructor() {
    this.foodService = new FoodService();
    this.recipeService = new RecipeService(this.foodService);
    this.recipeList = new RecipeList(this.recipeService, this.foodService);
    this.foodCalculator = new FoodCalculator(this.foodService);
    this.setupEventListeners();
    this.initialize();
  }

  setupEventListeners() {
    // Refresh button
    const refreshButton = document.getElementById('refreshData');
    if (refreshButton) {
      refreshButton.onclick = () => this.refreshData();
    }

    // Navigation buttons
    const calculatorBtn = document.getElementById('showCalculator');
    const recipesBtn = document.getElementById('showRecipes');
    const calculatorSection = document.getElementById('food-calculator');
    const recipesSection = document.getElementById('recipe-list');

    if (calculatorBtn && recipesBtn && calculatorSection && recipesSection) {
      calculatorBtn.addEventListener('click', () => {
        calculatorBtn.classList.add('active');
        recipesBtn.classList.remove('active');
        calculatorSection.classList.add('active');
        recipesSection.classList.remove('active');
      });

      recipesBtn.addEventListener('click', () => {
        recipesBtn.classList.add('active');
        calculatorBtn.classList.remove('active');
        recipesSection.classList.add('active');
        calculatorSection.classList.remove('active');
      });
    }

    // Online/offline handling
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  showLoading(message = 'Loading...') {
    let loadingIndicator = document.getElementById('loadingIndicator');
    if (!loadingIndicator) {
      loadingIndicator = document.createElement('div');
      loadingIndicator.id = 'loadingIndicator';
      loadingIndicator.className = 'loading-indicator';
      document.body.appendChild(loadingIndicator);
    }
    loadingIndicator.textContent = message;
    loadingIndicator.style.display = 'block';
  }

  hideLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  }

  async refreshData() {
    try {
      this.showLoading('Refreshing data...');
      await this.recipeService.forceRefresh();
      await this.foodService.forceRefresh();
      this.recipeList.populateRecipeList();
      this.foodCalculator.render();
    } catch (error) {
      logger.error('Failed to refresh data', { error });
      this.showWarning('Failed to refresh data. Please try again later.');
    } finally {
      this.hideLoading();
    }
  }

  async initialize() {
    try {
      this.showLoading();
      await Promise.all([
        this.recipeService.loadRecipes(),
        this.foodService.loadFoods()
      ]);

      // Add food calculator to the page
      const calculatorSection = document.getElementById('food-calculator');
      const recipesSection = document.getElementById('recipe-list');

      if (calculatorSection) {
        calculatorSection.appendChild(this.foodCalculator.render());
      }

      // Add recipe list
      this.recipeList.populateRecipeList();

      // Set initial active section
      if (calculatorSection && recipesSection) {
        calculatorSection.classList.add('active');
        recipesSection.classList.remove('active');
      }
    } catch (error) {
      logger.error('Failed to initialize app', { error });
      this.showWarning('Failed to load data. Please try refreshing the page.');
    } finally {
      this.hideLoading();
    }
  }

  handleOnline() {
    logger.info('Application is online');
    this.showWarning('You are back online. Data will be refreshed.');
    this.refreshData();
  }

  handleOffline() {
    logger.warn('Application is offline');
    this.showWarning('You are currently offline. Some features may be limited.');
  }

  showWarning(message) {
    const warningContainer = document.createElement('div');
    warningContainer.className = 'warning-container';
    warningContainer.innerHTML = `
      <div class="warning-header">
        <h3>⚠️ Warning</h3>
        <button class="close-warnings">×</button>
      </div>
      <p>${message}</p>
    `;
    document.body.insertBefore(warningContainer, document.body.firstChild);
    
    warningContainer.querySelector('.close-warnings').addEventListener('click', () => {
      warningContainer.style.display = 'none';
    });
  }
}

function createRecipeEntry(recipe) {
  const entry = document.createElement('div');
  entry.className = 'recipe-entry';
  
  const title = document.createElement('div');
  title.className = 'recipe-title';
  title.textContent = recipe.name;
  
  const actions = document.createElement('div');
  actions.className = 'recipe-actions';
  
  const printButton = document.createElement('button');
  printButton.textContent = 'Print';
  printButton.title = 'Print recipe';
  printButton.onclick = () => printRecipe(recipe);
  
  const noteButton = document.createElement('button');
  noteButton.textContent = 'Add Note';
  noteButton.title = 'Add custom note to recipe';
  noteButton.onclick = () => addCustomNote(recipe);
  
  actions.appendChild(printButton);
  actions.appendChild(noteButton);
  title.appendChild(actions);
  
  const summary = document.createElement('div');
  summary.className = 'recipe-summary';
  
  const servingsControl = document.createElement('div');
  servingsControl.className = 'servings-control';
  
  const servingsLabel = document.createElement('label');
  servingsLabel.textContent = 'Servings:';
  
  const servingsInput = document.createElement('input');
  servingsInput.type = 'number';
  servingsInput.min = '1';
  servingsInput.value = recipe.servings || 1;
  servingsInput.onchange = () => updateRecipeServings(recipe, servingsInput.value);
  
  servingsControl.appendChild(servingsLabel);
  servingsControl.appendChild(servingsInput);
  
  const caloriesInfo = document.createElement('p');
  const totalCalories = calculateRecipeCalories(recipe);
  const caloriesPerServing = totalCalories / (recipe.servings || 1);
  caloriesInfo.innerHTML = `<strong>Total Calories:</strong> ${totalCalories.toFixed(0)} kcal<br>
                           <strong>Per Serving:</strong> ${caloriesPerServing.toFixed(0)} kcal`;
  
  summary.appendChild(servingsControl);
  summary.appendChild(caloriesInfo);
  
  if (recipe.notes && recipe.notes.length > 0) {
    const notesList = document.createElement('ul');
    notesList.className = 'recipe-notes';
    recipe.notes.forEach(note => {
      const noteItem = document.createElement('li');
      noteItem.textContent = note;
      if (note.startsWith('Custom:')) {
        noteItem.className = 'custom-note';
      }
      notesList.appendChild(noteItem);
    });
    summary.appendChild(notesList);
  }
  
  const ingredientsList = document.createElement('div');
  ingredientsList.className = 'recipe-ingredients';
  
  Object.entries(recipe.ingredients).forEach(([category, items]) => {
    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'food-category-header';
    categoryHeader.textContent = category;
    ingredientsList.appendChild(categoryHeader);
    
    items.forEach(item => {
      const foodItem = document.createElement('div');
      foodItem.className = 'food-item';
      foodItem.textContent = `${item.amount} ${item.unit} ${item.name}`;
      ingredientsList.appendChild(foodItem);
    });
  });
  
  entry.appendChild(title);
  entry.appendChild(summary);
  entry.appendChild(ingredientsList);
  
  return entry;
}

function updateRecipeServings(recipe, newServings) {
  const originalServings = recipe.originalServings || recipe.servings || 1;
  const scaleFactor = newServings / originalServings;
  
  Object.values(recipe.ingredients).forEach(items => {
    items.forEach(item => {
      item.amount = (item.originalAmount || item.amount) * scaleFactor;
    });
  });
  
  recipe.servings = newServings;
  populateRecipeList();
}

function addCustomNote(recipe) {
  const note = prompt('Enter your custom note:');
  if (note && note.trim()) {
    if (!recipe.notes) {
      recipe.notes = [];
    }
    recipe.notes.push(`Custom: ${note.trim()}`);
    populateRecipeList();
  }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new DietApp();
}); 