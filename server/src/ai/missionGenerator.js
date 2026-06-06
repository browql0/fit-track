const { macroTotals, makeMission, percent, todayKey, daysBetween } = require('./coachUtils');

function dateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function getStreak(dateSet) {
  let streak = 0;
  const current = new Date(`${todayKey()}T00:00:00.000Z`);
  while (dateSet.has(dateKey(current))) {
    streak += 1;
    current.setUTCDate(current.getUTCDate() - 1);
  }

  if (streak > 0) return { current: streak, pendingToday: false };

  const yesterday = new Date(`${todayKey()}T00:00:00.000Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  let yStreak = 0;
  while (dateSet.has(dateKey(yesterday))) {
    yStreak += 1;
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  }
  return { current: yStreak, pendingToday: yStreak > 0 };
}

function calculateStreaks(context) {
  const datesFood = new Set(Object.keys(context.foodEntriesByDate || {}));
  const datesWorkout = new Set(Object.keys(context.workoutsByDate || {}));
  const datesWeight = new Set(context.weightEntries.map((entry) => dateKey(entry.entryDate)));
  const datesHydration = new Set(
    Object.entries(context.hydrationEntriesByDate || {})
      .filter(([, entries]) => entries.reduce((sum, entry) => sum + Number(entry.amountMl || 0), 0) >= 2000)
      .map(([date]) => date)
  );
  const datesLogin = new Set(
    (context.userActivities || [])
      .filter((activity) => activity.activityType === 'login' || activity.activityType === 'register')
      .map((activity) => dateKey(activity.activityDate))
  );
  const allDates = new Set([...datesFood, ...datesWorkout, ...datesWeight, ...datesHydration, ...datesLogin]);
  const datesProtein = new Set();
  const targetProtein = context.targets?.targetProtein || 0;

  if (targetProtein > 0) {
    Object.entries(context.foodEntriesByDate || {}).forEach(([dateStr, entries]) => {
      const daily = macroTotals(entries);
      if (daily.protein >= targetProtein * 0.9) datesProtein.add(dateStr);
    });
  }

  return {
    global: getStreak(allDates).current,
    login: { ...getStreak(datesLogin.size ? datesLogin : allDates), source: datesLogin.size ? 'login_events' : 'activity_proxy' },
    protein: getStreak(datesProtein).current,
    proteinGoal: getStreak(datesProtein),
    training: getStreak(datesWorkout).current,
    workout: getStreak(datesWorkout),
    weight: getStreak(datesWeight).current,
    weighIn: getStreak(datesWeight),
    hydration: {
      ...getStreak(datesHydration),
      source: 'hydration_entries',
      targetMl: 2000,
    },
  };
}

function addMission(missions, severity, payload) {
  missions.push({
    severity,
    mission: makeMission(payload),
  });
}

function generateMissions(context, nutritionAnalysis, trainingAnalysis, progressAnalysis) {
  const targets = context.targets || {};
  const todayNutrition = nutritionAnalysis.today || {};
  const missions = [];
  const completedToday = new Set(
    (context.missionCompletions || [])
      .filter((completion) => dateKey(completion.missionDate) === todayKey())
      .map((completion) => completion.missionId)
  );

  const proteinMissing = Math.max(0, Math.round((targets.targetProtein || 0) - (todayNutrition.protein || 0)));
  const proteinProgress = percent(todayNutrition.protein, targets.targetProtein);
  const hydrationTodayMl = (context.hydrationEntriesByDate?.[todayKey()] || [])
    .reduce((sum, entry) => sum + Number(entry.amountMl || 0), 0);
  const hydrationProgress = percent(hydrationTodayMl, 2000);

  if (hydrationProgress < 70) {
    addMission(missions, 72, {
      id: 'smart-hydration',
      title: 'Atteindre 2 L hydratation',
      detail: `Tu es a ${hydrationTodayMl} ml. Ajoute ${Math.max(0, 2000 - hydrationTodayMl)} ml d'eau aujourd'hui.`,
      category: 'hydration',
      xp: 20,
      scoreBonus: 3,
      done: completedToday.has('smart-hydration') || hydrationTodayMl >= 2000,
      progress: hydrationProgress,
      route: '/tracking',
    });
  }

  if (proteinMissing > 15 && proteinProgress < 90) {
    addMission(missions, proteinMissing >= 35 ? 95 : 80, {
      id: 'smart-protein',
      title: `Atteindre ${targets.targetProtein || 0} g proteines`,
      detail: `Il manque ${proteinMissing} g. Option simple: 1 shaker whey + 150 g skyr, ou 150 g poulet.`,
      category: 'nutrition',
      xp: 40,
      scoreBonus: 8,
      done: completedToday.has('smart-protein'),
      progress: proteinProgress,
      route: '/nutrition',
    });
  }

  const calPercent = percent(todayNutrition.calories, targets.targetCalories);
  if (calPercent > 110) {
    addMission(missions, 86, {
      id: 'smart-calories-high',
      title: 'Revenir dans la cible calories',
      detail: `${todayNutrition.calories} kcal loggees. Vise un diner maigre et retire les snacks liquides/sucres.`,
      category: 'nutrition',
      xp: 30,
      scoreBonus: 4,
      done: completedToday.has('smart-calories-high'),
      progress: calPercent,
      route: '/nutrition',
    });
  }

  if (todayNutrition.mealsLogged === 0) {
    addMission(missions, 70, {
      id: 'smart-log-first-meal',
      title: 'Logger le premier repas',
      detail: 'Sans repas logge aujourd hui, le coach ne peut pas ajuster tes priorites.',
      category: 'tracking',
      xp: 20,
      scoreBonus: 3,
      done: completedToday.has('smart-log-first-meal'),
      progress: 0,
      route: '/nutrition',
    });
  }

  const workoutsDesc = [...(context.workouts || [])].sort((a, b) => new Date(b.workoutDate) - new Date(a.workoutDate));
  const daysSinceLastWorkout = workoutsDesc.length ? daysBetween(workoutsDesc[0].workoutDate, new Date()) : 99;
  if (daysSinceLastWorkout >= 3) {
    addMission(missions, daysSinceLastWorkout >= 7 ? 92 : 78, {
      id: 'smart-training',
      title: 'Faire 20 min d activite',
      detail: `Aucun entrainement depuis ${daysSinceLastWorkout} jours. Marche rapide, velo ou circuit poids du corps suffisent.`,
      category: 'training',
      xp: 50,
      scoreBonus: 10,
      done: completedToday.has('smart-training') || (trainingAnalysis.todayDurationMinutes || 0) >= 20,
      progress: percent(trainingAnalysis.todayDurationMinutes || 0, 20),
      route: '/workouts',
    });
  }

  if (progressAnalysis.status === 'deficit_too_aggressive') {
    addMission(missions, 90, {
      id: 'smart-deficit-recovery',
      title: 'Reduire le deficit aujourd hui',
      detail: 'Ajoute 150 a 250 kcal propres et atteins tes proteines pour proteger la masse musculaire.',
      category: 'nutrition',
      xp: 35,
      scoreBonus: 6,
      done: completedToday.has('smart-deficit-recovery'),
      progress: proteinProgress,
      route: '/nutrition',
    });
  }

  if (progressAnalysis.status === 'surplus_too_large') {
    addMission(missions, 88, {
      id: 'smart-surplus-control',
      title: 'Controler le surplus',
      detail: 'Retire 100 a 150 kcal aujourd hui, idealement depuis lipides/snacks.',
      category: 'nutrition',
      xp: 30,
      scoreBonus: 5,
      done: completedToday.has('smart-surplus-control'),
      progress: calPercent,
      route: '/nutrition',
    });
  }

  const weightsDesc = [...(context.weightEntries || [])].sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));
  const daysSinceLastWeight = weightsDesc.length ? daysBetween(weightsDesc[0].entryDate, new Date()) : 99;
  const weighedToday = context.weightEntries.some((entry) => dateKey(entry.entryDate) === todayKey());
  if (daysSinceLastWeight >= 7 || !weightsDesc.length) {
    addMission(missions, 65, {
      id: 'smart-weight',
      title: 'Mettre a jour la pesee',
      detail: weightsDesc.length
        ? `Derniere pesee il y a ${daysSinceLastWeight} jours. Une pesee relance les predictions.`
        : 'Aucune pesee recente. Ajoute ton poids pour creer une trajectoire.',
      category: 'tracking',
      xp: 25,
      scoreBonus: 5,
      done: completedToday.has('smart-weight') || weighedToday,
      progress: weighedToday ? 100 : 0,
      route: '/progress',
    });
  }

  if (!missions.length) {
    addMission(missions, 40, {
      id: 'smart-maintain',
      title: 'Verrouiller la journee',
      detail: 'Tu es dans une bonne zone: garde calories a +/-5%, proteines a 100%, et note une pesee si prevue.',
      category: 'tracking',
      xp: 20,
      scoreBonus: 2,
      done: completedToday.has('smart-maintain'),
      progress: Math.min(100, Math.round((proteinProgress + Math.min(calPercent, 100)) / 2)),
      route: '/nutrition',
    });
  }

  return missions
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 3)
    .map(({ mission }) => mission);
}

module.exports = { calculateStreaks, generateMissions };
