// ══════════════════════════════════════════════════════════════
// FitTrack — Routes Entraînements (Workouts)
// ══════════════════════════════════════════════════════════════

const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const workoutController = require('../controllers/workoutController');

const router = express.Router();

router.use(auth);

// ─── GET /api/workouts ───
router.get('/', workoutController.getWorkouts);

// ─── GET /api/workouts/week ───
router.get('/week', workoutController.getWeeklySummary);

// ─── POST /api/workouts ───
router.post(
  '/',
  [
    body('exerciseId').isInt({ min: 1 }).withMessage('ID exercice requis'),
    body('durationMinutes').isInt({ min: 1, max: 1440 }).withMessage('Durée invalide (1-1440 min)'),
    body('workoutDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date invalide'),
    body('notes').optional().isString(),
  ],
  validate,
  workoutController.addWorkout
);

// ─── PUT /api/workouts/:id ───
router.put(
  '/:id',
  [
    body('exerciseId').optional().isInt({ min: 1 }),
    body('durationMinutes').optional().isInt({ min: 1, max: 1440 }),
    body('notes').optional().isString(),
  ],
  validate,
  workoutController.updateWorkout
);

// ─── DELETE /api/workouts/:id ───
router.delete('/:id', workoutController.deleteWorkout);

module.exports = router;
