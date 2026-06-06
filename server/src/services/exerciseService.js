// ══════════════════════════════════════════════════════════════
// FitTrack — Service des Exercices
// ══════════════════════════════════════════════════════════════

const prisma = require('../config/prismaClient');

/**
 * Récupère la liste de tous les exercices disponibles.
 */
async function getAllExercises() {
  return prisma.exercise.findMany({
    orderBy: { name: 'asc' },
  });
}

module.exports = {
  getAllExercises,
};
