// ══════════════════════════════════════════════════════════════
// FitTrack — Contrôleur des Entraînements (Workouts)
// ══════════════════════════════════════════════════════════════

const workoutService = require('../services/workoutService');

// ─── Utilitaire de parsing sécurisé ───
function parseId(value) {
  const id = parseInt(value, 10);
  if (isNaN(id) || id < 1) {
    const err = new Error('ID invalide');
    err.statusCode = 400;
    throw err;
  }
  return id;
}

const getWorkouts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const workouts = await workoutService.getWorkoutsByDate(userId, dateStr);
    res.json(workouts);
  } catch (error) {
    next(error);
  }
};

const getWeeklySummary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const summary = await workoutService.getWeeklySummary(userId);
    res.json(summary);
  } catch (error) {
    next(error);
  }
};

const addWorkout = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const workout = await workoutService.addWorkout(userId, req.body);
    res.status(201).json({ message: 'Séance ajoutée', workout });
  } catch (error) {
    next(error);
  }
};

const updateWorkout = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const workoutId = parseId(req.params.id);
    const workout = await workoutService.updateWorkout(userId, workoutId, req.body);
    res.json({ message: 'Séance mise à jour', workout });
  } catch (error) {
    next(error);
  }
};

const deleteWorkout = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const workoutId = parseId(req.params.id);
    await workoutService.deleteWorkout(userId, workoutId);
    res.json({ message: 'Séance supprimée' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWorkouts,
  getWeeklySummary,
  addWorkout,
  updateWorkout,
  deleteWorkout,
};
