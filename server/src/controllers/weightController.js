// ══════════════════════════════════════════════════════════════
// FitTrack — Contrôleur des Pesées (WeightEntries)
// ══════════════════════════════════════════════════════════════

const weightService = require('../services/weightService');
const { parsePositiveLimit } = require('../utils/dateUtils');

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

/**
 * GET /api/weight
 * Récupère l'historique des pesées.
 */
const getWeightEntries = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parsePositiveLimit(req.query.limit, 30, 100);
    const entries = await weightService.getWeightEntries(userId, limit);
    res.json(entries);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/weight/latest
 * Récupère la dernière pesée.
 */
const getLatestWeight = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const entry = await weightService.getLatestWeight(userId);

    if (!entry) {
      return res.json(null);
    }

    res.json(entry);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/weight/stats
 * Récupère les statistiques de poids.
 */
const getWeightStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const stats = await weightService.getWeightStats(userId);

    if (!stats) {
      return res.json({ totalEntries: 0, totalChange: 0 });
    }

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/weight
 * Ajoute ou met à jour une pesée.
 */
const addOrUpdateWeight = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const entry = await weightService.addOrUpdateWeightEntry(userId, req.body);
    res.status(201).json({ message: 'Pesée enregistrée', entry });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/weight/:id
 * Supprime une pesée.
 */
const deleteWeight = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const entryId = parseId(req.params.id);
    await weightService.deleteWeightEntry(userId, entryId);
    res.json({ message: 'Pesée supprimée' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWeightEntries,
  getLatestWeight,
  getWeightStats,
  addOrUpdateWeight,
  deleteWeight,
};
