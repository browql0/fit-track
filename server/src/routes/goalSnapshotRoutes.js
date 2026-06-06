// ══════════════════════════════════════════════════════════════
// FitTrack — Routes des Objectifs (GoalSnapshots)
// ══════════════════════════════════════════════════════════════

const express = require('express');
const { auth } = require('../middleware/auth');
const goalSnapshotController = require('../controllers/goalSnapshotController');

const router = express.Router();

// Toutes les routes d'objectifs nécessitent d'être connecté
router.use(auth);

// ─── GET /api/goal-snapshots ───
router.get('/', goalSnapshotController.getGoalSnapshots);

// ─── GET /api/goal-snapshots/current ───
router.get('/current', goalSnapshotController.getCurrentGoalSnapshot);

module.exports = router;
