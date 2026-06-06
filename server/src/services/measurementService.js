// ══════════════════════════════════════════════════════════════
// FitTrack — Service des Mensurations (BodyMeasurements)
// ══════════════════════════════════════════════════════════════

const prisma = require('../config/prismaClient');
const { parseDateOnly } = require('../utils/dateUtils');
const { invalidateCoachCache } = require('./coachSnapshotService');

// ─── Utilitaire d'erreur ───
function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Récupère l'historique des mensurations.
 * Trié par date décroissante.
 */
async function getMeasurements(userId, limit = 30) {
  return prisma.bodyMeasurement.findMany({
    where: { userId },
    orderBy: { measurementDate: 'desc' },
    take: Math.min(limit, 100),
  });
}

/**
 * Récupère la dernière mensuration.
 */
async function getLatestMeasurement(userId) {
  return prisma.bodyMeasurement.findFirst({
    where: { userId },
    orderBy: { measurementDate: 'desc' },
  });
}

/**
 * Ajoute une mensuration.
 * Au moins une mesure doit être fournie.
 */
async function addMeasurement(userId, data) {
  const measurementDate = parseDateOnly(data.measurementDate, 'measurementDate');

  // Vérifier qu'au moins une mesure est fournie
  const { waistCm, chestCm, armCm, thighCm, neckCm } = data;
  if (!waistCm && !chestCm && !armCm && !thighCm && !neckCm) {
    throw createError('Au moins une mensuration est requise', 400);
  }

  const created = await prisma.bodyMeasurement.create({
    data: {
      userId,
      waistCm: waistCm || null,
      chestCm: chestCm || null,
      armCm: armCm || null,
      thighCm: thighCm || null,
      neckCm: neckCm || null,
      measurementDate,
    },
  });
  await invalidateCoachCache(userId);
  return created;
}

/**
 * Met à jour une mensuration existante.
 */
async function updateMeasurement(userId, measurementId, data) {
  const existing = await prisma.bodyMeasurement.findUnique({
    where: { id: measurementId },
  });

  if (!existing || existing.userId !== userId) {
    throw createError('Mensuration non trouvée ou non autorisée', 404);
  }

  const updated = await prisma.bodyMeasurement.update({
    where: { id: measurementId },
    data: {
      waistCm: data.waistCm !== undefined ? data.waistCm : existing.waistCm,
      chestCm: data.chestCm !== undefined ? data.chestCm : existing.chestCm,
      armCm: data.armCm !== undefined ? data.armCm : existing.armCm,
      thighCm: data.thighCm !== undefined ? data.thighCm : existing.thighCm,
      neckCm: data.neckCm !== undefined ? data.neckCm : existing.neckCm,
    },
  });
  await invalidateCoachCache(userId);
  return updated;
}

/**
 * Supprime une mensuration.
 */
async function deleteMeasurement(userId, measurementId) {
  const existing = await prisma.bodyMeasurement.findUnique({
    where: { id: measurementId },
  });

  if (!existing || existing.userId !== userId) {
    throw createError('Mensuration non trouvée ou non autorisée', 404);
  }

  await prisma.bodyMeasurement.delete({ where: { id: measurementId } });
  await invalidateCoachCache(userId);
  return { success: true };
}

/**
 * Compare la dernière mensuration avec la première.
 */
async function getMeasurementProgress(userId) {
  const entries = await prisma.bodyMeasurement.findMany({
    where: { userId },
    orderBy: { measurementDate: 'asc' },
  });

  if (entries.length < 2) {
    return null;
  }

  const first = entries[0];
  const last = entries[entries.length - 1];

  const calcDiff = (current, initial) => {
    if (current == null || initial == null) return null;
    return Math.round((current - initial) * 10) / 10;
  };

  return {
    totalEntries: entries.length,
    firstDate: first.measurementDate,
    lastDate: last.measurementDate,
    changes: {
      waistCm: calcDiff(last.waistCm, first.waistCm),
      chestCm: calcDiff(last.chestCm, first.chestCm),
      armCm: calcDiff(last.armCm, first.armCm),
      thighCm: calcDiff(last.thighCm, first.thighCm),
      neckCm: calcDiff(last.neckCm, first.neckCm),
    },
    latest: last,
    initial: first,
  };
}

module.exports = {
  getMeasurements,
  getLatestMeasurement,
  addMeasurement,
  updateMeasurement,
  deleteMeasurement,
  getMeasurementProgress,
};
