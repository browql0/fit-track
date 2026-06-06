// ══════════════════════════════════════════════════════════════
// FitTrack — Constantes métier
// ══════════════════════════════════════════════════════════════

// ─── Facteurs d'activité pour le calcul du TDEE ───
const ACTIVITY_FACTORS = {
  sedentary: 1.2,     // Peu ou pas d'exercice, travail de bureau
  light: 1.375,       // Exercice léger 1-3 jours/semaine
  moderate: 1.55,     // Exercice modéré 3-5 jours/semaine
  active: 1.725,      // Exercice intense 6-7 jours/semaine
  very_active: 1.9,   // Exercice très intense + travail physique
};

// ─── Ajustement calorique selon l'objectif ───
const GOAL_ADJUSTMENTS = {
  fat_loss: 0.80,     // −20%
  weight_loss: 0.85,  // −15%
  maintenance: 1.00,  // 0%
  muscle_gain: 1.10,  // +10%
  bulking: 1.20,      // +20%
};

// ─── Protéines (g/kg) selon l'objectif ───
const PROTEIN_RATIOS = {
  fat_loss: 2.2,
  weight_loss: 2.0,
  maintenance: 1.8,
  muscle_gain: 2.0,
  bulking: 1.8,
};

// ─── Pourcentage de lipides (des calories totales) ───
const FAT_PERCENTAGE = 0.25; // 25% pour tous les objectifs

// ─── Valeurs caloriques des macronutriments ───
const CALORIES_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
};

// ─── Valeurs MET pour les exercices (seed) ───
const EXERCISE_MET_VALUES = [
  { name: 'Boxing', metValue: 7.8 },
  { name: 'Running (slow)', metValue: 8.0 },
  { name: 'Running (fast)', metValue: 11.5 },
  { name: 'Weight Training', metValue: 6.0 },
  { name: 'Football', metValue: 7.0 },
  { name: 'Basketball', metValue: 6.5 },
  { name: 'Swimming', metValue: 7.0 },
  { name: 'Cycling', metValue: 6.8 },
  { name: 'HIIT', metValue: 8.0 },
  { name: 'Walking', metValue: 3.5 },
  { name: 'Yoga', metValue: 3.0 },
  { name: 'Jumping Rope', metValue: 12.3 },
  { name: 'Martial Arts', metValue: 10.3 },
  { name: 'Tennis', metValue: 7.3 },
  { name: 'Rowing', metValue: 7.0 },
  { name: 'Elliptical', metValue: 5.0 },
  { name: 'Stretching', metValue: 2.3 },
  { name: 'Dance', metValue: 5.5 },
  { name: 'Climbing', metValue: 8.0 },
  { name: 'Pilates', metValue: 3.8 },
];

// ─── Aliments pré-remplis (seed) ───
const SEED_FOODS = [
  // Protéines
  { name: 'Blanc de poulet', caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, category: 'protein' },
  { name: 'Steak haché 5%', caloriesPer100g: 137, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 5, category: 'protein' },
  { name: 'Saumon', caloriesPer100g: 208, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 13, category: 'protein' },
  { name: 'Thon en boîte', caloriesPer100g: 116, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 1, category: 'protein' },
  { name: 'Œuf entier', caloriesPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11, category: 'protein' },
  { name: 'Blanc d\'œuf', caloriesPer100g: 52, proteinPer100g: 11, carbsPer100g: 0.7, fatPer100g: 0.2, category: 'protein' },
  { name: 'Tofu', caloriesPer100g: 76, proteinPer100g: 8, carbsPer100g: 1.9, fatPer100g: 4.8, category: 'protein' },
  { name: 'Whey Protein', caloriesPer100g: 400, proteinPer100g: 80, carbsPer100g: 10, fatPer100g: 5, category: 'protein' },
  { name: 'Dinde', caloriesPer100g: 135, proteinPer100g: 30, carbsPer100g: 0, fatPer100g: 1, category: 'protein' },
  { name: 'Crevettes', caloriesPer100g: 99, proteinPer100g: 24, carbsPer100g: 0.2, fatPer100g: 0.3, category: 'protein' },

  // Céréales & Féculents
  { name: 'Riz blanc (cuit)', caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3, category: 'grain' },
  { name: 'Riz complet (cuit)', caloriesPer100g: 123, proteinPer100g: 2.6, carbsPer100g: 26, fatPer100g: 0.9, category: 'grain' },
  { name: 'Pâtes (cuites)', caloriesPer100g: 131, proteinPer100g: 5, carbsPer100g: 25, fatPer100g: 1.1, category: 'grain' },
  { name: 'Pain complet', caloriesPer100g: 247, proteinPer100g: 13, carbsPer100g: 41, fatPer100g: 3.4, category: 'grain' },
  { name: 'Flocons d\'avoine', caloriesPer100g: 389, proteinPer100g: 17, carbsPer100g: 66, fatPer100g: 7, category: 'grain' },
  { name: 'Quinoa (cuit)', caloriesPer100g: 120, proteinPer100g: 4.4, carbsPer100g: 21, fatPer100g: 1.9, category: 'grain' },
  { name: 'Patate douce', caloriesPer100g: 86, proteinPer100g: 1.6, carbsPer100g: 20, fatPer100g: 0.1, category: 'grain' },
  { name: 'Pomme de terre', caloriesPer100g: 77, proteinPer100g: 2, carbsPer100g: 17, fatPer100g: 0.1, category: 'grain' },

  // Légumineuses
  { name: 'Lentilles (cuites)', caloriesPer100g: 116, proteinPer100g: 9, carbsPer100g: 20, fatPer100g: 0.4, category: 'grain' },
  { name: 'Pois chiches (cuits)', caloriesPer100g: 164, proteinPer100g: 8.9, carbsPer100g: 27, fatPer100g: 2.6, category: 'grain' },

  // Légumes
  { name: 'Brocoli', caloriesPer100g: 34, proteinPer100g: 2.8, carbsPer100g: 7, fatPer100g: 0.4, category: 'vegetable' },
  { name: 'Épinards', caloriesPer100g: 23, proteinPer100g: 2.9, carbsPer100g: 3.6, fatPer100g: 0.4, category: 'vegetable' },
  { name: 'Haricots verts', caloriesPer100g: 31, proteinPer100g: 1.8, carbsPer100g: 7, fatPer100g: 0.1, category: 'vegetable' },
  { name: 'Courgette', caloriesPer100g: 17, proteinPer100g: 1.2, carbsPer100g: 3.1, fatPer100g: 0.3, category: 'vegetable' },
  { name: 'Tomate', caloriesPer100g: 18, proteinPer100g: 0.9, carbsPer100g: 3.9, fatPer100g: 0.2, category: 'vegetable' },
  { name: 'Carotte', caloriesPer100g: 41, proteinPer100g: 0.9, carbsPer100g: 10, fatPer100g: 0.2, category: 'vegetable' },
  { name: 'Concombre', caloriesPer100g: 15, proteinPer100g: 0.7, carbsPer100g: 3.6, fatPer100g: 0.1, category: 'vegetable' },
  { name: 'Poivron', caloriesPer100g: 31, proteinPer100g: 1, carbsPer100g: 6, fatPer100g: 0.3, category: 'vegetable' },

  // Fruits
  { name: 'Banane', caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3, category: 'fruit' },
  { name: 'Pomme', caloriesPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 14, fatPer100g: 0.2, category: 'fruit' },
  { name: 'Fraises', caloriesPer100g: 32, proteinPer100g: 0.7, carbsPer100g: 7.7, fatPer100g: 0.3, category: 'fruit' },
  { name: 'Myrtilles', caloriesPer100g: 57, proteinPer100g: 0.7, carbsPer100g: 14, fatPer100g: 0.3, category: 'fruit' },
  { name: 'Orange', caloriesPer100g: 47, proteinPer100g: 0.9, carbsPer100g: 12, fatPer100g: 0.1, category: 'fruit' },
  { name: 'Mangue', caloriesPer100g: 60, proteinPer100g: 0.8, carbsPer100g: 15, fatPer100g: 0.4, category: 'fruit' },

  // Produits laitiers
  { name: 'Yaourt grec 0%', caloriesPer100g: 59, proteinPer100g: 10, carbsPer100g: 3.6, fatPer100g: 0.4, category: 'dairy' },
  { name: 'Fromage blanc 0%', caloriesPer100g: 49, proteinPer100g: 8, carbsPer100g: 4, fatPer100g: 0.1, category: 'dairy' },
  { name: 'Lait demi-écrémé', caloriesPer100g: 46, proteinPer100g: 3.2, carbsPer100g: 4.8, fatPer100g: 1.6, category: 'dairy' },
  { name: 'Mozzarella', caloriesPer100g: 280, proteinPer100g: 28, carbsPer100g: 3.1, fatPer100g: 17, category: 'dairy' },
  { name: 'Parmesan', caloriesPer100g: 431, proteinPer100g: 38, carbsPer100g: 4.1, fatPer100g: 29, category: 'dairy' },

  // Graisses
  { name: 'Huile d\'olive', caloriesPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, category: 'fat' },
  { name: 'Beurre de cacahuète', caloriesPer100g: 588, proteinPer100g: 25, carbsPer100g: 20, fatPer100g: 50, category: 'fat' },
  { name: 'Amandes', caloriesPer100g: 579, proteinPer100g: 21, carbsPer100g: 22, fatPer100g: 50, category: 'fat' },
  { name: 'Noix', caloriesPer100g: 654, proteinPer100g: 15, carbsPer100g: 14, fatPer100g: 65, category: 'fat' },
  { name: 'Avocat', caloriesPer100g: 160, proteinPer100g: 2, carbsPer100g: 9, fatPer100g: 15, category: 'fat' },
  { name: 'Graines de chia', caloriesPer100g: 486, proteinPer100g: 17, carbsPer100g: 42, fatPer100g: 31, category: 'fat' },

  // Autres
  { name: 'Miel', caloriesPer100g: 304, proteinPer100g: 0.3, carbsPer100g: 82, fatPer100g: 0, category: 'other' },
  { name: 'Chocolat noir 85%', caloriesPer100g: 580, proteinPer100g: 13, carbsPer100g: 22, fatPer100g: 46, category: 'other' },
  { name: 'Barre protéinée', caloriesPer100g: 350, proteinPer100g: 30, carbsPer100g: 35, fatPer100g: 10, category: 'other' },
  { name: 'Confiture', caloriesPer100g: 250, proteinPer100g: 0.6, carbsPer100g: 60, fatPer100g: 0.1, category: 'other' },
];

// ─── Types de repas ───
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

// ─── Niveaux d'activité ───
const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'];

// ─── Objectifs ───
const GOALS = ['fat_loss', 'weight_loss', 'maintenance', 'muscle_gain', 'bulking'];

// ─── Genres ───
const GENDERS = ['male', 'female'];

module.exports = {
  ACTIVITY_FACTORS,
  GOAL_ADJUSTMENTS,
  PROTEIN_RATIOS,
  FAT_PERCENTAGE,
  CALORIES_PER_GRAM,
  EXERCISE_MET_VALUES,
  SEED_FOODS,
  MEAL_TYPES,
  ACTIVITY_LEVELS,
  GOALS,
  GENDERS,
};
