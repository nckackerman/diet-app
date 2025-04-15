let foods = {};
let recipes = [];
const selectedFoods = new Set();
const itemsPerPage = 25;
const foodPagination = {};

async function loadFoods() {
  const res = await fetch('data/foods.json');
  foods = await res.json();
  populateFoodList();
  await loadRecipes();
}

async function loadRecipes() {
  const res = await fetch('data/recipes.json');
  recipes = await res.json();
  populateRecipeList();
}

document.getElementById('plannerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const totalCals = parseFloat(document.getElementById('totalCalories').value);
  const ratios = {};
  document.querySelectorAll('#foodInputs input').forEach(input => {
    const val = parseFloat(input.value);
    if (!isNaN(val) && val > 0) {
      ratios[input.dataset.food] = val;
    }
  });
  const totalRatio = Object.values(ratios).reduce((a, b) => a + b, 0);
  const results = document.getElementById('plannerResults');
  results.innerHTML = '<h2>Results</h2>';
  const ul = document.createElement('ul');
  for (const food in ratios) {
    const adjRatio = ratios[food] / totalRatio;
    const cals = totalCals * adjRatio;
    const grams = cals / foods[food].cal_per_gram;
    const li = document.createElement('li');
    li.textContent = `${food}: ${grams.toFixed(1)}g (${cals.toFixed(0)} cal)`;
    ul.appendChild(li);
  }
  results.appendChild(ul);
});

function populateFoodList(query = '') {
  const container = document.getElementById('foodListContainer');
  container.innerHTML = '';
  const categories = {};
  for (const [name, data] of Object.entries(foods)) {
    if (query && !name.toLowerCase().includes(query.toLowerCase())) continue;
    if (!categories[data.category]) categories[data.category] = [];
    categories[data.category].push({ name, ...data });
  }

  for (const [category, items] of Object.entries(categories)) {
    const section = document.createElement('section');
    const title = document.createElement('h2');
    title.textContent = category;
    section.appendChild(title);

    const table = document.createElement('table');
    const header = table.insertRow();
    header.innerHTML = '<th>Food</th><th>Calories/Gram</th>';

    if (!foodPagination[category]) foodPagination[category] = itemsPerPage;
    const end = foodPagination[category];
    const visibleItems = items.slice(0, end);

    visibleItems.forEach(item => {
      const row = table.insertRow();
      row.insertCell().textContent = item.name;
      row.insertCell().textContent = item.cal_per_gram.toFixed(2);
    });

    section.appendChild(table);

    if (end < items.length) {
      const btn = document.createElement('button');
      btn.textContent = 'Load More';
      btn.onclick = () => {
        foodPagination[category] += itemsPerPage;
        populateFoodList(query);
      };
      section.appendChild(btn);
    }

    container.appendChild(section);
  }
}

document.getElementById('foodSearchLookup').addEventListener('input', (e) => {
  for (const cat in foodPagination) foodPagination[cat] = itemsPerPage;
  populateFoodList(e.target.value);
});

function populateRecipeList() {
  const container = document.getElementById('recipeListContainer');
  container.innerHTML = '';

  recipes.forEach(recipe => {
    const entry = document.createElement('div');
    entry.className = 'recipe-entry';

    const title = document.createElement('div');
    title.className = 'recipe-title';
    title.textContent = recipe.name;

    const details = document.createElement('div');
    details.className = 'recipe-details';
    details.style.display = 'none';

    const foodList = document.createElement('ul');
    recipe.foods.forEach(item => {
      const foodData = foods[item.name];
      if (!foodData) return;
      const foodCals = recipe.total_calories * item.ratio;
      const grams = foodCals / foodData.cal_per_gram;
      const li = document.createElement('li');
      li.textContent = `${item.name}: ${grams.toFixed(1)}g (${foodCals.toFixed(0)} cal)`;
      foodList.appendChild(li);
    });

    const notesList = document.createElement('ol');
    notesList.className = 'recipe-notes';
    recipe.notes.forEach(note => {
      const li = document.createElement('li');
      li.textContent = note;
      notesList.appendChild(li);
    });

    details.innerHTML = `<p><strong>Total Calories:</strong> ${recipe.total_calories}</p>`;
    details.appendChild(document.createElement('p')).textContent = "Foods:";
    details.appendChild(foodList);
    if (recipe.notes.length > 0) {
      details.appendChild(document.createElement('p')).textContent = "Notes:";
      details.appendChild(notesList);
    }

    title.addEventListener('click', () => {
      details.style.display = details.style.display === 'none' ? 'block' : 'none';
    });

    entry.appendChild(title);
    entry.appendChild(details);
    container.appendChild(entry);
  });
}

document.getElementById('recipeSearch').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  document.querySelectorAll('.recipe-entry').forEach(entry => {
    const title = entry.querySelector('.recipe-title').textContent.toLowerCase();
    entry.style.display = title.includes(query) ? '' : 'none';
  });
});

document.getElementById('foodSearchPlanner').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const results = document.getElementById('plannerSearchResults');
  results.innerHTML = '';

  if (!query) return;

  Object.keys(foods).forEach(name => {
    if (selectedFoods.has(name)) return;
    if (name.toLowerCase().includes(query)) {
      const li = document.createElement('li');
      li.textContent = name;
      li.onclick = () => {
        selectedFoods.add(name);
        const row = document.createElement('div');
        row.className = 'food-row';
        row.innerHTML = `
          <span>${name}</span>
          <input type="number" min="0" max="100" step="1" data-food="${name}" value="1" />
          <button class="remove-btn" title="Remove">&times;</button>
        `;
        row.querySelector('.remove-btn').onclick = () => {
          row.remove();
          selectedFoods.delete(name);
        };
        document.getElementById('foodInputs').appendChild(row);
        results.innerHTML = '';
        e.target.value = '';
      };
      results.appendChild(li);
    }
  });
});

function showTab(tabId) {
  document.getElementById('plannerTab').style.display = tabId === 'planner' ? 'block' : 'none';
  document.getElementById('foodLookupTab').style.display = tabId === 'foodLookup' ? 'block' : 'none';
  document.getElementById('recipesTab').style.display = tabId === 'recipes' ? 'block' : 'none';
}

loadFoods();
