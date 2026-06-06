// ══════════════════════════════════════════════════════════════
// FitTrack — Routes Journal Alimentaire (Food Entries)
// ══════════════════════════════════════════════════════════════

const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const foodController = require('../controllers/foodController');
const { MEAL_TYPES } = require('../utils/constants');

const router = express.Router();

router.use(auth);

// ─── GET /api/food-entries ───
router.get('/', foodController.getFoodEntries);

// ─── GET /api/food-entries/summary ───
router.get('/summary', foodController.getDailySummary);

// ─── POST /api/food-entries ───
router.post(
  '/',
  [
    body('foodId').isInt({ min: 1 }).withMessage('ID aliment requis'),
    body('quantityG').isFloat({ min: 1, max: 10000 }).withMessage('Quantité invalide (1-10000g)'),
    body('mealType').isIn(MEAL_TYPES).withMessage('Type de repas invalide'),
    body('entryDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date invalide'),
  ],
  validate,
  foodController.addFoodEntry
);

// ─── PUT /api/food-entries/:id ───
router.put(
  '/:id',
  [
    body('quantityG').optional().isFloat({ min: 1 }).withMessage('Quantité invalide'),
    body('mealType').optional().isIn(MEAL_TYPES).withMessage('Type de repas invalide'),
  ],
  validate,
  foodController.updateFoodEntry
);

// ─── DELETE /api/food-entries/:id ───
router.delete('/:id', foodController.deleteFoodEntry);

module.exports = router;
