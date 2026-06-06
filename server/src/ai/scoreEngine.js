const { clamp } = require('./coachUtils');

function computeConsistency(context, nutritionAnalysis, trainingAnalysis, progressAnalysis) {
  const nutritionDays = Object.keys(context.foodEntriesByDate || {}).length;
  const trainingDays = trainingAnalysis.trainingDays || 0;
  const checkIns = progressAnalysis.checkIns || 0;
  const expectedTrainingDays = Math.max(trainingAnalysis.targetSessions || 3, 1) * Math.max(1, Math.round(context.window.days / 7));
  const expectedCheckIns = Math.max(4, Math.round(context.window.days / 7));

  const nutritionScore = clamp(Math.round((nutritionDays / Math.max(context.window.days, 1)) * 100));
  const trainingScore = clamp(Math.round((trainingDays / expectedTrainingDays) * 100));
  const trackingScore = clamp(Math.round((checkIns / expectedCheckIns) * 100));

  return {
    score: Math.round((nutritionScore * 0.44) + (trainingScore * 0.34) + (trackingScore * 0.22)),
    parts: {
      nutritionLogging: nutritionScore,
      trainingAttendance: trainingScore,
      progressCheckIns: trackingScore,
      nutritionDays,
      trainingDays,
      checkIns,
      expectedTrainingDays,
      expectedCheckIns,
    },
  };
}

function buildReason(label, value, weight, detail) {
  return `${label}: ${value}/100 x ${weight}% = ${Math.round(value * weight / 100)} pts. ${detail}`;
}

function computeFitTrackScore(context, analyses) {
  const { nutrition, training, progress } = analyses;
  const consistency = computeConsistency(context, nutrition, training, progress);

  const nutritionPts = nutrition.score * 0.40;
  const trainingPts = training.score * 0.25;
  const progressPts = progress.score * 0.20;
  const consistencyPts = consistency.score * 0.15;
  const score = Math.round(nutritionPts + trainingPts + progressPts + consistencyPts);

  const reasons = [
    buildReason(
      'Nutrition',
      clamp(nutrition.score),
      40,
      `Calories ${nutrition.breakdown.calories}/100, proteines ${nutrition.breakdown.protein}/100.`
    ),
    buildReason(
      'Training',
      clamp(training.score),
      25,
      `${training.trainingDays} jours actifs sur ${consistency.parts.expectedTrainingDays} attendus dans la fenetre.`
    ),
    buildReason(
      'Progression',
      clamp(progress.score),
      20,
      progress.trend ? `Tendance ${progress.trend.weeklyRate} kg/semaine sur ${progress.trend.days} jours.` : 'Pas assez de pesees pour une tendance fiable.'
    ),
    buildReason(
      'Consistency',
      clamp(consistency.score),
      15,
      `${consistency.parts.nutritionDays} jours nutrition, ${consistency.parts.checkIns} pesees.`
    ),
  ];

  return {
    score: clamp(score),
    nutrition: clamp(nutrition.score),
    training: clamp(training.score),
    progression: clamp(progress.score),
    consistency: clamp(consistency.score),
    breakdown: {
      nutrition: clamp(nutrition.score),
      training: clamp(training.score),
      progress: clamp(progress.score),
      progression: clamp(progress.score),
      consistency: clamp(consistency.score),
    },
    reasons,
    formula: {
      nutrition: { score: clamp(nutrition.score), weight: 40, points: Math.round(nutritionPts) },
      training: { score: clamp(training.score), weight: 25, points: Math.round(trainingPts) },
      progression: { score: clamp(progress.score), weight: 20, points: Math.round(progressPts) },
      consistency: { score: clamp(consistency.score), weight: 15, points: Math.round(consistencyPts) },
    },
  };
}

module.exports = { computeFitTrackScore };
