// ══════════════════════════════════════════════════════════════
// FitTrack — Service de Calculs (BMR, TDEE, Macros)
// ══════════════════════════════════════════════════════════════

const {
  ACTIVITY_FACTORS,
  GOAL_ADJUSTMENTS,
  PROTEIN_RATIOS,
  FAT_PERCENTAGE,
  CALORIES_PER_GRAM,
} = require('../utils/constants');

/**
 * Calcule les objectifs nutritionnels complets à partir d'un profil.
 * @param {Object} profile - Les données du profil de l'utilisateur
 * @returns {Object} { targetCalories, targetProtein, targetCarbs, targetFat }
 */
function calculateGoals(profile) {
  const { gender, weightKg, heightCm, age, activityLevel, goal } = profile;

  // Validation des entrées
  if (!gender || !weightKg || !heightCm || !age || !activityLevel || !goal) {
    throw new Error('Données de profil incomplètes pour le calcul des objectifs');
  }

  // 1. Calcul du BMR (Mifflin-St Jeor)
  let bmr;
  if (gender === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else if (gender === 'female') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    throw new Error(`Genre non supporté: ${gender}`);
  }

  // 2. Calcul du TDEE
  const activityFactor = ACTIVITY_FACTORS[activityLevel];
  if (!activityFactor) {
    throw new Error(`Niveau d'activité non supporté: ${activityLevel}`);
  }
  const tdee = bmr * activityFactor;

  // 3. Objectif calorique
  const goalAdjustment = GOAL_ADJUSTMENTS[goal];
  if (!goalAdjustment) {
    throw new Error(`Objectif non supporté: ${goal}`);
  }
  const targetCalories = Math.round(tdee * goalAdjustment);

  // 4. Objectif Protéines (g)
  const proteinRatio = PROTEIN_RATIOS[goal] || PROTEIN_RATIOS['maintenance'];
  const targetProtein = Math.round(weightKg * proteinRatio);
  const proteinCalories = targetProtein * CALORIES_PER_GRAM.protein;

  // 5. Objectif Lipides (g)
  const fatCalories = targetCalories * FAT_PERCENTAGE;
  const targetFat = Math.round(fatCalories / CALORIES_PER_GRAM.fat);

  // 6. Objectif Glucides (g)
  const remainingCalories = targetCalories - proteinCalories - fatCalories;
  const targetCarbs = Math.max(0, Math.round(remainingCalories / CALORIES_PER_GRAM.carbs));

  // Vérification anti-NaN
  if (isNaN(targetCalories) || isNaN(targetProtein) || isNaN(targetCarbs) || isNaN(targetFat)) {
    throw new Error('Erreur de calcul: résultat NaN détecté');
  }

  return {
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
  };
}

/**
 * Estime les calories brûlées pour un entraînement.
 * @param {number} metValue - L'équivalent métabolique de l'exercice
 * @param {number} weightKg - Le poids de l'utilisateur
 * @param {number} durationMinutes - La durée de l'exercice en minutes
 * @returns {number} Calories brûlées
 */
function calculateCaloriesBurned(metValue, weightKg, durationMinutes) {
  // Formule : Calories = MET × poids_kg × (durée_minutes / 60)
  return Math.round(metValue * weightKg * (durationMinutes / 60));
}

module.exports = {
  calculateGoals,
  calculateCaloriesBurned,
};
