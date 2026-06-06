const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const exercises = await prisma.exercise.findMany();
  console.log(exercises);
}
main().finally(() => prisma.$disconnect());
