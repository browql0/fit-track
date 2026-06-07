// ══════════════════════════════════════════════════════════════
// FitTrack — Service des Entraînements (Workouts)
// ══════════════════════════════════════════════════════════════

const prisma = require('../config/prismaClient');
const { calculateCaloriesBurned } = require('./calculationService');
const { parseDateOnly } = require('../utils/dateUtils');
const { invalidateCoachCache } = require('./coachSnapshotService');

/**
 * Récupère le profil de l'utilisateur pour obtenir son poids.
 */
async function getUserWeight(userId) {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { weightKg: true },
  });
  if (!profile) {
    throw createError('Profil non trouvé. Impossible d\'estimer les calories sans le poids.', 400);
  }
  return profile.weightKg;
}

/**
 * Récupère les séances d'entraînement d'une date donnée.
 * Les calories sont calculées dynamiquement.
 */
async function getWorkoutsByDate(userId, dateStr) {
  const targetDate = parseDateOnly(dateStr, 'date');
  const workouts = await prisma.workout.findMany({
    where: {
      userId,
      workoutDate: targetDate,
    },
    include: {
      exercise: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (workouts.length === 0) {
    return [];
  }

  const weightKg = await getUserWeight(userId);

  return workouts.map(workout => ({
    ...workout,
    caloriesBurned: calculateCaloriesBurned(workout.exercise.metValue, weightKg, workout.durationMinutes),
  }));
}

/**
 * Ajoute une séance d'entraînement.
 */
async function addWorkout(userId, data) {
  // Vérifier si l'exercice existe
  const exercise = await prisma.exercise.findUnique({
    where: { id: data.exerciseId },
  });
  if (!exercise) throw createError('Exercice non trouvé', 404);

  const workout = await prisma.workout.create({
    data: {
      userId,
      exerciseId: data.exerciseId,
      durationMinutes: data.durationMinutes,
      notes: data.notes,
      workoutDate: parseDateOnly(data.workoutDate, 'workoutDate'),
    },
    include: {
      exercise: true,
    },
  });

  const weightKg = await getUserWeight(userId);
  await invalidateCoachCache(userId);
  return {
    ...workout,
    caloriesBurned: calculateCaloriesBurned(exercise.metValue, weightKg, workout.durationMinutes),
  };
}

/**
 * Modifie une séance.
 */
async function updateWorkout(userId, workoutId, data) {
  const existing = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: { exercise: true },
  });
  if (!existing || existing.userId !== userId) {
    throw createError('Séance non trouvée ou non autorisée', 404);
  }

  // Si on change d'exercice, il faut le vérifier
  let newExercise = existing.exercise;
  if (data.exerciseId !== undefined && data.exerciseId !== existing.exerciseId) {
    newExercise = await prisma.exercise.findUnique({ where: { id: data.exerciseId } });
    if (!newExercise) throw createError('Nouvel exercice non trouvé', 404);
  }

  const updated = await prisma.workout.update({
    where: { id: workoutId },
    data: {
      exerciseId: data.exerciseId !== undefined ? data.exerciseId : existing.exerciseId,
      durationMinutes: data.durationMinutes !== undefined ? data.durationMinutes : existing.durationMinutes,
      notes: data.notes !== undefined ? data.notes : existing.notes,
    },
    include: {
      exercise: true,
    },
  });

  const weightKg = await getUserWeight(userId);
  await invalidateCoachCache(userId);
  return {
    ...updated,
    caloriesBurned: calculateCaloriesBurned(updated.exercise.metValue, weightKg, updated.durationMinutes),
  };
}

/**
 * Supprime une séance.
 */
async function deleteWorkout(userId, workoutId) {
  const existing = await prisma.workout.findUnique({ where: { id: workoutId } });
  if (!existing || existing.userId !== userId) {
    throw createError('Séance non trouvée ou non autorisée', 404);
  }

  await prisma.workout.delete({ where: { id: workoutId } });
  await invalidateCoachCache(userId);
  return { success: true };
}

/**
 * Résumé hebdomadaire des entraînements.
 */
async function getWeeklySummary(userId) {
  // 7 derniers jours (depuis le début de la journée)
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  lastWeek.setHours(0, 0, 0, 0);

  const workouts = await prisma.workout.findMany({
    where: {
      userId,
      workoutDate: {
        gte: lastWeek,
        lte: today,
      },
    },
    include: { exercise: true },
  });

  if (workouts.length === 0) {
    return {
      totalWorkouts: 0,
      totalDurationMinutes: 0,
      totalCaloriesBurned: 0,
    };
  }

  const weightKg = await getUserWeight(userId);

  const summary = {
    totalWorkouts: workouts.length,
    totalDurationMinutes: 0,
    totalCaloriesBurned: 0,
  };

  workouts.forEach(w => {
    summary.totalDurationMinutes += w.durationMinutes;
    summary.totalCaloriesBurned += calculateCaloriesBurned(w.exercise.metValue, weightKg, w.durationMinutes);
  });

  return summary;
}

// ─── Utilitaire d'erreur ───
function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

module.exports = {
  getWorkoutsByDate,
  addWorkout,
  updateWorkout,
  deleteWorkout,
  getWeeklySummary,
};
