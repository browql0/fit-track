const prisma = require('../config/prismaClient');
const { analyzeNutrition } = require('./nutritionCoach');
const { analyzeTraining } = require('./trainingCoach');
const { analyzeProgress, buildPredictions } = require('./progressCoach');
const { computeFitTrackScore } = require('./scoreEngine');
const { calculateStreaks, generateMissions } = require('./missionGenerator');
const { buildDateWindow, groupByDate, toDateKey } = require('./coachUtils');
const { getFreshCoachSnapshot, saveCoachSnapshot } = require('../services/coachSnapshotService');

async function getCoachContext(userId) {
  const window = buildDateWindow(30);
  const tomorrow = new Date(window.end);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const weightWindow = buildDateWindow(90);

  const [profile, targets, foodEntries, workouts, weightEntries, measurements, hydrationEntries, userActivities, missionCompletions] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.goalSnapshot.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.foodEntry.findMany({
      where: { userId, entryDate: { gte: window.start, lt: tomorrow } },
      include: { food: true },
      orderBy: { entryDate: 'asc' },
    }),
    prisma.workout.findMany({
      where: { userId, workoutDate: { gte: window.start, lt: tomorrow } },
      include: { exercise: true },
      orderBy: { workoutDate: 'asc' },
    }),
    prisma.weightEntry.findMany({
      where: { userId, entryDate: { gte: weightWindow.start, lt: tomorrow } },
      orderBy: { entryDate: 'asc' },
    }),
    prisma.bodyMeasurement.findMany({
      where: { userId, measurementDate: { gte: weightWindow.start, lt: tomorrow } },
      orderBy: { measurementDate: 'asc' },
    }),
    prisma.hydrationEntry.findMany({
      where: { userId, entryDate: { gte: window.start, lt: tomorrow } },
      orderBy: { entryDate: 'asc' },
    }),
    prisma.userActivity.findMany({
      where: { userId, activityDate: { gte: window.start, lt: tomorrow } },
      orderBy: { activityDate: 'asc' },
    }),
    prisma.missionCompletion.findMany({
      where: { userId, missionDate: { gte: window.start, lt: tomorrow } },
      orderBy: { missionDate: 'asc' },
    }),
  ]);

  if (!profile || !targets) {
    const error = new Error('Profil ou objectifs introuvables. Complete le setup FitTrack avant d utiliser le coach.');
    error.statusCode = 404;
    throw error;
  }

  return {
    userId,
    generatedAt: new Date().toISOString(),
    window: { days: 30, start: window.startKey, end: window.endKey },
    profile,
    targets,
    foodEntries,
    foodEntriesByDate: groupByDate(foodEntries, 'entryDate'),
    workouts,
    workoutsByDate: groupByDate(workouts, 'workoutDate'),
    weightEntries,
    measurements,
    hydrationEntries,
    hydrationEntriesByDate: groupByDate(hydrationEntries, 'entryDate'),
    userActivities,
    userActivitiesByDate: groupByDate(userActivities, 'activityDate'),
    missionCompletions,
  };
}

function rankInsights(insights) {
  return insights
    .filter(Boolean)
    .sort((a, b) => (a.priority - b.priority) || String(a.id).localeCompare(String(b.id)))
    .slice(0, 8);
}

function buildCoachSummary(context, scoreResult, missions, insights, predictions) {
  const firstName = context.profile.name?.split(' ')[0] || 'Athlete';
  const alerts = insights.filter((insight) => insight.tone === 'warning');
  const positives = insights.filter((insight) => insight.tone === 'positive');
  let mainMessage = `${firstName}, ton FitTrack Score est a ${scoreResult.score}. `;

  if (alerts.length > 0 && alerts[0].priority === 1) {
    mainMessage += `${alerts[0].message} ${alerts[0].action}`;
  } else if (predictions.length > 0) {
    mainMessage += predictions[0].message;
  } else if (positives.length > 0) {
    mainMessage += positives[0].message;
  } else {
    mainMessage += 'La priorite est de creer plus de donnees exploitables aujourd hui.';
  }

  return {
    title: 'Coach FitTrack',
    message: mainMessage,
    generatedFor: firstName,
    date: toDateKey(new Date()),
    primaryAdvice: insights[0] || null,
    primaryPrediction: predictions[0] || null,
    todayMission: missions.find((mission) => !mission.done) || missions[0] || null,
    hasPredictions: predictions.length > 0,
    hasAlerts: alerts.length > 0,
  };
}

function buildPremiumReports(context, scoreResult, missions, insights, predictions, analyses) {
  const warnings = insights.filter((insight) => insight.tone === 'warning');
  const mainMission = missions.find((mission) => !mission.done) || missions[0] || null;
  const { nutrition, training, progress } = analyses;
  const trend = progress.trend14 || progress.trend30 || progress.trend;

  return {
    dailySummary: {
      score: scoreResult.score,
      message: `Aujourd'hui: ${nutrition.today.calories} kcal, ${nutrition.today.protein} g proteines, ${training.todayDurationMinutes} min d'activite.`,
      mainAdvice: insights[0] || null,
      mission: mainMission,
    },
    weeklySummary: {
      message: `Sur 7 jours: ${nutrition.averages.calories} kcal/j, ${nutrition.averages.protein} g proteines/j, ${training.trainingDays} jours actifs.`,
      nutritionAverage: nutrition.averages,
      trainingDays: training.trainingDays,
      trend7: progress.trend7,
    },
    monthlySummary: {
      message: trend
        ? `Tendance principale: ${trend.weeklyRate} kg/semaine calculee sur ${trend.days} jours.`
        : 'Pas assez de pesees pour une synthese mensuelle fiable.',
      trend30: progress.trend30,
      trend90: progress.trend90,
      measurements: progress.measurementTrend,
    },
    progressionAnalysis: {
      status: progress.status,
      trend7: progress.trend7,
      trend14: progress.trend14,
      trend30: progress.trend30,
      trend90: progress.trend90,
      measurementTrend: progress.measurementTrend,
    },
    currentPriorities: missions.map((mission) => ({
      id: mission.id,
      title: mission.title,
      detail: mission.detail,
      progress: mission.progress,
      route: mission.route,
    })),
    importantAlerts: warnings.map((warning) => ({
      id: warning.id,
      title: warning.title,
      message: warning.message,
      action: warning.action,
      metric: warning.metric,
    })),
    primaryPrediction: predictions[0] || null,
    dashboardWidget: {
      score: scoreResult.score,
      missionOfTheDay: mainMission,
      mainAdvice: insights[0] || null,
      mainPrediction: predictions[0] || null,
    },
  };
}

async function getCoachReport(userId, options = {}) {
  const useCache = options.useCache !== false;
  if (useCache) {
    const cached = await getFreshCoachSnapshot(userId);
    if (cached) return cached;
  }

  const startedAt = Date.now();
  const context = await getCoachContext(userId);
  const nutrition = analyzeNutrition(context);
  const training = analyzeTraining(context);
  const progress = analyzeProgress(context);
  const scoreResult = computeFitTrackScore(context, { nutrition, training, progress });
  const missions = generateMissions(context, nutrition, training, progress);
  const streaks = calculateStreaks(context);
  const insights = rankInsights([...nutrition.insights, ...training.insights, ...progress.insights]);
  const predictions = buildPredictions(context, progress, nutrition);
  const summary = buildCoachSummary(context, scoreResult, missions, insights, predictions);
  const premium = buildPremiumReports(context, scoreResult, missions, insights, predictions, { nutrition, training, progress });

  const report = {
    score: scoreResult.score,
    nutrition: scoreResult.nutrition,
    training: scoreResult.training,
    progression: scoreResult.progression,
    consistency: scoreResult.consistency,
    streaks,
    breakdown: scoreResult.breakdown,
    formula: scoreResult.formula,
    reasons: scoreResult.reasons,
    summary,
    premium,
    missions,
    insights,
    predictions,
    analyses: {
      nutrition: {
        today: nutrition.today,
        averages: nutrition.averages,
        breakdown: nutrition.breakdown,
      },
      training: {
        trainingDays: training.trainingDays,
        targetSessions: training.targetSessions,
        totalWorkouts: training.totalWorkouts,
        todayDurationMinutes: training.todayDurationMinutes,
        totalDurationMinutes: training.totalDurationMinutes,
        totalCaloriesBurned: training.totalCaloriesBurned,
      },
      progress: {
        status: progress.status,
        trend: progress.trend,
        trend7: progress.trend7,
        trend14: progress.trend14,
        trend30: progress.trend30,
        trend90: progress.trend90,
        trends: progress.trends,
        measurementTrend: progress.measurementTrend,
        checkIns: progress.checkIns,
      },
    },
    meta: {
      generatedAt: context.generatedAt,
      window: context.window,
      source: 'premium-coach-v3',
      cache: {
        hit: false,
        recomputeMs: Date.now() - startedAt,
      },
    },
  };

  await saveCoachSnapshot(userId, report);
  return report;
}

module.exports = { getCoachReport };
