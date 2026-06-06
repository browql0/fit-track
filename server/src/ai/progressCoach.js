const { average, daysBetween, makeInsight, round, scoreRange } = require('./coachUtils');

const WEIGHT_WINDOWS = [7, 14, 30, 90];

function entriesInWindow(entries, dateField, days) {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1));
  return [...entries]
    .filter((entry) => new Date(entry[dateField]) >= cutoff)
    .sort((a, b) => new Date(a[dateField]) - new Date(b[dateField]));
}

function getWeightTrend(weightEntries, days) {
  const entries = entriesInWindow(weightEntries, 'entryDate', days);
  if (entries.length < 2) return null;

  const first = entries[0];
  const last = entries[entries.length - 1];
  const actualDays = daysBetween(first.entryDate, last.entryDate);
  const totalChange = Number(last.weightKg) - Number(first.weightKg);
  const weeklyRate = actualDays ? (totalChange / actualDays) * 7 : 0;
  const weights = entries.map((entry) => Number(entry.weightKg));

  return {
    windowDays: days,
    startWeight: Number(first.weightKg),
    currentWeight: Number(last.weightKg),
    averageWeight: round(average(weights), 1),
    totalChange: round(totalChange, 1),
    weeklyRate: round(weeklyRate, 2),
    days: actualDays,
    entriesCount: entries.length,
  };
}

function getMeasurementTrends(measurements, days = 90) {
  const entries = entriesInWindow(measurements, 'measurementDate', days);
  const fields = ['waistCm', 'chestCm', 'armCm', 'thighCm', 'neckCm'];

  return fields.reduce((trends, field) => {
    const fieldEntries = entries.filter((entry) => entry[field] != null);
    if (fieldEntries.length < 2) return trends;

    const first = fieldEntries[0];
    const last = fieldEntries[fieldEntries.length - 1];
    trends[field] = {
      change: round(Number(last[field]) - Number(first[field]), 1),
      current: Number(last[field]),
      entriesCount: fieldEntries.length,
      days: daysBetween(first.measurementDate, last.measurementDate),
    };
    return trends;
  }, {});
}

function classifyTrend(goal, trend) {
  if (!trend) return 'insufficient_data';
  const rate = trend.weeklyRate;

  if (goal === 'fat_loss' || goal === 'weight_loss') {
    if (Math.abs(rate) <= 0.1) return 'stagnation';
    if (rate < -1) return 'deficit_too_aggressive';
    if (rate < -0.25) return 'progression';
    if (rate > 0.25) return 'regression';
    return 'slow_progression';
  }

  if (goal === 'muscle_gain' || goal === 'bulking') {
    if (rate < -0.1) return 'regression';
    if (rate > 0.6) return 'surplus_too_large';
    if (rate >= 0.1 && rate <= 0.35) return 'progression';
    if (Math.abs(rate) <= 0.1) return 'stagnation';
    return 'slow_progression';
  }

  if (Math.abs(rate) <= 0.2) return 'progression';
  return 'regression';
}

function buildProgressScore(goal, trend) {
  if (!trend) return 42;
  if (goal === 'fat_loss' || goal === 'weight_loss') {
    return scoreRange(Math.abs(trend.weeklyRate), 0.25, 0.8, 0, 1.45);
  }
  if (goal === 'muscle_gain' || goal === 'bulking') {
    return scoreRange(trend.weeklyRate, 0.1, 0.35, -0.2, 0.8);
  }
  return scoreRange(Math.abs(trend.weeklyRate), 0, 0.2, 0, 0.8);
}

function analyzeProgress(context) {
  const { weightEntries, measurements, profile } = context;
  const goal = profile?.goal || 'maintenance';
  const trends = WEIGHT_WINDOWS.reduce((map, days) => {
    map[days] = getWeightTrend(weightEntries, days);
    return map;
  }, {});
  const trend = trends[30] || trends[14] || trends[7] || trends[90];
  const measurementTrend = getMeasurementTrends(measurements, 90);
  const status = classifyTrend(goal, trends[14] || trend);
  const insights = [];
  let score = buildProgressScore(goal, trend);

  if (status === 'stagnation' && (goal === 'fat_loss' || goal === 'weight_loss')) {
    insights.push(makeInsight({
      id: 'progress-stagnation',
      category: 'progress',
      priority: 1,
      tone: 'warning',
      title: 'Stagnation detectee',
      message: `Ton poids varie de moins de 0.1 kg/semaine sur ${trends[14]?.days || 14} jours.`,
      action: 'Compare tes 7 derniers jours de calories avec ta cible et pese les aliments denses pendant 3 jours.',
      metric: { current: trends[14]?.weeklyRate || trend?.weeklyRate || 0, target: -0.35, unit: 'kg/sem' },
    }));
  }

  if (status === 'deficit_too_aggressive') {
    insights.push(makeInsight({
      id: 'progress-loss-too-fast',
      category: 'progress',
      priority: 1,
      tone: 'warning',
      title: 'Deficit trop agressif',
      message: `Tu perds environ ${Math.abs(trend.weeklyRate)} kg/semaine.`,
      action: 'Remonte les calories de 150 a 250 kcal/jour et garde les proteines hautes pour proteger la masse musculaire.',
      metric: { current: trend.weeklyRate, target: -0.6, unit: 'kg/sem' },
    }));
  }

  if (status === 'surplus_too_large') {
    insights.push(makeInsight({
      id: 'progress-bulking-too-fast',
      category: 'progress',
      priority: 1,
      tone: 'warning',
      title: 'Surplus trop important',
      message: `Tu prends ${trend.weeklyRate} kg/semaine, au-dessus d'un rythme propre de prise de muscle.`,
      action: 'Reduis ton objectif de 100 a 150 kcal/jour et garde le meme volume training pendant 14 jours.',
      metric: { current: trend.weeklyRate, target: 0.25, unit: 'kg/sem' },
    }));
  }

  if (status === 'progression') {
    insights.push(makeInsight({
      id: 'progress-on-track',
      category: 'progress',
      priority: 2,
      tone: 'positive',
      title: 'Trajectoire coherente',
      message: `Ta tendance est de ${trend.weeklyRate} kg/semaine sur ${trend.days} jours.`,
      action: 'Ne change rien cette semaine: meme calories, meme frequence training, puis reevaluation dans 7 jours.',
      metric: { current: trend.weeklyRate, unit: 'kg/sem' },
    }));
  }

  const waist = measurementTrend.waistCm;
  const arm = measurementTrend.armCm;
  if (waist && waist.change < -1 && (!trend || Math.abs(trend.weeklyRate) < 0.25)) {
    insights.push(makeInsight({
      id: 'progress-waist-down-weight-stable',
      category: 'measurements',
      priority: 2,
      tone: 'positive',
      title: 'Recomposition corporelle',
      message: `Ton tour de taille baisse de ${Math.abs(waist.change)} cm alors que le poids bouge peu.`,
      action: 'Cible 2 a 3 pesees/semaine et une mensuration taille pour confirmer la recomposition.',
      metric: { current: waist.change, unit: 'cm' },
    }));
  }

  if (arm && arm.change < -0.7 && (goal === 'fat_loss' || goal === 'weight_loss')) {
    insights.push(makeInsight({
      id: 'progress-arm-down-warning',
      category: 'measurements',
      priority: 1,
      tone: 'warning',
      title: 'Signal musculaire a surveiller',
      message: `Ton tour de bras a baisse de ${Math.abs(arm.change)} cm sur les dernieres mesures.`,
      action: 'Priorite: proteines a 100% aujourd hui et au moins 2 seances resistance cette semaine.',
      metric: { current: arm.change, unit: 'cm' },
    }));
  }

  if (!weightEntries.length) {
    insights.push(makeInsight({
      id: 'progress-no-checkin',
      category: 'progress',
      priority: 2,
      tone: 'info',
      title: 'Donnees insuffisantes',
      message: 'Aucune pesee recente ne permet de calculer une tendance fiable.',
      action: 'Enregistre ton poids 2 a 3 fois par semaine, le matin, dans les memes conditions.',
    }));
  }

  return {
    score,
    status,
    trend,
    trends,
    trend7: trends[7],
    trend14: trends[14],
    trend30: trends[30],
    trend90: trends[90],
    measurementTrend,
    checkIns: weightEntries.length,
    insights,
  };
}

function buildPredictions(context, progressAnalysis, nutritionAnalysis) {
  const predictions = [];
  const trend = progressAnalysis.trend14 || progressAnalysis.trend30 || progressAnalysis.trend;
  const goal = context.profile?.goal;
  const targetProtein = context.targets?.targetProtein || 0;
  const proteinToday = nutritionAnalysis.today?.protein || 0;

  if (trend && Math.abs(trend.weeklyRate) >= 0.1) {
    const monthlyChange = trend.weeklyRate * 4.345;
    const direction = monthlyChange < 0 ? 'perdras' : 'prendras';
    predictions.push({
      id: 'monthly-weight-projection',
      category: 'weight',
      confidence: trend.days >= 14 && trend.entriesCount >= 4 ? 'high' : 'medium',
      message: `A ce rythme, tu ${direction} environ ${Math.abs(round(monthlyChange, 1))} kg sur 30 jours.`,
      formula: `${trend.weeklyRate} kg/semaine x 4.345 semaines = ${round(monthlyChange, 1)} kg/mois`,
      metric: { weeklyRate: trend.weeklyRate, monthlyChange: round(monthlyChange, 1), unit: 'kg' },
    });
  }

  if (trend && (goal === 'fat_loss' || goal === 'weight_loss') && trend.weeklyRate < -0.1) {
    const explicitTargetWeight = context.targets?.targetWeightKg;
    const targetWeight = explicitTargetWeight || context.profile.weightKg * 0.92;
    const kgToLose = Math.max(0, trend.currentWeight - targetWeight);
    const weeks = Math.ceil(kgToLose / Math.abs(trend.weeklyRate));
    if (weeks > 0 && weeks < 52) {
      predictions.push({
        id: 'target-weight-eta',
        category: 'weight',
        confidence: trend.days >= 14 ? 'medium' : 'low',
        message: `Au rythme actuel tu atteindras ${round(targetWeight, 1)} kg dans ${weeks} semaines.`,
        formula: `${round(kgToLose, 1)} kg restants / ${Math.abs(trend.weeklyRate)} kg par semaine = ${weeks} semaines`,
        metric: { targetWeight: round(targetWeight, 1), kgToLose: round(kgToLose, 1), weeks },
      });
    }
  }

  const proteinMissing = Math.max(0, targetProtein - proteinToday);
  if (proteinMissing > 0 && proteinMissing < 80) {
    const avgProteinMeal = nutritionAnalysis.averages?.proteinPerMeal || 25;
    const mealsNeeded = Math.max(1, Math.ceil(proteinMissing / avgProteinMeal));
    predictions.push({
      id: 'protein-today-eta',
      category: 'nutrition',
      confidence: 'high',
      message: `Il te manque ${Math.round(proteinMissing)} g de proteines: environ ${mealsNeeded} repas/snack riche en proteines.`,
      formula: `${Math.round(proteinMissing)} g restants / ${Math.round(avgProteinMeal)} g moyens par prise = ${mealsNeeded}`,
      metric: { remainingProtein: Math.round(proteinMissing), mealsNeeded, unit: 'g' },
    });
  }

  return predictions;
}

module.exports = { analyzeProgress, buildPredictions };
