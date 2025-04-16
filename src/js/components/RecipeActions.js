export function createRecipeActions(recipe, recipeService) {
  const actions = document.createElement('div');
  actions.className = 'recipe-actions';
  
  const addNoteButton = document.createElement('button');
  addNoteButton.textContent = '📝';
  addNoteButton.title = 'Add Custom Note';
  addNoteButton.setAttribute('aria-label', 'Add custom note to recipe');
  addNoteButton.onclick = () => {
    const note = prompt('Enter your custom note:');
    console.log('User entered note:', note); // Debug log
    if (note) {
      console.log('Adding note to recipe:', recipe.name); // Debug log
      recipeService.addCustomNote(recipe, note);
      console.log('Recipe notes after adding:', recipe.notes); // Debug log
      // Trigger a UI update
      const event = new CustomEvent('recipeUpdated', { detail: { recipe } });
      document.dispatchEvent(event);
      console.log('Dispatched recipeUpdated event'); // Debug log
    }
  };
  
  actions.appendChild(addNoteButton);
  return actions;
}

function formatRecipeForClipboard(recipe) {
  const foodData = recipe.foods.map(food => {
    const foodInfo = foods[food.name];
    const grams = food.calories / foodInfo.cal_per_gram;
    return `${food.name}: ${grams.toFixed(1)}g (${food.calories.toFixed(0)} cal)`;
  }).join('\n');
  
  const notes = recipe.notes.length > 0 
    ? '\n\nNotes:\n' + recipe.notes.map((note, i) => `${i + 1}. ${note}`).join('\n')
    : '';
    
  return `${recipe.name}\n\nIngredients:\n${foodData}${notes}`;
} 