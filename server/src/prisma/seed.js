// ══════════════════════════════════════════════════════════════
// FitTrack — Seed : Exercises + Foods
// ══════════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const { EXERCISE_MET_VALUES, SEED_FOODS } = require('../utils/constants');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding FitTrack database...\n');

  // ─── Seed Exercises ───
  console.log(' Seeding exercises...');
  for (const exercise of EXERCISE_MET_VALUES) {
    await prisma.exercise.upsert({
      where: { name: exercise.name },
      update: { metValue: exercise.metValue },
      create: {
        name: exercise.name,
        metValue: exercise.metValue,
      },
    });
  }
  console.log(`    ${EXERCISE_MET_VALUES.length} exercises seeded.\n`);

  // ─── Seed Foods ───
  console.log('Seeding foods...');
  for (const food of SEED_FOODS) {
    // Vérifier si l'aliment existe déjà (par nom)
    const existing = await prisma.food.findFirst({
      where: { name: food.name, isPublic: true, createdBy: null },
    });

    if (!existing) {
      await prisma.food.create({
        data: {
          name: food.name,
          caloriesPer100g: food.caloriesPer100g,
          proteinPer100g: food.proteinPer100g,
          carbsPer100g: food.carbsPer100g,
          fatPer100g: food.fatPer100g,
          category: food.category,
          createdBy: null,  // Aliment système
          isPublic: true,
        },
      });
    }
  }
  console.log(`   ✅ ${SEED_FOODS.length} foods seeded.\n`);

  console.log(' Seeding complete!');
}

main()
  .catch((e) => {
    console.error(' Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
