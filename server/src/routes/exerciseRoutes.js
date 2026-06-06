// ══════════════════════════════════════════════════════════════
// FitTrack — Routes Exercices
// ══════════════════════════════════════════════════════════════

const express = require('express');
const { auth } = require('../middleware/auth');
const exerciseController = require('../controllers/exerciseController');

const router = express.Router();

router.use(auth);

// ─── GET /api/exercises ───
router.get('/', exerciseController.getAllExercises);

module.exports = router;
