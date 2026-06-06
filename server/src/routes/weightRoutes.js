// ══════════════════════════════════════════════════════════════
// FitTrack — Routes des Pesées (WeightEntries)
// ══════════════════════════════════════════════════════════════

const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const weightController = require('../controllers/weightController');

const router = express.Router();

router.use(auth);

// ─── GET /api/weight ───
router.get('/', weightController.getWeightEntries);

// ─── GET /api/weight/latest ───
router.get('/latest', weightController.getLatestWeight);

// ─── GET /api/weight/stats ───
router.get('/stats', weightController.getWeightStats);

// ─── POST /api/weight ───
router.post(
  '/',
  [
    body('weightKg')
      .isFloat({ min: 20, max: 500 })
      .withMessage('Le poids doit être entre 20 et 500 kg'),
    body('entryDate')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date invalide'),
    body('notes')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Notes trop longues (max 500 caractères)'),
  ],
  validate,
  weightController.addOrUpdateWeight
);

// ─── DELETE /api/weight/:id ───
router.delete('/:id', weightController.deleteWeight);

module.exports = router;
