const prisma = require('../config/prismaClient');
const { parseDateOnly } = require('../utils/dateUtils');
const { invalidateCoachCache } = require('./coachSnapshotService');

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function getHydrationEntries(userId, dateStr) {
  const entryDate = parseDateOnly(dateStr, 'date');
  return prisma.hydrationEntry.findMany({
    where: { userId, entryDate },
    orderBy: { createdAt: 'asc' },
  });
}

async function addHydrationEntry(userId, data) {
  const amountMl = Math.round(Number(data.amountMl || 0));
  if (amountMl < 50 || amountMl > 5000) {
    throw createError('Quantite hydratation invalide (50-5000 ml)', 400);
  }

  const entry = await prisma.hydrationEntry.create({
    data: {
      userId,
      amountMl,
      entryDate: parseDateOnly(data.entryDate, 'entryDate'),
    },
  });
  await invalidateCoachCache(userId);
  return entry;
}

async function deleteHydrationEntry(userId, entryId) {
  const entry = await prisma.hydrationEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.userId !== userId) {
    throw createError('Entree hydratation introuvable', 404);
  }
  await prisma.hydrationEntry.delete({ where: { id: entryId } });
  await invalidateCoachCache(userId);
  return { success: true };
}

async function getHydrationSummary(userId, dateStr) {
  const entries = await getHydrationEntries(userId, dateStr);
  const totalMl = entries.reduce((sum, entry) => sum + Number(entry.amountMl || 0), 0);
  return {
    totalMl,
    entriesCount: entries.length,
    targetMl: 2500,
    progress: Math.min(140, Math.round((totalMl / 2500) * 100)),
  };
}

module.exports = {
  getHydrationEntries,
  addHydrationEntry,
  deleteHydrationEntry,
  getHydrationSummary,
};
