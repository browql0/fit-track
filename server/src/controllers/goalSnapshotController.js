// ══════════════════════════════════════════════════════════════
// FitTrack — Contrôleur des Objectifs (GoalSnapshots)
// ══════════════════════════════════════════════════════════════

const prisma = require('../config/prismaClient');

/**
 * GET /api/goal-snapshots
 * Récupère l'historique complet des objectifs de l'utilisateur.
 */
const getGoalSnapshots = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const snapshots = await prisma.goalSnapshot.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(snapshots);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/goal-snapshots/current
 * Récupère l'objectif le plus récent (actuel) de l'utilisateur.
 */
const getCurrentGoalSnapshot = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const current = await prisma.goalSnapshot.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!current) {
      return res.status(404).json({ error: 'Aucun objectif trouvé. Veuillez créer un profil.' });
    }

    res.json(current);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGoalSnapshots,
  getCurrentGoalSnapshot,
};
