const recipeService = require('../services/recipeService');

function parseId(value) {
  const id = parseInt(value, 10);
  if (Number.isNaN(id) || id < 1) {
    const err = new Error('ID invalide');
    err.statusCode = 400;
    throw err;
  }
  return id;
}

const listRecipes = async (req, res, next) => {
  try {
    const recipes = await recipeService.listRecipes(req.user.id, req.query);
    res.json(recipes);
  } catch (error) {
    next(error);
  }
};

const getRecipeById = async (req, res, next) => {
  try {
    const recipe = await recipeService.getRecipeById(req.user.id, parseId(req.params.id));
    res.json(recipe);
  } catch (error) {
    next(error);
  }
};

const getHighProteinRecipes = async (req, res, next) => {
  try {
    const recipes = await recipeService.getHighProteinRecipes(req.user.id);
    res.json(recipes);
  } catch (error) {
    next(error);
  }
};

const matchIngredients = async (req, res, next) => {
  try {
    const recipes = await recipeService.matchIngredients(req.user.id, req.body.ingredients || []);
    res.json({ recipes });
  } catch (error) {
    next(error);
  }
};

const generateRecipes = async (req, res, next) => {
  try {
    const recipes = await recipeService.generateRecipes(req.user.id, req.body);
    res.json({ recipes });
  } catch (error) {
    next(error);
  }
};

const saveRecipe = async (req, res, next) => {
  try {
    const result = await recipeService.saveRecipe(req.user.id, parseId(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const unsaveRecipe = async (req, res, next) => {
  try {
    const result = await recipeService.unsaveRecipe(req.user.id, parseId(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const addRecipeToFoodLog = async (req, res, next) => {
  try {
    const result = await recipeService.addRecipeToFoodLog(req.user.id, parseId(req.params.id), req.body);
    res.status(201).json({ message: 'Recette ajoutee au journal', ...result });
  } catch (error) {
    next(error);
  }
};

const getCoachSuggestion = async (req, res, next) => {
  try {
    const suggestion = await recipeService.getCoachSuggestion(req.user.id);
    res.json(suggestion);
  } catch (error) {
    next(error);
  }
};

const getRecommendedToday = async (req, res, next) => {
  try {
    const recommendation = await recipeService.getRecommendedToday(req.user.id);
    res.json(recommendation);
  } catch (error) {
    next(error);
  }
};

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
