// ══════════════════════════════════════════════════════════════
// FitTrack — Service des Pesées (WeightEntries)
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
 * Récupère l'historique des pesées de l'utilisateur.
 * Trié par date décroissante.
 */
async function getWeightEntries(userId, limit = 30) {
  return prisma.weightEntry.findMany({
    where: { userId },
    orderBy: { entryDate: 'desc' },
    take: Math.min(limit, 100),
  });
}

/**
 * Récupère la dernière pesée de l'utilisateur.
 */
async function getLatestWeight(userId) {
  return prisma.weightEntry.findFirst({
    where: { userId },
    orderBy: { entryDate: 'desc' },
  });
}

/**
 * Ajoute ou met à jour une pesée pour une date donnée.
 * Utilise upsert car une seule pesée par jour (@@unique([userId, entryDate])).
 */
async function addOrUpdateWeightEntry(userId, data) {
  const entryDate = parseDateOnly(data.entryDate, 'entryDate');

  const entry = await prisma.weightEntry.upsert({
    where: {
      userId_entryDate: {
        userId,
        entryDate,
      },
    },
    update: {
      weightKg: data.weightKg,
      notes: data.notes !== undefined ? data.notes : undefined,
    },
    create: {
      userId,
      weightKg: data.weightKg,
      entryDate,
      notes: data.notes || null,
    },
  });
  await invalidateCoachCache(userId);
  return entry;
}

/**
 * Supprime une pesée par ID.
 */
async function deleteWeightEntry(userId, entryId) {
  const entry = await prisma.weightEntry.findUnique({ where: { id: entryId } });

  if (!entry || entry.userId !== userId) {
    throw createError('Pesée non trouvée ou non autorisée', 404);
  }

  await prisma.weightEntry.delete({ where: { id: entryId } });
  await invalidateCoachCache(userId);
  return { success: true };
}

/**
 * Calcule les statistiques de poids (min, max, moyenne, variation).
 */
async function getWeightStats(userId) {
  const entries = await prisma.weightEntry.findMany({
    where: { userId },
    orderBy: { entryDate: 'asc' },
  });

  if (entries.length === 0) {
    return null;
  }

  const weights = entries.map(e => e.weightKg);
  const first = entries[0];
  const last = entries[entries.length - 1];

  return {
    totalEntries: entries.length,
    currentWeight: last.weightKg,
    startWeight: first.weightKg,
    minWeight: Math.min(...weights),
    maxWeight: Math.max(...weights),
    averageWeight: Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10,
    totalChange: Math.round((last.weightKg - first.weightKg) * 10) / 10,
    firstDate: first.entryDate,
    lastDate: last.entryDate,
  };
}

module.exports = {
  getWeightEntries,
  getLatestWeight,
  addOrUpdateWeightEntry,
  deleteWeightEntry,
  getWeightStats,
};
