const prisma = require('../config/prismaClient');
const { parseDateOnly } = require('../utils/dateUtils');
const coachEngine = require('../ai/coachEngine');
const { invalidateCoachCache } = require('./coachSnapshotService');

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function dateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

async function completeMission(userId, data) {
  const missionId = String(data.missionId || '').trim();
  if (!missionId) {
    throw createError('missionId requis', 400);
  }

  const missionDate = parseDateOnly(data.missionDate || new Date().toISOString().slice(0, 10), 'missionDate');
  const today = new Date().toISOString().slice(0, 10);
  if (dateKey(missionDate) !== today) {
    throw createError('Seules les missions du jour peuvent etre completees', 400);
  }

  const report = await coachEngine.getCoachReport(userId);
  const activeMission = (report.missions || []).find((mission) => mission.id === missionId);
  if (!activeMission) {
    throw createError('Mission inconnue ou inactive', 404);
  }

  const xpEarned = Math.max(0, Math.round(Number(activeMission.xp || 0)));

  const completion = await prisma.missionCompletion.upsert({
    where: {
      userId_missionId_missionDate: {
        userId,
        missionId,
        missionDate,
      },
    },
    update: { xpEarned },
    create: {
      userId,
      missionId,
      missionDate,
      xpEarned,
    },
  });
  await invalidateCoachCache(userId);
  return completion;
}

async function getMissionCompletions(userId, days = 30) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - Math.max(1, Number(days || 30)));

  return prisma.missionCompletion.findMany({
    where: { userId, missionDate: { gte: since } },
    orderBy: { missionDate: 'desc' },
  });
}

module.exports = { completeMission, getMissionCompletions };
