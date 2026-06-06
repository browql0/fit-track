const prisma = require('../config/prismaClient');
const { parseDateOnly } = require('../utils/dateUtils');

const CACHE_TTL_MS = 30 * 60 * 1000;

function clonePayload(payload) {
  return JSON.parse(JSON.stringify(payload));
}

async function saveCoachSnapshot(userId, report) {
  const snapshotDate = parseDateOnly(report.summary?.date || new Date().toISOString().slice(0, 10), 'snapshotDate');
  const payload = clonePayload(report);
  return prisma.coachSnapshot.upsert({
    where: {
      userId_snapshotDate: {
        userId,
        snapshotDate,
      },
    },
    update: {
      score: report.score,
      nutrition: report.nutrition,
      training: report.training,
      progression: report.progression,
      consistency: report.consistency,
      payload,
    },
    create: {
      userId,
      score: report.score,
      nutrition: report.nutrition,
      training: report.training,
      progression: report.progression,
      consistency: report.consistency,
      payload,
      snapshotDate,
    },
  });
}

async function getFreshCoachSnapshot(userId) {
  const freshSince = new Date(Date.now() - CACHE_TTL_MS);
  const snapshot = await prisma.coachSnapshot.findFirst({
    where: {
      userId,
      updatedAt: { gte: freshSince },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!snapshot?.payload) return null;

  return {
    ...clonePayload(snapshot.payload),
    meta: {
      ...(snapshot.payload.meta || {}),
      cache: {
        hit: true,
        snapshotId: snapshot.id,
        updatedAt: snapshot.updatedAt,
        ttlSeconds: Math.max(0, Math.round((snapshot.updatedAt.getTime() + CACHE_TTL_MS - Date.now()) / 1000)),
      },
    },
  };
}

async function invalidateCoachCache(userId) {
  if (!userId) return { count: 0 };
  return prisma.coachSnapshot.deleteMany({
    where: {
      userId,
      updatedAt: { gte: new Date(Date.now() - CACHE_TTL_MS) },
    },
  });
}

async function getCoachSnapshots(userId, days = 30) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - Math.max(1, Number(days || 30)));

  return prisma.coachSnapshot.findMany({
    where: { userId, snapshotDate: { gte: since } },
    orderBy: { snapshotDate: 'asc' },
  });
}

module.exports = {
  CACHE_TTL_MS,
  getCoachSnapshots,
  getFreshCoachSnapshot,
  invalidateCoachCache,
  saveCoachSnapshot,
};
