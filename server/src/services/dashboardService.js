const prisma = require('../config/prismaClient');
const coachEngine = require('../ai/coachEngine');
const { calculateCaloriesBurned } = require('./calculationService');
const { macroTotals, toDateKey } = require('../ai/coachUtils');

function startOfUtcDay(date = new Date()) {
  return new Date(`${toDateKey(date)}T00:00:00.000Z`);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function roundNutrition(totals) {
  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
  };
}

function enrichWorkouts(workouts, weightKg) {
  return workouts.map((workout) => ({
    ...workout,
    caloriesBurned: calculateCaloriesBurned(workout.exercise?.metValue || 4, weightKg || 75, workout.durationMinutes),
  }));
}

function summarizeWorkouts(workouts) {
  return workouts.reduce((summary, workout) => {
    summary.totalWorkouts += 1;
    summary.totalDurationMinutes += Number(workout.durationMinutes || 0);
    summary.totalCaloriesBurned += Number(workout.caloriesBurned || 0);
    return summary;
  }, { totalWorkouts: 0, totalDurationMinutes: 0, totalCaloriesBurned: 0 });
}

function buildWeightTrend(entries) {
  const sortedAsc = [...entries].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
  const first = sortedAsc[0] || null;
  const last = sortedAsc[sortedAsc.length - 1] || null;

  return {
    entries: [...entries].sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate)),
    points: sortedAsc.map((entry) => ({
      date: toDateKey(entry.entryDate),
      weight: Number(entry.weightKg),
    })),
    changeKg: first && last ? Math.round((Number(last.weightKg) - Number(first.weightKg)) * 10) / 10 : 0,
  };
}

async function getDashboard(userId) {
  const startedAt = Date.now();
  const today = startOfUtcDay();
  const tomorrow = addDays(today, 1);
  const weekStart = addDays(today, -6);
  const trendStart = addDays(today, -29);

  const [
    profile,
    targets,
    foodToday,
    workoutsWeekRaw,
    latestWeight,
    weightTrendEntries,
    hydrationToday,
    coach,
  ] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.goalSnapshot.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.foodEntry.findMany({
      where: { userId, entryDate: { gte: today, lt: tomorrow } },
      include: { food: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.workout.findMany({
      where: { userId, workoutDate: { gte: weekStart, lt: tomorrow } },
      include: { exercise: true },
      orderBy: { workoutDate: 'asc' },
    }),
    prisma.weightEntry.findFirst({
      where: { userId },
      orderBy: { entryDate: 'desc' },
    }),
    prisma.weightEntry.findMany({
      where: { userId, entryDate: { gte: trendStart, lt: tomorrow } },
      orderBy: { entryDate: 'desc' },
    }),
    prisma.hydrationEntry.findMany({
      where: { userId, entryDate: { gte: today, lt: tomorrow } },
      orderBy: { createdAt: 'asc' },
    }),
    coachEngine.getCoachReport(userId),
  ]);

  if (!profile || !targets) {
    const error = new Error('Profil ou objectifs introuvables.');
    error.statusCode = 404;
    throw error;
  }

  const workoutsWeek = enrichWorkouts(workoutsWeekRaw, profile.weightKg);
  const workoutsToday = workoutsWeek.filter((workout) => toDateKey(workout.workoutDate) === toDateKey(today));
  const nutritionToday = roundNutrition(macroTotals(foodToday));
  const hydrationTotalMl = hydrationToday.reduce((sum, entry) => sum + Number(entry.amountMl || 0), 0);

  return {
    profile,
    targets,
    goalSnapshot: targets,
    coachSummary: coach.summary,
    coach,
    missions: coach.missions || [],
    nutritionToday,
    summary: nutritionToday,
    workoutsToday,
    workouts: workoutsToday,
    workoutsWeekSummary: summarizeWorkouts(workoutsWeek),
    latestWeight,
    weightTrend: buildWeightTrend(weightTrendEntries),
    weights: weightTrendEntries,
    hydrationToday: {
      totalMl: hydrationTotalMl,
      entriesCount: hydrationToday.length,
      targetMl: 2500,
      progress: Math.min(140, Math.round((hydrationTotalMl / 2500) * 100)),
    },
    meta: {
      generatedAt: new Date().toISOString(),
      responseMs: Date.now() - startedAt,
      coachCache: coach.meta?.cache || null,
      requestCount: {
        frontend: 1,
        backendPrimaryQueries: 8,
      },
    },
  };
}

module.exports = {
  getDashboard,
};
