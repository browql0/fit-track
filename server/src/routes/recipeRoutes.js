const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const recipeController = require('../controllers/recipeController');
const { MEAL_TYPES, GOALS } = require('../utils/constants');

const router = express.Router();

router.use(auth);

router.get('/', recipeController.listRecipes);
router.get('/high-protein', recipeController.getHighProteinRecipes);
router.get('/coach-suggestion', recipeController.getCoachSuggestion);
router.get('/recommended-today', recipeController.getRecommendedToday);

router.post(
  '/match-ingredients',
  [
    body('ingredients').isArray({ min: 0, max: 40 }).withMessage('Ingredients invalides'),
    body('ingredients.*').optional().isString().isLength({ max: 80 }).withMessage('Ingredient invalide'),
  ],
  validate,
  recipeController.matchIngredients
);

router.post(
  '/generate',
  [
    body('goal').optional().isIn(GOALS).withMessage('Objectif invalide'),
    body('mealType').optional().isIn(MEAL_TYPES).withMessage('Type de repas invalide'),
    body('timeAvailable').optional().isInt({ min: 5, max: 120 }).withMessage('Temps invalide'),
    body('timeAvailableMinutes').optional().isInt({ min: 5, max: 120 }).withMessage('Temps invalide'),
    body('caloriesMax').optional().isInt({ min: 100, max: 2000 }).withMessage('Calories max invalides'),
    body('proteinMin').optional().isInt({ min: 0, max: 150 }).withMessage('Proteines minimum invalides'),
    body('avoidIngredients').optional().isArray({ max: 30 }).withMessage('Ingredients a eviter invalides'),
  ],
  validate,
  recipeController.generateRecipes
);

router.get('/:id', recipeController.getRecipeById);
router.post('/:id/save', recipeController.saveRecipe);
router.delete('/:id/save', recipeController.unsaveRecipe);

router.post(
  '/:id/add-to-food-log',
  [
    body('mealType').optional().isIn(MEAL_TYPES).withMessage('Type de repas invalide'),
    body('entryDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date invalide'),
  ],
  validate,
  recipeController.addRecipeToFoodLog
);

module.exports = router;
