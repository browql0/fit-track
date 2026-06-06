// ══════════════════════════════════════════════════════════════
// FitTrack — Contrôleur Alimentaire (Foods + FoodEntries)
// ══════════════════════════════════════════════════════════════

const foodService = require('../services/foodService');

// ─── Utilitaire de parsing sécurisé ───
function parseId(value) {
  const id = parseInt(value, 10);
  if (isNaN(id) || id < 1) {
    const err = new Error('ID invalide');
    err.statusCode = 400;
    throw err;
  }
  return id;
}

// ─── GESTION DES ALIMENTS (FOODS) ───

const searchFoods = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { search, category } = req.query;
    const foods = await foodService.searchFoods(userId, search, category);
    res.json(foods);
  } catch (error) {
    next(error);
  }
};

const getFoodById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const foodId = parseId(req.params.id);
    const food = await foodService.getFoodById(userId, foodId);
    res.json(food);
  } catch (error) {
    next(error);
  }
};

const createCustomFood = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const food = await foodService.createCustomFood(userId, req.body);
    res.status(201).json({ message: 'Aliment créé', food });
  } catch (error) {
    next(error);
  }
};

const externalSearch = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const foods = await foodService.externalSearchAndImport(userId, req.query.search || req.query.q || '');
    res.json(foods);
  } catch (error) {
    next(error);
  }
};

const estimateFood = async (req, res, next) => {
  try {
    const estimate = foodService.estimateFood(req.body.description);
    res.json(estimate);
  } catch (error) {
    next(error);
  }
};

// ─── GESTION DU JOURNAL (FOOD ENTRIES) ───

const getFoodEntries = async (req, res, next) => {
  try {
    const userId = req.user.id;
    // Si pas de date fournie, utiliser la date du jour (format YYYY-MM-DD)
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    
    const entries = await foodService.getFoodEntriesByDate(userId, dateStr);
    res.json(entries);
  } catch (error) {
    next(error);
  }
};

const getDailySummary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    
    const summary = await foodService.getDailySummary(userId, dateStr);
    res.json(summary);
  } catch (error) {
    next(error);
  }
};

const addFoodEntry = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const entry = await foodService.addFoodEntry(userId, req.body);
    res.status(201).json({ message: 'Aliment ajouté au journal', entry });
  } catch (error) {
    next(error);
  }
};

const updateFoodEntry = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const entryId = parseId(req.params.id);
    const entry = await foodService.updateFoodEntry(userId, entryId, req.body);
    res.json({ message: 'Entrée mise à jour', entry });
  } catch (error) {
    next(error);
  }
};

const deleteFoodEntry = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const entryId = parseId(req.params.id);
    await foodService.deleteFoodEntry(userId, entryId);
    res.json({ message: 'Entrée supprimée' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchFoods,
  getFoodById,
  createCustomFood,
  externalSearch,
  estimateFood,
  getFoodEntries,
  getDailySummary,
  addFoodEntry,
  updateFoodEntry,
  deleteFoodEntry,
};
