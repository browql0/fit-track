const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const profileController = require('../controllers/profileController');
const { ACTIVITY_LEVELS, GOALS, GENDERS } = require('../utils/constants');

const router = express.Router();

const profileValidation = [
  body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Le nom est requis'),
  body('age').isInt({ min: 10, max: 120 }).withMessage('Age invalide'),
  body('gender').isIn(GENDERS).withMessage('Genre invalide'),
  body('heightCm').isFloat({ min: 50, max: 250 }).withMessage('Taille invalide'),
  body('weightKg').isFloat({ min: 20, max: 300 }).withMessage('Poids invalide'),
  body('targetWeightKg').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 20, max: 300 }).withMessage('Poids cible invalide'),
  body('activityLevel').isIn(ACTIVITY_LEVELS).withMessage('Niveau activite invalide'),
  body('goal').isIn(GOALS).withMessage('Objectif invalide'),
];

router.use(auth);

router.get('/', profileController.getProfile);
router.post('/', profileValidation, validate, profileController.createProfile);
router.put('/', profileValidation, validate, profileController.updateProfile);

module.exports = router;
