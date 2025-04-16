export class FoodCalculator {
  constructor(foodService) {
    this.foodService = foodService;
    this.container = document.createElement('div');
    this.container.className = 'food-calculator';
    this.selectedFoods = new Map(); // Map of food name to ratio
    this.searchTerm = '';
  }

  createSearchInput() {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'food-search';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search foods...';
    searchInput.className = 'food-search-input';
    
    // Store the original expanded state of panels
    const originalStates = new Map();
    
    searchInput.addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase();
      
      // If search is empty, restore original states
      if (!this.searchTerm) {
        this.container.querySelectorAll('.food-category-group').forEach(group => {
          const content = group.querySelector('.category-content');
          const header = group.querySelector('.category-header');
          const originalState = originalStates.get(header);
          if (originalState !== undefined) {
            content.style.display = originalState ? 'block' : 'none';
            if (originalState) {
              content.classList.add('expanded');
            } else {
              content.classList.remove('expanded');
            }
          }
        });
        this.updateFoodSelector();
        return;
      }
      
      // Update food selector to filter items
      this.updateFoodSelector();
      
      // Manage panel states based on filtered results
      this.container.querySelectorAll('.food-category-group').forEach(group => {
        const content = group.querySelector('.category-content');
        const header = group.querySelector('.category-header');
        const hasMatches = content.querySelectorAll('.food-item').length > 0;
        
        // Store original state if not already stored
        if (!originalStates.has(header)) {
          originalStates.set(header, content.style.display !== 'none');
        }
        
        // Expand if has matches, collapse if no matches
        if (hasMatches) {
          content.style.display = 'block';
          content.classList.add('expanded');
        } else {
          content.style.display = 'none';
          content.classList.remove('expanded');
        }
      });
    });
    
    searchContainer.appendChild(searchInput);
    return searchContainer;
  }

  createFoodSelector() {
    const selector = document.createElement('div');
    selector.className = 'food-selector';
    
    const categories = this.foodService.getAllCategories();
    categories.sort(); // Sort categories alphabetically
    
    categories.forEach(category => {
      const categoryGroup = document.createElement('div');
      categoryGroup.className = 'food-category-group';
      
      const categoryHeader = document.createElement('div');
      categoryHeader.className = 'category-header';
      categoryHeader.addEventListener('click', () => {
        const content = categoryGroup.querySelector('.category-content');
        if (content.style.display === 'none') {
          content.style.display = 'block';
          content.classList.add('expanded');
        } else {
          content.style.display = 'none';
          content.classList.remove('expanded');
        }
      });
      
      const categoryTitle = document.createElement('h3');
      categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
      
      categoryHeader.appendChild(categoryTitle);
      categoryGroup.appendChild(categoryHeader);
      
      const categoryContent = document.createElement('div');
      categoryContent.className = 'category-content';
      categoryContent.style.display = 'none'; // Initially collapsed
      
      // Get and sort foods within category
      const foods = this.foodService.getFoodsByCategory(category)
        .sort((a, b) => a.name.localeCompare(b.name));
      
      // Filter foods based on search term
      const filteredFoods = foods.filter(food => 
        food.name.toLowerCase().includes(this.searchTerm)
      );

      // Only show category if it has matching foods
      if (filteredFoods.length > 0) {
        filteredFoods.forEach(food => {
          const foodItem = document.createElement('div');
          foodItem.className = 'food-item';
          
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.id = `food-${food.name}`;
          checkbox.checked = this.selectedFoods.has(food.name);
          checkbox.addEventListener('change', () => this.handleFoodSelection(food.name, checkbox.checked));
          
          const label = document.createElement('label');
          label.htmlFor = `food-${food.name}`;
          label.textContent = `${food.name} (${food.cal_per_gram.toFixed(2)} cal/g)`;
          
          foodItem.appendChild(checkbox);
          foodItem.appendChild(label);
          categoryContent.appendChild(foodItem);
        });
        
        categoryGroup.appendChild(categoryContent);
        selector.appendChild(categoryGroup);
      }
    });
    
    return selector;
  }

  updateFoodSelector() {
    const oldSelector = this.container.querySelector('.food-selector');
    if (oldSelector) {
      const newSelector = this.createFoodSelector();
      oldSelector.replaceWith(newSelector);
    }
  }

  handleFoodSelection(foodName, isSelected) {
    if (isSelected) {
      const food = this.foodService.getFoodByName(foodName);
      let initialRatio = 1;
      
      // Count how many items are already selected in this category
      let categoryCount = 0;
      this.selectedFoods.forEach((_, existingFoodName) => {
        const existingFood = this.foodService.getFoodByName(existingFoodName);
        if (existingFood.category.toLowerCase() === food.category.toLowerCase()) {
          categoryCount++;
        }
      });
      
      // Set initial ratio based on food category, divided by (count + 1)
      const category = food.category.toLowerCase();
      if (category === 'protein') {
        initialRatio = 0.6 / (categoryCount + 1); // 60% divided by number of protein items
      } else if (category === 'fat') {
        initialRatio = 0.4 / (categoryCount + 1); // 40% divided by number of fat items
      } else if (category === 'carb' || category === 'carbs') {
        initialRatio = 1.0 / (categoryCount + 1); // 100% divided by number of carb items
      } else {
        initialRatio = 0.1 / (categoryCount + 1); // 10% divided by number of items in other categories
      }
      
      // Update ratios for existing items in the same category
      this.selectedFoods.forEach((_, existingFoodName) => {
        const existingFood = this.foodService.getFoodByName(existingFoodName);
        if (existingFood.category.toLowerCase() === food.category.toLowerCase()) {
          this.selectedFoods.set(existingFoodName, initialRatio);
        }
      });
      
      this.selectedFoods.set(foodName, initialRatio);
    } else {
      const removedFood = this.foodService.getFoodByName(foodName);
      this.selectedFoods.delete(foodName);
      
      // Recalculate ratios for remaining items in the same category
      let categoryCount = 0;
      this.selectedFoods.forEach((_, existingFoodName) => {
        const existingFood = this.foodService.getFoodByName(existingFoodName);
        if (existingFood.category.toLowerCase() === removedFood.category.toLowerCase()) {
          categoryCount++;
        }
      });
      
      if (categoryCount > 0) {
        let newRatio;
        const category = removedFood.category.toLowerCase();
        if (category === 'protein') {
          newRatio = 0.6 / categoryCount;
        } else if (category === 'fat') {
          newRatio = 0.4 / categoryCount;
        } else if (category === 'carb' || category === 'carbs') {
          newRatio = 1.0 / categoryCount;
        } else {
          newRatio = 0.1 / categoryCount;
        }
        
        this.selectedFoods.forEach((_, existingFoodName) => {
          const existingFood = this.foodService.getFoodByName(existingFoodName);
          if (existingFood.category.toLowerCase() === removedFood.category.toLowerCase()) {
            this.selectedFoods.set(existingFoodName, newRatio);
          }
        });
      }
    }
    this.updateRatioInputs();
    this.calculate();
  }

  createRatioInputs() {
    const container = document.createElement('div');
    container.className = 'ratio-inputs';
    container.innerHTML = '<h3>Food Ratios</h3>';
    
    // Sort selected foods by name
    const sortedFoods = Array.from(this.selectedFoods.entries())
      .sort(([nameA], [nameB]) => nameA.localeCompare(nameB));
    
    sortedFoods.forEach(([foodName, ratio]) => {
      const inputGroup = document.createElement('div');
      inputGroup.className = 'ratio-input-group';
      
      const label = document.createElement('label');
      label.textContent = foodName;
      
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.step = '0.1';
      input.value = ratio;
      input.addEventListener('change', (e) => {
        this.selectedFoods.set(foodName, parseFloat(e.target.value) || 0);
        this.calculate();
      });
      
      inputGroup.appendChild(label);
      inputGroup.appendChild(input);
      container.appendChild(inputGroup);
    });
    
    return container;
  }

  createCalorieInput() {
    const container = document.createElement('div');
    container.className = 'calorie-input';
    
    const label = document.createElement('label');
    label.textContent = 'Target Total Calories:';
    
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '1';
    input.value = '500'; // Default value
    input.addEventListener('input', () => this.calculate());
    
    container.appendChild(label);
    container.appendChild(input);
    return container;
  }

  createResultsDisplay() {
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'calculator-results';
    
    const resultsHeader = document.createElement('div');
    resultsHeader.className = 'results-header';
    
    const resultsTitle = document.createElement('h3');
    resultsTitle.textContent = 'Results';
    resultsHeader.appendChild(resultsTitle);
    
    const totalCalories = document.createElement('div');
    totalCalories.className = 'total-calories';
    totalCalories.textContent = 'Total: 0 cal';
    resultsHeader.appendChild(totalCalories);
    
    resultsContainer.appendChild(resultsHeader);
    
    const resultsContent = document.createElement('div');
    resultsContent.className = 'results-content';
    resultsContainer.appendChild(resultsContent);
    
    return resultsContainer;
  }

  calculate() {
    const resultsContent = this.container.querySelector('.results-content');
    const totalCaloriesDisplay = this.container.querySelector('.total-calories');
    if (!resultsContent || !totalCaloriesDisplay) return;

    const targetCalories = parseFloat(this.container.querySelector('.calorie-input input').value) || 0;
    if (targetCalories <= 0 || this.selectedFoods.size === 0) {
      resultsContent.innerHTML = '<p>Please select foods and enter valid calories</p>';
      totalCaloriesDisplay.textContent = 'Total: 0 cal';
      return;
    }

    // Calculate total ratio sum
    const totalRatio = Array.from(this.selectedFoods.values()).reduce((sum, ratio) => sum + ratio, 0);
    if (totalRatio === 0) {
      resultsContent.innerHTML = '<p>Please enter valid ratios</p>';
      totalCaloriesDisplay.textContent = 'Total: 0 cal';
      return;
    }

    const results = [];
    let totalCalculatedCalories = 0;
    const categoryCalories = {};

    this.selectedFoods.forEach((ratio, foodName) => {
      const food = this.foodService.getFoodByName(foodName);
      // Normalize the ratio and calculate calories
      const normalizedRatio = ratio / totalRatio;
      const foodCalories = normalizedRatio * targetCalories;
      const grams = foodCalories / food.cal_per_gram;
      
      // Track calories by category
      if (!categoryCalories[food.category]) {
        categoryCalories[food.category] = 0;
      }
      categoryCalories[food.category] += Math.round(foodCalories);
      
      results.push({
        name: foodName,
        grams: Math.round(grams),
        calories: Math.round(foodCalories),
        category: food.category,
        ratio: ratio
      });
      
      totalCalculatedCalories += Math.round(foodCalories);
    });

    // Group results by category
    const resultsByCategory = {};
    results.forEach(result => {
      if (!resultsByCategory[result.category]) {
        resultsByCategory[result.category] = [];
      }
      resultsByCategory[result.category].push(result);
    });

    // Display results
    resultsContent.innerHTML = '';
    Object.entries(resultsByCategory).forEach(([category, items]) => {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'result-category';
      
      // Calculate percentage for this category
      const categoryPercentage = ((categoryCalories[category] / totalCalculatedCalories) * 100).toFixed(1);
      categoryDiv.innerHTML = `<h4>${category.charAt(0).toUpperCase() + category.slice(1)} (${categoryPercentage}%)</h4>`;
      
      const list = document.createElement('ul');
      items.forEach(item => {
        const li = document.createElement('li');
        const ratioInput = document.createElement('input');
        ratioInput.type = 'number';
        ratioInput.min = '0';
        ratioInput.step = '0.1';
        ratioInput.value = item.ratio;
        ratioInput.className = 'result-ratio-input';
        
        // Store the food name in a data attribute for the event listener
        ratioInput.dataset.foodName = item.name;
        
        // Add event listener for ratio changes
        ratioInput.addEventListener('input', (e) => {
          const newRatio = parseFloat(e.target.value) || 0;
          const foodName = e.target.dataset.foodName;
          this.selectedFoods.set(foodName, newRatio);
          this.calculate(); // Recalculate with new ratio
        });
        
        li.innerHTML = `
          <span>
            <span class="food-name">${item.name}:</span>
            <span class="food-grams">${item.grams}g</span>
            <span class="food-calories">(${item.calories} cal)</span>
          </span>
          <div class="ratio-control">
            <label>Ratio:</label>
          </div>
        `;
        li.querySelector('.ratio-control').appendChild(ratioInput);
        list.appendChild(li);
      });
      
      categoryDiv.appendChild(list);
      resultsContent.appendChild(categoryDiv);
    });

    // Update total calories display
    totalCaloriesDisplay.textContent = `Total: ${totalCalculatedCalories} cal`;
  }

  updateRatioInputs() {
    const oldRatioInputs = this.container.querySelector('.ratio-inputs');
    if (oldRatioInputs) {
      const newRatioInputs = this.createRatioInputs();
      oldRatioInputs.replaceWith(newRatioInputs);
    }
  }

  render() {
    this.container.innerHTML = '';
    
    const title = document.createElement('h2');
    title.textContent = 'Food Calculator';
    this.container.appendChild(title);
    
    this.container.appendChild(this.createSearchInput());
    this.container.appendChild(this.createFoodSelector());
    this.container.appendChild(this.createCalorieInput());
    this.container.appendChild(this.createResultsDisplay());
    
    const refreshButton = document.createElement('button');
    refreshButton.id = 'refreshData';
    refreshButton.className = 'refresh-button';
    refreshButton.textContent = 'Refresh Data';
    refreshButton.addEventListener('click', () => {
      this.foodService.forceRefresh();
      this.render();
    });
    
    this.container.appendChild(refreshButton);
    return this.container;
  }
} 