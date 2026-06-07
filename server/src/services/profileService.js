const prisma = require('../config/prismaClient');
const { calculateGoals } = require('./calculationService');
const { invalidateCoachCache } = require('./coachSnapshotService');

function normalizeTargetWeight(value) {
  if (value === undefined || value === null || value === '') return null;
  return Number(value);
}

async function getProfile(userId) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) return null;

  const latestGoal = await prisma.goalSnapshot.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return { profile, targets: latestGoal };
}

function pickProfileData(profileData) {
  const { name, age, gender, heightCm, weightKg, targetWeightKg, activityLevel, goal } = profileData;
  return {
    name,
    age,
    gender,
    heightCm,
    weightKg,
    targetWeightKg: normalizeTargetWeight(targetWeightKg),
    activityLevel,
    goal,
  };
}

function goalSnapshotData(userId, profile, targets) {
  return {
    userId,
    targetCalories: targets.targetCalories,
    targetProtein: targets.targetProtein,
    targetCarbs: targets.targetCarbs,
    targetFat: targets.targetFat,
    targetWeightKg: profile.targetWeightKg,
  };
}

async function createProfile(userId, profileData) {
  const safeData = pickProfileData(profileData);
  const existing = await prisma.profile.findUnique({ where: { userId } });

  if (existing) {
    const error = new Error('Le profil existe deja. Utilisez updateProfile.');
    error.statusCode = 400;
    throw error;
  }

  const result = await prisma.$transaction(async (tx) => {
    const profile = await tx.profile.create({
      data: { ...safeData, userId },
    });
    const targets = calculateGoals(profile);
    const goalSnapshot = await tx.goalSnapshot.create({
      data: goalSnapshotData(userId, profile, targets),
    });

    return { profile, targets: goalSnapshot };
  });
  await invalidateCoachCache(userId);
  return result;
}

async function updateProfile(userId, profileData) {
  const safeData = pickProfileData(profileData);
  const existing = await prisma.profile.findUnique({ where: { userId } });

  if (!existing) {
    return createProfile(userId, safeData);
  }

  const result = await prisma.$transaction(async (tx) => {
    const profile = await tx.profile.update({
      where: { userId },
      data: safeData,
    });
    const targets = calculateGoals(profile);
    const goalSnapshot = await tx.goalSnapshot.create({
      data: goalSnapshotData(userId, profile, targets),
    });

    return { profile, targets: goalSnapshot };
  });
  await invalidateCoachCache(userId);
  return result;
}

module.exports = {
  getProfile,
  createProfile,
  updateProfile,
};
