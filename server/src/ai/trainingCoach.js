const { groupByDate, makeInsight, round, scoreRange, sum, todayKey } = require('./coachUtils');
const { calculateCaloriesBurned } = require('../services/calculationService');

function analyzeTraining(context) {
  const { workouts, profile } = context;
  const byDate = groupByDate(workouts, 'workoutDate');
  const trainingDays = Object.keys(byDate).length;
  const todayWorkouts = byDate[todayKey()] || [];
  const todayDuration = sum(todayWorkouts.map((workout) => workout.durationMinutes));
  const weightKg = profile?.weightKg || 75;
  const enriched = workouts.map((workout) => ({
    ...workout,
    caloriesBurned: calculateCaloriesBurned(workout.exercise?.metValue || 4, weightKg, workout.durationMinutes),
  }));
  const totalDuration = sum(enriched.map((workout) => workout.durationMinutes));
  const totalCalories = sum(enriched.map((workout) => workout.caloriesBurned));
  const averageDuration = workouts.length ? totalDuration / workouts.length : 0;

  const targetSessions = profile?.activityLevel === 'active' || profile?.activityLevel === 'very_active' ? 4 : 3;
  // Calculate frequency score based on the actual window days (we scale targetSessions to the window)
  const windowWeeks = Math.max(1, Math.round(context.window.days / 7));
  const expectedSessions = targetSessions * windowWeeks;
  
  const frequencyScore = scoreRange(trainingDays / expectedSessions, 0.9, 1.4, 0, 2.0);
  const durationScore = scoreRange(totalDuration / (expectedSessions * 45), 0.8, 1.5, 0, 2.2);
  const score = Math.round((frequencyScore * 0.60) + (durationScore * 0.40));

  const insights = [];
  
  // Analyse sur les 7 derniers jours spécifiquement pour les alertes court-terme
  const last7Days = new Date();
  last7Days.setUTCDate(last7Days.getUTCDate() - 7);
  const recentWorkouts = workouts.filter(w => new Date(w.workoutDate) >= last7Days);
  const recentTrainingDays = new Set(recentWorkouts.map(w => w.workoutDate.toISOString().slice(0,10))).size;

  if (recentTrainingDays === 0) {
    insights.push(makeInsight({
      id: 'training-inactive',
      category: 'training',
      priority: 1,
      tone: 'warning',
      title: 'Baisse d\'activité',
      message: 'Aucun entraînement sur les 7 derniers jours.',
      action: 'Pas besoin de rattraper. Reprends juste ta routine avec une session légère de 20 minutes.',
    }));
  } else if (recentTrainingDays >= 6) {
    insights.push(makeInsight({
      id: 'training-overtraining',
      category: 'training',
      priority: 1,
      tone: 'warning',
      title: 'Risque de surentraînement',
      message: `Tu t'es entraîné ${recentTrainingDays} jours sur les 7 derniers.`,
      action: 'Ton corps se construit pendant le repos. Prends au moins 1 à 2 jours off complets.',
      metric: { current: recentTrainingDays, target: targetSessions, unit: 'sessions' },
    }));
  } else if (recentTrainingDays < targetSessions - 1) {
    insights.push(makeInsight({
      id: 'training-missed-sessions',
      category: 'training',
      priority: 2,
      tone: 'warning',
      title: 'Fréquence en baisse',
      message: `Seulement ${recentTrainingDays} sessions sur les 7 derniers jours (cible: ${targetSessions}).`,
      action: 'Si tu manques de temps, privilégie des sessions intenses (HIIT) de 15 minutes.',
      metric: { current: recentTrainingDays, target: targetSessions, unit: 'sessions' },
    }));
  }

  if (recentWorkouts.length > 0) {
    const recentAvgDuration = sum(recentWorkouts.map(w => w.durationMinutes)) / recentWorkouts.length;
    if (recentAvgDuration < 20) {
      insights.push(makeInsight({
        id: 'training-short-volume',
        category: 'training',
        priority: 2,
        tone: 'info',
        title: 'Volume court',
        message: 'Tes sessions récentes durent moins de 20 minutes en moyenne.',
        action: 'Si l\'intensité est maximale (ex: Sprint), c\'est ok. Sinon, essaie d\'ajouter 10 minutes d\'échauffement actif.',
        metric: { current: round(recentAvgDuration), target: 40, unit: 'min' },
      }));
    }
  }

  return {
    score,
    targetSessions,
    trainingDays,
    totalWorkouts: workouts.length,
    totalDurationMinutes: Math.round(totalDuration),
    totalCaloriesBurned: Math.round(totalCalories),
    averageDurationMinutes: Math.round(averageDuration),
    todayDurationMinutes: Math.round(todayDuration),
    insights,
  };
}

module.exports = { analyzeTraining };
