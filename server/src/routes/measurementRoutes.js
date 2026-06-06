// ══════════════════════════════════════════════════════════════
// FitTrack — Routes des Mensurations (BodyMeasurements)
// ══════════════════════════════════════════════════════════════

const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const measurementController = require('../controllers/measurementController');

const router = express.Router();

router.use(auth);

// ─── Validation commune ───
const measurementValidation = [
  body('measurementDate')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date invalide'),
  body('waistCm')
    .optional()
    .isFloat({ min: 20, max: 200 })
    .withMessage('Tour de taille invalide (20-200 cm)'),
  body('chestCm')
    .optional()
    .isFloat({ min: 20, max: 200 })
    .withMessage('Tour de poitrine invalide (20-200 cm)'),
  body('armCm')
    .optional()
    .isFloat({ min: 10, max: 100 })
    .withMessage('Tour de bras invalide (10-100 cm)'),
  body('thighCm')
    .optional()
    .isFloat({ min: 20, max: 150 })
    .withMessage('Tour de cuisse invalide (20-150 cm)'),
  body('neckCm')
    .optional()
    .isFloat({ min: 15, max: 80 })
    .withMessage('Tour de cou invalide (15-80 cm)'),
];

const updateMeasurementValidation = [
  body('waistCm')
    .optional()
    .isFloat({ min: 20, max: 200 })
    .withMessage('Tour de taille invalide (20-200 cm)'),
  body('chestCm')
    .optional()
    .isFloat({ min: 20, max: 200 })
    .withMessage('Tour de poitrine invalide (20-200 cm)'),
  body('armCm')
    .optional()
    .isFloat({ min: 10, max: 100 })
    .withMessage('Tour de bras invalide (10-100 cm)'),
  body('thighCm')
    .optional()
    .isFloat({ min: 20, max: 150 })
    .withMessage('Tour de cuisse invalide (20-150 cm)'),
  body('neckCm')
    .optional()
    .isFloat({ min: 15, max: 80 })
    .withMessage('Tour de cou invalide (15-80 cm)'),
];

// ─── GET /api/measurements ───
router.get('/', measurementController.getMeasurements);

// ─── GET /api/measurements/latest ───
router.get('/latest', measurementController.getLatestMeasurement);

// ─── GET /api/measurements/progress ───
router.get('/progress', measurementController.getMeasurementProgress);

// ─── POST /api/measurements ───
router.post('/', measurementValidation, validate, measurementController.addMeasurement);

// ─── PUT /api/measurements/:id ───
router.put('/:id', updateMeasurementValidation, validate, measurementController.updateMeasurement);

// ─── DELETE /api/measurements/:id ───
router.delete('/:id', measurementController.deleteMeasurement);

module.exports = router;
