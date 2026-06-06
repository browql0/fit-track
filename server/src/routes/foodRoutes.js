const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const foodController = require('../controllers/foodController');

const router = express.Router();

router.use(auth);

router.get('/', foodController.searchFoods);

router.get('/external-search', foodController.externalSearch);

router.post(
  '/estimate',
  [
    body('description').trim().notEmpty().isLength({ max: 255 }).withMessage('Description requise (max 255 caracteres)'),
  ],
  validate,
  foodController.estimateFood
);

router.get('/:id', foodController.getFoodById);

router.post(
  '/',
  [
    body('name').trim().notEmpty().isLength({ max: 255 }).withMessage('Le nom est requis (max 255 caracteres)'),
    body('caloriesPer100g').isFloat({ min: 0, max: 1000 }).withMessage('Calories invalides (0-1000)'),
    body('proteinPer100g').isFloat({ min: 0, max: 100 }).withMessage('Proteines invalides (0-100g)'),
    body('carbsPer100g').isFloat({ min: 0, max: 100 }).withMessage('Glucides invalides (0-100g)'),
    body('fatPer100g').isFloat({ min: 0, max: 100 }).withMessage('Lipides invalides (0-100g)'),
    body('category').notEmpty().isIn(['protein', 'grain', 'vegetable', 'fruit', 'dairy', 'fat', 'other']).withMessage('Categorie invalide'),
  ],
  validate,
  foodController.createCustomFood
);

module.exports = router;
