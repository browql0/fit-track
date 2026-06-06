const { average, groupByDate, macroTotals, makeInsight, percent, round, scoreRange, todayKey } = require('./coachUtils');

function mealProteinAverage(foodEntries) {
  const meals = foodEntries.reduce((map, entry) => {
    const date = entry.entryDate.toISOString().slice(0, 10);
    const key = `${date}:${entry.mealType || 'snack'}`;
    if (!map[key]) map[key] = [];
    map[key].push(entry);
    return map;
  }, {});

  const proteinByMeal = Object.values(meals)
    .map((entries) => macroTotals(entries).protein)
    .filter((protein) => protein >= 5);

  return average(proteinByMeal) || 25;
}

function analyzeNutrition(context) {
  const { foodEntries, targets } = context;
  const today = todayKey();
  const byDate = groupByDate(foodEntries, 'entryDate');
  const todayEntries = byDate[today] || [];
  const todayTotals = macroTotals(todayEntries);
  const dailyTotals = Object.values(byDate).map(macroTotals);
  const daysLogged = dailyTotals.length;
  const last7 = dailyTotals.slice(-7);
  const last14 = dailyTotals.slice(-14);

  const caloriesTarget = targets?.targetCalories || 0;
  const proteinTarget = targets?.targetProtein || 0;
  const carbsTarget = targets?.targetCarbs || 0;
  const fatTarget = targets?.targetFat || 0;

  const calorieRatio = caloriesTarget ? todayTotals.calories / caloriesTarget : 0;
  const proteinRatio = proteinTarget ? todayTotals.protein / proteinTarget : 0;
  const carbsRatio = carbsTarget ? todayTotals.carbs / carbsTarget : 0;
  const fatRatio = fatTarget ? todayTotals.fat / fatTarget : 0;

  const avgCalories = average(last7.map((day) => day.calories));
  const avgProtein = average(last7.map((day) => day.protein));
  const avgCarbs = average(last7.map((day) => day.carbs));
  const avgFat = average(last7.map((day) => day.fat));
  const avg14Calories = average(last14.map((day) => day.calories));
  const avgProteinPerMeal = mealProteinAverage(foodEntries);
  const fatOverDays = last7.filter((day) => fatTarget && day.fat > fatTarget * 1.08).length;
  const proteinLowDays = last7.filter((day) => proteinTarget && day.protein < proteinTarget * 0.85).length;
  const loggedMealsToday = new Set(todayEntries.map((entry) => entry.mealType || 'snack')).size;

  const calorieScore = scoreRange(calorieRatio, 0.9, 1.05, 0.55, 1.28);
  const proteinScore = proteinTarget ? scoreRange(proteinRatio, 0.88, 1.25, 0.35, 1.7) : 60;
  const carbsScore = carbsTarget ? scoreRange(carbsRatio, 0.75, 1.18, 0.25, 1.7) : 80;
  const fatScore = fatTarget ? scoreRange(fatRatio, 0.72, 1.12, 0.25, 1.7) : 80;
  const consistencyScore = Math.min(100, Math.round((daysLogged / Math.max(context.window.days, 1)) * 100));
  const score = Math.round((calorieScore * 0.40) + (proteinScore * 0.40) + (carbsScore * 0.10) + (fatScore * 0.10));

  const insights = [];
  const proteinMissing = Math.max(0, Math.round(proteinTarget - todayTotals.protein));
  const caloriesDelta = Math.round(todayTotals.calories - caloriesTarget);
  const caloriesAverageDelta = Math.round(avg14Calories - caloriesTarget);

  if (proteinMissing >= 20) {
    insights.push(makeInsight({
      id: 'nutrition-protein-gap',
      category: 'nutrition',
      priority: 1,
      tone: 'warning',
      title: 'Deficit en proteines',
      message: `Il te manque ${proteinMissing} g de proteines aujourd'hui.`,
      action: proteinMissing <= 30
        ? 'Prends 1 shaker whey, 150 g de fromage blanc 0%, ou 120 g de blanc de poulet.'
        : 'Ajoute 150 g de blanc de poulet et un skyr: tu couvres environ 55 g de proteines.',
      metric: { current: round(todayTotals.protein), target: proteinTarget, unit: 'g' },
    }));
  } else if (proteinTarget && proteinRatio >= 0.95 && proteinRatio <= 1.2) {
    insights.push(makeInsight({
      id: 'nutrition-protein-solid',
      category: 'nutrition',
      priority: 3,
      tone: 'positive',
      title: 'Proteines securisees',
      message: `Tu as atteint ${round(todayTotals.protein)} g sur ${proteinTarget} g.`,
      action: 'Reproduis la meme repartition demain: proteines a chaque repas, pas seulement le soir.',
      metric: { current: round(todayTotals.protein), target: proteinTarget, unit: 'g' },
    }));
  }

  if (proteinLowDays >= 4) {
    insights.push(makeInsight({
      id: 'nutrition-protein-repeated-low',
      category: 'nutrition',
      priority: 1,
      tone: 'warning',
      title: 'Proteines faibles repetitives',
      message: `${proteinLowDays} jours sur 7 sont sous 85% de ta cible proteines.`,
      action: `Ajoute une prise fixe de ${Math.max(20, Math.round(proteinTarget * 0.18))} g de proteines au petit-dejeuner.`,
      metric: { current: round(avgProtein), target: proteinTarget, unit: 'g/j' },
    }));
  }

  if (caloriesTarget && calorieRatio > 1.15) {
    insights.push(makeInsight({
      id: 'nutrition-calories-high',
      category: 'nutrition',
      priority: 1,
      tone: 'warning',
      title: 'Calories au-dessus',
      message: `Tu depasses ton objectif de ${Math.abs(caloriesDelta)} kcal aujourd'hui.`,
      action: 'Garde un diner proteine + legumes et evite les calories liquides ou snacks ce soir.',
      metric: { current: Math.round(todayTotals.calories), target: caloriesTarget, unit: 'kcal' },
    }));
  } else if (caloriesTarget && calorieRatio < 0.68 && (context.profile?.goal === 'muscle_gain' || context.profile?.goal === 'bulking')) {
    insights.push(makeInsight({
      id: 'nutrition-calories-low-muscle',
      category: 'nutrition',
      priority: 1,
      tone: 'warning',
      title: 'Energie trop basse',
      message: `Il te manque ${Math.abs(caloriesDelta)} kcal pour soutenir la prise de muscle.`,
      action: 'Ajoute 80 g de riz cru ou 60 g de flocons d avoine + 1 yaourt grec.',
      metric: { current: Math.round(todayTotals.calories), target: caloriesTarget, unit: 'kcal' },
    }));
  } else if (caloriesTarget && calorieRatio >= 0.9 && calorieRatio <= 1.05) {
    insights.push(makeInsight({
      id: 'nutrition-calories-perfect',
      category: 'nutrition',
      priority: 4,
      tone: 'positive',
      title: 'Cible calorique',
      message: `Ton apport de ${Math.round(todayTotals.calories)} kcal est dans la zone cible.`,
      action: 'La prochaine optimisation est la repartition: vise une source de proteines dans chaque repas.',
      metric: { current: Math.round(todayTotals.calories), target: caloriesTarget, unit: 'kcal' },
    }));
  }

  if (Math.abs(caloriesAverageDelta) > 180 && last14.length >= 7) {
    insights.push(makeInsight({
      id: 'nutrition-calorie-average-drift',
      category: 'nutrition',
      priority: 2,
      tone: 'warning',
      title: 'Derive calorique moyenne',
      message: `Ta moyenne 14 jours est ${caloriesAverageDelta > 0 ? 'au-dessus' : 'sous'} la cible de ${Math.abs(caloriesAverageDelta)} kcal/j.`,
      action: caloriesAverageDelta > 0
        ? 'Retire une portion dense quotidienne: huile, fromage, noix ou snack sucre.'
        : 'Ajoute 150 a 200 kcal propres si energie basse ou progression trop rapide.',
      metric: { current: Math.round(avg14Calories), target: caloriesTarget, unit: 'kcal/j' },
    }));
  }

  if (fatOverDays >= 5) {
    insights.push(makeInsight({
      id: 'nutrition-fat-repeated',
      category: 'nutrition',
      priority: 2,
      tone: 'warning',
      title: 'Lipides excedentaires',
      message: `Moyenne de ${round(avgFat)} g de lipides/jour, cible ${fatTarget} g.`,
      action: 'Mesure l huile avec une cuillere et remplace une source grasse par une proteine maigre.',
      metric: { current: round(avgFat), target: fatTarget, unit: 'g/j' },
    }));
  }

  if (todayEntries.length > 0 && loggedMealsToday <= 1 && proteinMissing > 25) {
    insights.push(makeInsight({
      id: 'nutrition-protein-distribution',
      category: 'nutrition',
      priority: 2,
      tone: 'info',
      title: 'Repartition proteines faible',
      message: `Tu n'as logge que ${loggedMealsToday} type de repas aujourd'hui.`,
      action: 'Ajoute 25 a 35 g de proteines au prochain repas pour eviter de tout rattraper le soir.',
      metric: { current: loggedMealsToday, target: 3, unit: 'repas' },
    }));
  }

  return {
    score,
    breakdown: {
      calories: calorieScore,
      protein: proteinScore,
      carbs: carbsScore,
      fat: fatScore,
      consistency: consistencyScore,
    },
    today: {
      calories: Math.round(todayTotals.calories),
      protein: Math.round(todayTotals.protein),
      carbs: Math.round(todayTotals.carbs),
      fat: Math.round(todayTotals.fat),
      mealsLogged: loggedMealsToday,
      progress: {
        calories: percent(todayTotals.calories, caloriesTarget),
        protein: percent(todayTotals.protein, proteinTarget),
        carbs: percent(todayTotals.carbs, carbsTarget),
        fat: percent(todayTotals.fat, fatTarget),
      },
    },
    averages: {
      calories: Math.round(avgCalories),
      calories14: Math.round(avg14Calories),
      protein: Math.round(avgProtein),
      proteinPerMeal: Math.round(avgProteinPerMeal),
      carbs: Math.round(avgCarbs),
      fat: Math.round(avgFat),
    },
    insights,
  };
}

module.exports = { analyzeNutrition };
