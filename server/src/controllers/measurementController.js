// ══════════════════════════════════════════════════════════════
// FitTrack — Contrôleur des Mensurations (BodyMeasurements)
// ══════════════════════════════════════════════════════════════

const measurementService = require('../services/measurementService');
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
 * GET /api/measurements
 * Récupère l'historique des mensurations.
 */
const getMeasurements = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parsePositiveLimit(req.query.limit, 30, 100);
    const entries = await measurementService.getMeasurements(userId, limit);
    res.json(entries);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/measurements/latest
 * Récupère la dernière mensuration.
 */
const getLatestMeasurement = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const entry = await measurementService.getLatestMeasurement(userId);

    if (!entry) {
      return res.status(404).json({ error: 'Aucune mensuration enregistrée' });
    }

    res.json(entry);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/measurements/progress
 * Récupère la progression des mensurations.
 */
const getMeasurementProgress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const progress = await measurementService.getMeasurementProgress(userId);

    if (!progress) {
      return res.status(404).json({ error: 'Pas assez de mensurations pour calculer la progression (min: 2)' });
    }

    res.json(progress);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/measurements
 * Ajoute une mensuration.
 */
const addMeasurement = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const entry = await measurementService.addMeasurement(userId, req.body);
    res.status(201).json({ message: 'Mensuration enregistrée', entry });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/measurements/:id
 * Met à jour une mensuration.
 */
const updateMeasurement = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const measurementId = parseId(req.params.id);
    const entry = await measurementService.updateMeasurement(userId, measurementId, req.body);
    res.json({ message: 'Mensuration mise à jour', entry });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/measurements/:id
 * Supprime une mensuration.
 */
const deleteMeasurement = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const measurementId = parseId(req.params.id);
    await measurementService.deleteMeasurement(userId, measurementId);
    res.json({ message: 'Mensuration supprimée' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMeasurements,
  getLatestMeasurement,
  getMeasurementProgress,
  addMeasurement,
  updateMeasurement,
  deleteMeasurement,
};
