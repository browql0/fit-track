// ══════════════════════════════════════════════════════════════
// FitTrack — Contrôleur des Exercices
// ══════════════════════════════════════════════════════════════

const exerciseService = require('../services/exerciseService');

const getAllExercises = async (req, res, next) => {
  try {
    const exercises = await exerciseService.getAllExercises();
    res.json(exercises);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllExercises,
};
