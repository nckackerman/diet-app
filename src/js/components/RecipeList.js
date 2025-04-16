import { createRecipeActions } from './RecipeActions.js';
import { createTooltip } from './Tooltip.js';
import { logger } from '../utils/logger.js';

export class RecipeList {
  constructor(recipeService, foodService) {
    this.recipeService = recipeService;
    this.foodService = foodService;
    this.container = document.getElementById('recipe-list');
   
    if (!this.container) {
      logger.error('Recipe list container not found');
      throw new Error('Recipe list container not found');
    }

    // Add event listener for recipe updates
    document.addEventListener('recipeUpdated', (event) => {
      console.log('Recipe updated event received:', event.detail.recipe); // Debug log
      this.populateRecipeList();
    });
  }

  createRecipeEntry(recipe) {
    try {
      const entry = document.createElement('div');
      entry.className = 'recipe-entry';
      entry.id = `recipe-${recipe.name}`;

      const title = document.createElement('h3');
      title.className = 'recipe-title';
      title.textContent = recipe.name;
      
      const actions = createRecipeActions(recipe, this.recipeService);
      if (actions) {
        title.appendChild(actions);
      }

      const content = document.createElement('div');
      content.className = 'recipe-content';
      content.classList.add('collapsed');

      const foodList = document.createElement('div');
      foodList.className = 'recipe-food-list';
      
      const foodsByCategory = {};
      recipe.foods.forEach(item => {
        const foodData = this.foodService.getFoodByName(item.name);
        if (!foodData) {
          logger.warn(`Food data not found for: ${item.name}`);
          return;
        }
        if (!foodsByCategory[foodData.category]) {
          foodsByCategory[foodData.category] = [];
        }
        foodsByCategory[foodData.category].push({...item, foodData});
      });

      const updateRecipeDisplay = (currentServings) => {
        if (!foodList) {
          logger.error('Food list element is null');
          return;
        }
        
        foodList.innerHTML = '';

        // Calculate total calories for percentage calculation
        const totalCalories = recipe.foods.reduce((sum, food) => sum + food.calories, 0);
        const caloriesPerServing = totalCalories / recipe.servings;
        const currentTotalCalories = caloriesPerServing * currentServings;

        Object.entries(foodsByCategory).forEach(([category, items]) => {
          // Calculate category calories
          const categoryCalories = items.reduce((sum, item) => {
            const itemCaloriesPerServing = item.calories / recipe.servings;
            return sum + (itemCaloriesPerServing * currentServings);
          }, 0);
          
          const categoryPercentage = ((categoryCalories / currentTotalCalories) * 100).toFixed(1);

          const categoryHeader = document.createElement('div');
          categoryHeader.className = 'food-category-header';
          categoryHeader.textContent = `${category.charAt(0).toUpperCase() + category.slice(1)} (${categoryPercentage}%)`;
          foodList.appendChild(categoryHeader);

          items.forEach(item => {
            const itemCaloriesPerServing = item.calories / recipe.servings;
            const currentCalories = itemCaloriesPerServing * currentServings;
            const exactGrams = currentCalories / item.foodData.cal_per_gram;
            const roundedGrams = Math.round(exactGrams / 5) * 5;
            const foodItem = document.createElement('div');
            foodItem.className = 'food-item';
            foodItem.textContent = `${item.name}: ${roundedGrams}g (${currentCalories.toFixed(0)} cal)`;
            foodList.appendChild(foodItem);
          });
        });

        // Update the servings control with new calories
        const servingsControl = content.querySelector('.servings-control');
        if (servingsControl) {
          servingsControl.innerHTML = `
            <label>Calories: ${currentTotalCalories.toFixed(0)} cal, Servings: </label>
            <input type="number" min="1" value="${currentServings}" class="servings-input" />
          `;

          // Reattach the event listener after updating the HTML
          const servingsInput = servingsControl.querySelector('.servings-input');
          if (servingsInput) {
            servingsInput.addEventListener('change', (e) => {
              const newServings = Math.max(1, parseInt(e.target.value) || 1);
              e.target.value = newServings;
              updateRecipeDisplay(newServings);
            });
          }
        }
      };

      updateRecipeDisplay(recipe.servings);

      const notesList = document.createElement('ol');
      notesList.className = 'recipe-notes';
      console.log('Recipe notes:', recipe.notes);
      if (recipe.notes && recipe.notes.length > 0) {
        console.log('Processing notes:', recipe.notes);
        recipe.notes.forEach((note, index) => {
          console.log('Adding note:', note);
          const li = document.createElement('li');
          li.textContent = note;
          
          if (note.startsWith('Custom:')) {
            li.className = 'custom-note';
            console.log('Added custom note:', note);
            
            // Add remove button for custom notes
            const removeButton = document.createElement('button');
            removeButton.className = 'remove-note';
            removeButton.innerHTML = '×';
            removeButton.title = 'Remove this note';
            removeButton.onclick = (e) => {
              e.stopPropagation(); // Prevent the recipe from collapsing
              if (this.recipeService.removeCustomNote(recipe, index)) {
                // Trigger UI update
                const event = new CustomEvent('recipeUpdated', { detail: { recipe } });
                document.dispatchEvent(event);
              }
            };
            li.appendChild(removeButton);
          }
          notesList.appendChild(li);
        });
      } else {
        console.log('No notes found for recipe:', recipe.name);
      }

      const summaryDiv = document.createElement('div');
      summaryDiv.className = 'recipe-summary';

      // Create sections for each part of the recipe
      const servingsSection = document.createElement('div');
      servingsSection.className = 'recipe-section';
      servingsSection.innerHTML = `
        <div class="servings-control">
          <label>Calories: ${recipe.foods.reduce((sum, food) => sum + food.calories, 0)} cal, Servings: </label>
          <input type="number" min="1" value="${recipe.servings}" class="servings-input" />
        </div>
      `;

      const ingredientsSection = document.createElement('div');
      ingredientsSection.className = 'recipe-section';
      ingredientsSection.innerHTML = '<h3>Ingredients</h3>';
      ingredientsSection.appendChild(foodList);
      
      // Add event listener for the initial servings input
      const initialServingsInput = servingsSection.querySelector('.servings-input');
      if (initialServingsInput) {
        initialServingsInput.addEventListener('change', (e) => {
          const newServings = Math.max(1, parseInt(e.target.value) || 1);
          e.target.value = newServings;
          updateRecipeDisplay(newServings);
        });
      }

      // Add sections to summary
      summaryDiv.appendChild(servingsSection);
      summaryDiv.appendChild(ingredientsSection);
      
      if (recipe.notes && recipe.notes.length > 0) {
        const notesSection = document.createElement('div');
        notesSection.className = 'recipe-section';
        notesSection.innerHTML = '<h3>Notes</h3>';
        notesSection.appendChild(notesList);
        summaryDiv.appendChild(notesSection);
      }

      title.addEventListener('click', () => {
        content.classList.toggle('collapsed');
        content.classList.toggle('expanded');
      });

      content.appendChild(summaryDiv);
      entry.appendChild(title);
      entry.appendChild(content);
      return entry;
    } catch (error) {
      logger.error('Error creating recipe entry', { error, recipe });
      throw error;
    }
  }

  populateRecipeList() {
    console.log('Populating recipe list...'); // Debug log
    try {
      if (!this.container) {
        logger.error('Recipe list container is null');
        return;
      }

      this.container.innerHTML = '';

      // Add title
      const title = document.createElement('h2');
      title.textContent = 'Recipes';
      this.container.appendChild(title);

      // Add search control
      const searchContainer = document.createElement('div');
      searchContainer.className = 'recipe-search';

      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Search recipes...';
      searchInput.className = 'recipe-search-input';
      searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.recipe-category').forEach(category => {
          const categoryTitle = category.querySelector('.recipe-category h2');
          const categoryContent = category.querySelector('.recipe-category-content');
          const recipes = category.querySelectorAll('.recipe-entry');
          let hasVisibleRecipes = false;

          recipes.forEach(entry => {
            const title = entry.querySelector('.recipe-title').textContent.toLowerCase();
            const content = entry.querySelector('.recipe-content');
            if (title.includes(searchTerm)) {
              entry.style.display = 'block';
              hasVisibleRecipes = true;
              // Keep the recipe content collapsed
              content.classList.add('collapsed');
              content.classList.remove('expanded');
            } else {
              entry.style.display = 'none';
            }
          });

          // Expand/collapse category based on search
          if (searchTerm) {
            if (hasVisibleRecipes) {
              categoryTitle.classList.remove('collapsed');
              categoryContent.classList.remove('collapsed');
            } else {
              categoryTitle.classList.add('collapsed');
              categoryContent.classList.add('collapsed');
            }
          } else {
            // When search is cleared, collapse all categories
            categoryTitle.classList.add('collapsed');
            categoryContent.classList.add('collapsed');
          }
        });
      });
      
      searchContainer.appendChild(searchInput);
      this.container.appendChild(searchContainer);

      this.recipeService.recipes.forEach(category => {
        console.log('Processing category:', category.category); // Debug log
        const categorySection = document.createElement('section');
        categorySection.className = 'recipe-category';
        categorySection.dataset.category = category.category;
        
        const categoryTitle = document.createElement('h2');
        categoryTitle.textContent = category.category;
        categoryTitle.classList.add('collapsed');
        categoryTitle.addEventListener('click', () => {
          const content = categorySection.querySelector('.recipe-category-content');
          categoryTitle.classList.toggle('collapsed');
          content.classList.toggle('collapsed');
        });
        categorySection.appendChild(categoryTitle);

        const categoryContent = document.createElement('div');
        categoryContent.className = 'recipe-category-content collapsed';
        categorySection.appendChild(categoryContent);

        category.recipes.forEach(recipe => {
          console.log('Processing recipe:', recipe.name); // Debug log
          console.log('Recipe notes:', recipe.notes); // Debug log
          try {
            const recipeEntry = this.createRecipeEntry(recipe);
            if (recipeEntry) {
              categoryContent.appendChild(recipeEntry);
            }
          } catch (error) {
            logger.error('Error creating recipe entry', { error, recipe });
          }
        });

        this.container.appendChild(categorySection);
      });
    } catch (error) {
      logger.error('Error populating recipe list', { error });
      throw error;
    }
  }
} 