const prisma = require('../config/prismaClient');
const { parseDateOnly } = require('../utils/dateUtils');
const { invalidateCoachCache } = require('./coachSnapshotService');

const CATEGORY_LABELS = {
  breakfast: 'Petit-dejeuner',
  lunch: 'Dejeuner',
  dinner: 'Diner',
  snack: 'Snack rapide',
  post_training: 'Post-training',
  budget_student: 'Budget etudiant',
};

const GOAL_RULES = {
  fat_loss: { maxCalories: 520, minProtein: 28, tags: ['fat_loss', 'low-carb', 'proteine'] },
  maintenance: { maxCalories: 650, minProtein: 25, tags: ['rapide', 'meal-prep', 'frais'] },
  muscle_gain: { maxCalories: 760, minProtein: 35, tags: ['muscle_gain', 'post-training', 'proteine'] },
  bulking: { maxCalories: 900, minProtein: 30, tags: ['bulking', 'muscle_gain', 'post-training'] },
};

const stripAccents = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/œ/g, 'oe')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const normalizeIngredient = (value) => {
  const normalized = stripAccents(value);
  if (['oeuf', 'oeufs', 'egg', 'eggs'].includes(normalized)) return 'oeufs';
  if (normalized.includes('huile') && normalized.includes('olive')) return 'huile d olive';
  if (normalized.includes('pomme') && normalized.includes('terre')) return 'pommes de terre';
  if (normalized.includes('pate')) return 'pates';
  if (normalized.includes('yaourt') || normalized.includes('skyr') || normalized.includes('grec')) return 'yaourt';
  if (normalized.includes('pain')) return 'pain';
  if (normalized.includes('thon')) return 'thon';
  if (normalized.includes('poulet')) return 'poulet';
  if (normalized.includes('riz')) return 'riz';
  if (normalized.includes('tomate')) return 'tomate';
  if (normalized.includes('oignon')) return 'oignon';
  if (normalized.includes('avoine')) return 'avoine';
  if (normalized.includes('banane')) return 'banane';
  if (normalized.includes('fromage')) return 'fromage';
  if (normalized.includes('lentille')) return 'lentilles';
  if (normalized.includes('pois') && normalized.includes('chiche')) return 'pois chiches';
  if (normalized.includes('lait')) return 'lait';
  if (normalized.includes('whey')) return 'whey';
  if (normalized.includes('steak')) return 'steak';
  if (normalized.includes('citron')) return 'citron';
  return normalized;
};

function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function parseRecipeId(value) {
  const id = Number.parseInt(value, 10);
  if (!Number.isInteger(id) || id < 1) throw createError('ID recette invalide', 400);
  return id;
}

function getMealTypeFromCategory(category = 'snack') {
  if (category === 'breakfast') return 'breakfast';
  if (category === 'lunch' || category === 'budget_student') return 'lunch';
  if (category === 'dinner') return 'dinner';
  return 'snack';
}

function serializeRecipe(recipe, userId) {
  const saved = recipe.savedBy?.some((item) => item.userId === userId) || false;
  return {
    ...recipe,
    categoryLabel: CATEGORY_LABELS[recipe.category] || recipe.category,
    saved,
    proteinScore: Math.min(100, Math.round((Number(recipe.proteinG || 0) / Math.max(1, Number(recipe.calories || 1))) * 1200)),
    savedBy: undefined,
  };
}

function getVisibleRecipeWhere(userId, extra = {}) {
  return {
    AND: [
      {
        OR: [
          { isPublic: true },
          { createdBy: userId },
        ],
      },
      extra,
    ],
  };
}

async function listRecipes(userId, query = {}) {
  const search = String(query.search || '').trim();
  const category = String(query.category || '').trim();
  const proteinMin = query.proteinMin ? Number(query.proteinMin) : null;
  const proteinMax = query.proteinMax ? Number(query.proteinMax) : null;
  const caloriesMin = query.caloriesMin ? Number(query.caloriesMin) : null;
  const caloriesMax = query.caloriesMax ? Number(query.caloriesMax) : null;
  const prepTimeMax = query.prepTimeMax ? Number(query.prepTimeMax) : null;
  const goal = String(query.goal || '').trim();
  const tags = String(query.tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  const whereExtra = {};

  if (category) whereExtra.category = category;
  if (proteinMin !== null || proteinMax !== null) {
    whereExtra.proteinG = {};
    if (proteinMin !== null) whereExtra.proteinG.gte = proteinMin;
    if (proteinMax !== null) whereExtra.proteinG.lte = proteinMax;
  }
  if (caloriesMin !== null || caloriesMax !== null) {
    whereExtra.calories = {};
    if (caloriesMin !== null) whereExtra.calories.gte = caloriesMin;
    if (caloriesMax !== null) whereExtra.calories.lte = caloriesMax;
  }
  if (prepTimeMax !== null) whereExtra.prepTimeMinutes = { lte: prepTimeMax };
  if (search) {
    whereExtra.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const recipes = await prisma.recipe.findMany({
    where: getVisibleRecipeWhere(userId, whereExtra),
    include: {
      ingredients: true,
      savedBy: { where: { userId } },
    },
    orderBy: [{ proteinG: 'desc' }, { prepTimeMinutes: 'asc' }],
  });

  return recipes
    .filter((recipe) => {
      const recipeTags = Array.isArray(recipe.tags) ? recipe.tags : [];
      const tagMatch = tags.length === 0 || tags.every((tag) => recipeTags.includes(tag));
      return tagMatch && recipeMatchesGoal(recipe, goal);
    })
    .map((recipe) => serializeRecipe(recipe, userId));
}

async function getRecipeById(userId, recipeId) {
  const id = parseRecipeId(recipeId);
  const recipe = await prisma.recipe.findFirst({
    where: getVisibleRecipeWhere(userId, { id }),
    include: {
      ingredients: true,
      savedBy: { where: { userId } },
    },
  });

  if (!recipe) throw createError('Recette non trouvee', 404);
  return serializeRecipe(recipe, userId);
}

async function getHighProteinRecipes(userId) {
  const recipes = await prisma.recipe.findMany({
    where: getVisibleRecipeWhere(userId, { proteinG: { gte: 28 } }),
    include: {
      ingredients: true,
      savedBy: { where: { userId } },
    },
    orderBy: [{ proteinG: 'desc' }, { calories: 'asc' }],
    take: 20,
  });

  return recipes.map((recipe) => serializeRecipe(recipe, userId));
}

function recipeMatchesGoal(recipe, goal) {
  const tags = Array.isArray(recipe.tags) ? recipe.tags : [];
  if (!goal) return true;
  if (goal === 'fat_loss') return recipe.calories <= 550 || tags.includes('fat-loss');
  if (goal === 'muscle_gain' || goal === 'bulking') return recipe.proteinG >= 30 || tags.includes('muscle-gain');
  return true;
}

function scoreIngredientMatch(recipe, selectedIngredients = []) {
  const available = new Set(selectedIngredients.map(normalizeIngredient).filter(Boolean));
  const normalizedIngredients = recipe.ingredients.map((ingredient) => normalizeIngredient(ingredient.name));
  const availableIngredients = normalizedIngredients.filter((name) => available.has(name));
  const missingIngredients = normalizedIngredients.filter((name) => !available.has(name));
  const pantryIngredients = normalizedIngredients.filter((name) => ['sel', 'poivre', 'cumin', 'paprika'].includes(name));
  const usefulCount = Math.max(1, normalizedIngredients.length - pantryIngredients.length);
  const weightedTotal = Math.max(1, availableIngredients.length + Math.max(0, usefulCount - availableIngredients.length) * 0.35);
  const score = Math.min(100, Math.round((availableIngredients.length / weightedTotal) * 100));

  return {
    score,
    availableIngredients: [...new Set(availableIngredients)],
    missingIngredients: [...new Set(missingIngredients)],
    alternative: missingIngredients[0]
      ? `Alternative possible: remplace ${missingIngredients[0]} par un ingredient proche ou retire-le si la texture reste correcte.`
      : 'Tu peux la preparer maintenant.',
  };
}

async function matchIngredients(userId, ingredients = []) {
  const recipes = await prisma.recipe.findMany({
    where: getVisibleRecipeWhere(userId),
    include: {
      ingredients: true,
      savedBy: { where: { userId } },
    },
  });

  return recipes
    .map((recipe) => ({ ...serializeRecipe(recipe, userId), match: scoreIngredientMatch(recipe, ingredients) }))
    .filter((recipe) => recipe.match.score > 0)
    .sort((a, b) => b.match.score - a.match.score || b.proteinG - a.proteinG)
    .slice(0, 8);
}

function scoreGeneratedRecipe(recipe, options) {
  const goalRule = GOAL_RULES[options.goal] || GOAL_RULES.maintenance;
  const tags = Array.isArray(recipe.tags) ? recipe.tags : [];
  const avoid = (options.avoidIngredients || []).map(normalizeIngredient).filter(Boolean);
  const ingredientNames = recipe.ingredients.map((ingredient) => normalizeIngredient(ingredient.name));

  if (avoid.some((blocked) => ingredientNames.includes(blocked))) return -999;
  if (options.mealType && getMealTypeFromCategory(recipe.category) !== options.mealType) return -50;
  if (options.timeAvailable && recipe.prepTimeMinutes > options.timeAvailable) return -25;
  if (options.caloriesMax && recipe.calories > options.caloriesMax) return -40;
  if (options.proteinMin && recipe.proteinG < options.proteinMin) return -35;

  let score = 0;
  score += recipe.proteinG * 1.8;
  score += Math.max(0, 30 - recipe.prepTimeMinutes) * 0.8;
  score += tags.filter((tag) => goalRule.tags.includes(tag)).length * 18;
  if (recipe.calories <= (options.caloriesMax || goalRule.maxCalories)) score += 16;
  if (recipe.proteinG >= (options.proteinMin || goalRule.minProtein)) score += 20;
  if (options.mealType && getMealTypeFromCategory(recipe.category) === options.mealType) score += 30;
  return score;
}

async function generateRecipes(userId, payload = {}) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  const goal = payload.goal || profile?.goal || 'maintenance';
  const options = {
    goal,
    mealType: payload.mealType || 'lunch',
    timeAvailable: Number(payload.timeAvailable || payload.timeAvailableMinutes || 20),
    caloriesMax: payload.caloriesMax ? Number(payload.caloriesMax) : null,
    proteinMin: payload.proteinMin ? Number(payload.proteinMin) : null,
    avoidIngredients: Array.isArray(payload.avoidIngredients) ? payload.avoidIngredients : [],
  };

  const recipes = await prisma.recipe.findMany({
    where: getVisibleRecipeWhere(userId),
    include: {
      ingredients: true,
      savedBy: { where: { userId } },
    },
  });

  return recipes
    .map((recipe) => ({
      recipe: serializeRecipe(recipe, userId),
      fitScore: Math.max(0, Math.round(scoreGeneratedRecipe(recipe, options))),
    }))
    .filter((item) => item.fitScore > 0)
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, 3)
    .map((item) => ({
      ...item.recipe,
      fitScore: Math.min(100, item.fitScore),
      reason: `Adapte a ${goal}: ${item.recipe.proteinG}g proteines, ${item.recipe.calories} kcal, pret en ${item.recipe.prepTimeMinutes} min.`,
    }));
}

async function saveRecipe(userId, recipeId) {
  const recipe = await getRecipeById(userId, recipeId);
  await prisma.userSavedRecipe.upsert({
    where: { userId_recipeId: { userId, recipeId: recipe.id } },
    update: {},
    create: { userId, recipeId: recipe.id },
  });
  return { saved: true };
}

async function unsaveRecipe(userId, recipeId) {
  const id = parseRecipeId(recipeId);
  await prisma.userSavedRecipe.deleteMany({ where: { userId, recipeId: id } });
  return { saved: false };
}

async function addRecipeToFoodLog(userId, recipeId, payload = {}) {
  const recipe = await getRecipeById(userId, recipeId);
  const entryDate = parseDateOnly(payload.entryDate || new Date().toISOString().slice(0, 10), 'entryDate');
  const mealType = payload.mealType || getMealTypeFromCategory(recipe.category);
  const foodName = `Recette FitTrack - ${recipe.title}`;

  const food = await prisma.food.findFirst({
    where: { name: foodName, isPublic: true, createdBy: null },
  }) || await prisma.food.create({
    data: {
      name: foodName,
      caloriesPer100g: recipe.calories,
      proteinPer100g: recipe.proteinG,
      carbsPer100g: recipe.carbsG,
      fatPer100g: recipe.fatG,
      category: 'other',
      isPublic: true,
      createdBy: null,
    },
  });

  const entry = await prisma.foodEntry.create({
    data: {
      userId,
      foodId: food.id,
      quantityG: 100,
      mealType,
      entryDate,
    },
    include: { food: true },
  });

  await invalidateCoachCache(userId);
  return { entry, recipe };
}

async function getCoachSuggestion(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const [profile, latestGoal, entries] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.goalSnapshot.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.foodEntry.findMany({
      where: { userId, entryDate: parseDateOnly(today, 'date') },
      include: { food: true },
    }),
  ]);

  const targetProtein = latestGoal?.targetProtein || Math.round(Number(profile?.weightKg || 75) * 1.8);
  const consumedProtein = entries.reduce((sum, entry) => sum + (entry.food.proteinPer100g * entry.quantityG / 100), 0);
  const missingProtein = Math.max(0, Math.round(targetProtein - consumedProtein));
  const recipe = await prisma.recipe.findFirst({
    where: getVisibleRecipeWhere(userId, { proteinG: { gte: Math.min(35, Math.max(20, missingProtein * 0.7)) } }),
    include: { ingredients: true, savedBy: { where: { userId } } },
    orderBy: [{ prepTimeMinutes: 'asc' }, { proteinG: 'desc' }],
  });

  return {
    missingProtein,
    message: missingProtein > 0
      ? `Il te manque ${missingProtein}g de proteines. Essaie : ${recipe?.title || 'Sandwich thon tomate'}.`
      : `Proteines bien avancees. Garde une option legere comme ${recipe?.title || 'Yaourt grec banane'}.`,
    recipe: recipe ? serializeRecipe(recipe, userId) : null,
  };
}

async function getRecommendedToday(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const [profile, latestGoal, entries] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.goalSnapshot.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.foodEntry.findMany({
      where: { userId, entryDate: parseDateOnly(today, 'date') },
      include: { food: true },
    }),
  ]);

  const targetCalories = latestGoal?.targetCalories || 2200;
  const targetProtein = latestGoal?.targetProtein || Math.round(Number(profile?.weightKg || 75) * 1.8);
  const consumed = entries.reduce((acc, entry) => {
    const ratio = entry.quantityG / 100;
    acc.calories += entry.food.caloriesPer100g * ratio;
    acc.protein += entry.food.proteinPer100g * ratio;
    return acc;
  }, { calories: 0, protein: 0 });

  const caloriesRemaining = Math.max(250, Math.round(targetCalories - consumed.calories));
  const proteinRemaining = Math.max(15, Math.round(targetProtein - consumed.protein));
  const goal = profile?.goal || 'maintenance';

  const recipes = await prisma.recipe.findMany({
    where: getVisibleRecipeWhere(userId, {
      calories: { lte: Math.min(900, caloriesRemaining + 120) },
      proteinG: { gte: Math.min(45, Math.max(20, proteinRemaining * 0.55)) },
    }),
    include: {
      ingredients: true,
      savedBy: { where: { userId } },
    },
    take: 80,
  });

  const scored = recipes
    .filter((recipe) => recipeMatchesGoal(recipe, goal))
    .map((recipe) => {
      const calorieGap = Math.abs(caloriesRemaining - recipe.calories);
      const proteinHelp = Math.min(50, recipe.proteinG);
      const quickBonus = recipe.prepTimeMinutes <= 15 ? 14 : 0;
      const goalBonus = recipeMatchesGoal(recipe, goal) ? 18 : 0;
      return {
        recipe,
        score: proteinHelp * 2 - calorieGap * 0.04 + quickBonus + goalBonus,
      };
    })
    .sort((a, b) => b.score - a.score);

  const selected = scored[0]?.recipe || await prisma.recipe.findFirst({
    where: getVisibleRecipeWhere(userId),
    include: {
      ingredients: true,
      savedBy: { where: { userId } },
    },
    orderBy: [{ proteinG: 'desc' }, { prepTimeMinutes: 'asc' }],
  });

  return {
    goal,
    caloriesRemaining,
    proteinRemaining,
    reason: selected
      ? `Adaptee a ton objectif ${goal}: ${selected.proteinG}g proteines, ${selected.calories} kcal, ${selected.prepTimeMinutes} min.`
      : 'Aucune recette disponible pour le moment.',
    recipe: selected ? serializeRecipe(selected, userId) : null,
  };
}

module.exports = {
  listRecipes,
  getRecipeById,
  getHighProteinRecipes,
  matchIngredients,
  generateRecipes,
  saveRecipe,
  unsaveRecipe,
  addRecipeToFoodLog,
  getCoachSuggestion,
  getRecommendedToday,
};
