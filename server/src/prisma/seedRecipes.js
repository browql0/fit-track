const prisma = require('../config/prismaClient');

const MACROS = {
  poulet: { kcal: 165, p: 31, c: 0, f: 3.6 },
  thon: { kcal: 116, p: 26, c: 0, f: 1 },
  oeufs: { kcal: 155, p: 13, c: 1.1, f: 11 },
  'steak hache': { kcal: 137, p: 26, c: 0, f: 5 },
  dinde: { kcal: 135, p: 30, c: 0, f: 1 },
  sardines: { kcal: 208, p: 25, c: 0, f: 11 },
  saumon: { kcal: 208, p: 20, c: 0, f: 13 },
  whey: { kcal: 400, p: 80, c: 10, f: 5 },
  'yaourt grec': { kcal: 59, p: 10, c: 3.6, f: 0.4 },
  skyr: { kcal: 60, p: 10, c: 4, f: 0.2 },
  'fromage blanc': { kcal: 49, p: 8, c: 4, f: 0.1 },
  lentilles: { kcal: 116, p: 9, c: 20, f: 0.4 },
  'pois chiches': { kcal: 164, p: 8.9, c: 27, f: 2.6 },
  riz: { kcal: 130, p: 2.7, c: 28, f: 0.3 },
  pates: { kcal: 131, p: 5, c: 25, f: 1.1 },
  avoine: { kcal: 389, p: 17, c: 66, f: 7 },
  'pommes de terre': { kcal: 77, p: 2, c: 17, f: 0.1 },
  'pain complet': { kcal: 247, p: 13, c: 41, f: 3.4 },
  couscous: { kcal: 112, p: 3.8, c: 23, f: 0.2 },
  semoule: { kcal: 112, p: 3.8, c: 23, f: 0.2 },
  tomate: { kcal: 18, p: 0.9, c: 3.9, f: 0.2 },
  concombre: { kcal: 15, p: 0.7, c: 3.6, f: 0.1 },
  salade: { kcal: 15, p: 1.4, c: 2.9, f: 0.2 },
  carotte: { kcal: 41, p: 0.9, c: 10, f: 0.2 },
  oignon: { kcal: 40, p: 1.1, c: 9, f: 0.1 },
  poivron: { kcal: 31, p: 1, c: 6, f: 0.3 },
  courgette: { kcal: 17, p: 1.2, c: 3.1, f: 0.3 },
  banane: { kcal: 89, p: 1.1, c: 23, f: 0.3 },
  pomme: { kcal: 52, p: 0.3, c: 14, f: 0.2 },
  dattes: { kcal: 282, p: 2.5, c: 75, f: 0.4 },
  fraises: { kcal: 32, p: 0.7, c: 7.7, f: 0.3 },
  orange: { kcal: 47, p: 0.9, c: 12, f: 0.1 },
  lait: { kcal: 46, p: 3.2, c: 4.8, f: 1.6 },
  'huile d olive': { kcal: 884, p: 0, c: 0, f: 100 },
};

const TAGS = {
  breakfast: ['breakfast'],
  lunch: ['lunch'],
  dinner: ['dinner'],
  snack: ['snack'],
  post_training: ['post-workout'],
  budget_student: ['budget', 'student'],
};

const uniq = (items) => [...new Set(items.filter(Boolean))];
const round = (value, decimals = 0) => Number(value.toFixed(decimals));
const slug = (value) => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function ingredient(name, quantity, unit = 'g') {
  return { name, quantity, unit };
}

function calculateMacros(ingredients) {
  const total = ingredients.reduce((acc, item) => {
    const key = slug(item.name);
    const ref = MACROS[key] || MACROS[item.name] || { kcal: 20, p: 1, c: 3, f: 0.2 };
    const grams = item.unit === 'ml' ? item.quantity : item.unit === 'piece' ? item.quantity * 60 : item.quantity || 0;
    const ratio = grams / 100;
    acc.calories += ref.kcal * ratio;
    acc.proteinG += ref.p * ratio;
    acc.carbsG += ref.c * ratio;
    acc.fatG += ref.f * ratio;
    return acc;
  }, { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });

  return {
    calories: Math.max(120, Math.round(total.calories)),
    proteinG: round(total.proteinG, 1),
    carbsG: round(total.carbsG, 1),
    fatG: round(total.fatG, 1),
  };
}

function instructionSet({ title, category, protein, carb, veg, prepTimeMinutes }) {
  const cookTime = Math.max(3, Math.min(25, prepTimeMinutes - 4));
  const heat = prepTimeMinutes <= 10 ? 'feu moyen' : 'feu moyen-doux';
  return [
    {
      step: 1,
      title: 'Preparer le plan de travail',
      description: `Sors tous les ingredients de la recette ${title}. Pese les quantites indiquees, lave ${veg || 'les legumes'} et garde sel, poivre, cumin, paprika et citron a portee de main.`,
    },
    {
      step: 2,
      title: 'Decouper les ingredients',
      description: `Coupe ${protein} en morceaux faciles a manger si necessaire. Coupe ${veg || 'les legumes'} en petits des pour une cuisson rapide et reguliere.`,
    },
    {
      step: 3,
      title: 'Assaisonner simplement',
      description: `Ajoute sel, poivre, cumin et paprika. Melange bien pendant 20 a 30 secondes. Pour une touche marocaine legere, ajoute citron, persil ou coriandre si tu en as.`,
    },
    {
      step: 4,
      title: 'Cuire ou rechauffer',
      description: `Chauffe une poele antiadhesive a ${heat}. Cuis la partie principale environ ${cookTime} minutes en remuant regulierement. Si un ingredient est deja cuit, rechauffe-le 1 a 3 minutes seulement.`,
    },
    {
      step: 5,
      title: 'Preparer la base glucidique',
      description: carb ? `Rechauffe ou cuis ${carb}. Ajoute une petite cuillere d eau si tu le rechauffes pour eviter qu il seche.` : 'Garde la base legere et ajoute plus de legumes pour augmenter le volume sans beaucoup de calories.',
    },
    {
      step: 6,
      title: 'Assembler et ajuster',
      description: `Assemble dans une assiette ou un bol. Pour fat loss, ajoute plus de legumes et limite l huile. Pour muscle gain, augmente ${carb || 'la portion glucidique'} ou ajoute un yaourt proteine.`,
    },
  ];
}

function enrich({ tags, category, calories, proteinG, prepTimeMinutes }) {
  const enriched = [...tags, ...(TAGS[category] || [])];
  if (proteinG >= 30) enriched.push('high-protein');
  if (calories <= 520) enriched.push('fat-loss');
  if (calories >= 520 || proteinG >= 35) enriched.push('muscle-gain');
  if (prepTimeMinutes <= 10) enriched.push('quick');
  if (['budget_student'].includes(category)) enriched.push('budget', 'student');
  return uniq(enriched);
}

function makeRecipe(input) {
  const macros = input.macros || calculateMacros(input.ingredients);
  return {
    title: input.title,
    description: input.description,
    category: input.category,
    prepTimeMinutes: input.prepTimeMinutes,
    difficulty: input.difficulty || (input.prepTimeMinutes <= 10 ? 'facile' : input.prepTimeMinutes <= 25 ? 'moyen' : 'avance'),
    ...macros,
    ingredients: input.ingredients,
    instructions: input.instructions || instructionSet(input),
    tips: input.tips || [
      `Garde une source de proteines claire dans l assiette pour mieux atteindre ton objectif.`,
      macros.calories <= 520 ? 'Bonne option pour une perte de graisse si tu controles l huile.' : 'Bonne option pour soutenir une prise de muscle avec entrainement regulier.',
    ],
    alternatives: input.alternatives || [
      `Tu peux remplacer ${input.protein} par poulet, thon, oeufs, dinde ou lentilles selon ton stock.`,
      input.carb ? `Tu peux remplacer ${input.carb} par riz, pates, pommes de terre, pain complet, couscous ou semoule.` : 'Ajoute pain complet ou riz si tu as besoin de plus de glucides.',
    ],
    mistakesToAvoid: input.mistakesToAvoid || [
      'Ne verse pas l huile au hasard: mesure une cuillere a cafe ou une cuillere a soupe.',
      'Ne cuis pas trop fort au debut, sinon les proteines sechent et deviennent difficiles a manger.',
    ],
    mealPrepAdvice: input.mealPrepAdvice || [
      'Conserve 2 a 3 jours au refrigerateur dans une boite hermetique.',
      'Prepare les glucides et les proteines a l avance, puis ajoute les legumes frais au dernier moment.',
    ],
    tags: enrich({ tags: input.tags || [], category: input.category, calories: macros.calories, proteinG: macros.proteinG, prepTimeMinutes: input.prepTimeMinutes }),
    isPublic: true,
    createdBy: null,
  };
}

const proteins = ['poulet', 'thon', 'oeufs', 'steak hache', 'dinde', 'sardines', 'saumon', 'lentilles', 'pois chiches'];
const carbs = ['riz', 'pates', 'pommes de terre', 'pain complet', 'couscous', 'semoule'];
const vegs = ['tomate', 'concombre', 'salade', 'carotte', 'oignon', 'poivron', 'courgette'];
const fruits = ['banane', 'pomme', 'dattes', 'fraises', 'orange'];
const dairy = ['yaourt grec', 'skyr', 'fromage blanc'];

function comboRecipes(category, count, prefix, options = {}) {
  const recipes = [];
  for (let i = 0; i < count; i += 1) {
    const protein = options.proteins?.[i % options.proteins.length] || proteins[i % proteins.length];
    const carb = options.carbs?.[i % options.carbs.length] || carbs[(i + 1) % carbs.length];
    const veg = options.vegs?.[i % options.vegs.length] || vegs[(i + 2) % vegs.length];
    const quick = options.quick || i % 5 === 0;
    const prepTimeMinutes = options.prepTimes?.[i % options.prepTimes.length] || (quick ? 8 + (i % 3) : 15 + (i % 16));
    const proteinQty = protein === 'oeufs' ? 3 : protein.includes('lentilles') || protein.includes('pois') ? 240 : 150 + (i % 4) * 20;
    const carbQty = category === 'snack' ? 60 + (i % 3) * 20 : 150 + (i % 4) * 35;
    const ingredients = [
      ingredient(protein, proteinQty, protein === 'oeufs' ? 'piece' : 'g'),
      carb ? ingredient(carb, carbQty, 'g') : null,
      ingredient(veg, 80 + (i % 3) * 30, 'g'),
      ingredient('huile d olive', category === 'fat_loss' ? 5 : 5 + (i % 2) * 5, 'ml'),
    ].filter(Boolean);
    const title = `${prefix} ${protein} ${carb || veg} ${i + 1}`;
    recipes.push(makeRecipe({
      title,
      description: `Recette sportive simple avec ${protein}, ${carb || veg} et ${veg}, pensee pour manger propre sans compliquer la cuisine.`,
      category,
      prepTimeMinutes,
      protein,
      carb,
      veg,
      ingredients,
      tags: [...(options.tags || []), quick ? 'quick' : null].filter(Boolean),
    }));
  }
  return recipes;
}

function breakfastRecipes() {
  const bases = ['avoine', 'pain complet', 'semoule'];
  const proteinsBreakfast = ['oeufs', 'whey', 'yaourt grec', 'skyr', 'fromage blanc'];
  return Array.from({ length: 40 }, (_, i) => {
    const protein = proteinsBreakfast[i % proteinsBreakfast.length];
    const carb = bases[i % bases.length];
    const fruit = fruits[i % fruits.length];
    const ingredients = [
      ingredient(protein, protein === 'oeufs' ? 2 + (i % 2) : protein === 'whey' ? 30 : 220, protein === 'oeufs' ? 'piece' : 'g'),
      ingredient(carb, 45 + (i % 4) * 10, 'g'),
      ingredient(fruit, fruit === 'dattes' ? 25 : 100, 'g'),
      protein !== 'oeufs' ? ingredient('lait', 120, 'ml') : ingredient('tomate', 80, 'g'),
    ];
    return makeRecipe({
      title: `Petit-dejeuner fit ${protein} ${fruit} ${i + 1}`,
      description: `Petit-dejeuner riche et rapide autour de ${protein}, ${carb} et ${fruit}, ideal pour demarrer avec de l energie stable.`,
      category: 'breakfast',
      prepTimeMinutes: i % 4 === 0 ? 7 : 10 + (i % 8),
      protein,
      carb,
      veg: protein === 'oeufs' ? 'tomate' : fruit,
      ingredients,
      tags: ['breakfast', i % 4 === 0 ? 'quick' : null].filter(Boolean),
    });
  });
}

const MOROCCAN = [
  ['Tajine poulet leger', 'poulet', 'pommes de terre', 'courgette'],
  ['Tajine kefta proteine', 'steak hache', 'semoule', 'tomate'],
  ['Rfissa proteinee', 'poulet', 'lentilles', 'oignon'],
  ['Bissara sportive', 'lentilles', 'pain complet', 'oignon'],
  ['Harira fitness', 'dinde', 'pois chiches', 'tomate'],
  ['Sandwich kefta maison', 'steak hache', 'pain complet', 'tomate'],
  ['Salade marocaine proteinee', 'thon', null, 'concombre'],
  ['Couscous poulet allege', 'poulet', 'couscous', 'courgette'],
  ['Msemen proteine', 'oeufs', 'semoule', 'tomate'],
  ['Baghrir proteine', 'whey', 'semoule', 'orange'],
  ['Tajine sardines light', 'sardines', 'pommes de terre', 'poivron'],
  ['Bowl zaalouk thon', 'thon', 'pain complet', 'tomate'],
  ['Maakouda fitness au four', 'oeufs', 'pommes de terre', 'oignon'],
  ['Kefta riz tomate', 'steak hache', 'riz', 'tomate'],
  ['Seffa avoine whey', 'whey', 'avoine', 'dattes'],
  ['Chakchouka proteinee', 'oeufs', 'pain complet', 'poivron'],
  ['Loubia dinde fitness', 'dinde', 'pois chiches', 'tomate'],
  ['Taktouka poulet', 'poulet', 'pain complet', 'poivron'],
  ['Couscous thon express', 'thon', 'couscous', 'concombre'],
  ['Harira lentilles oeufs', 'oeufs', 'lentilles', 'tomate'],
];

function moroccanRecipes() {
  return MOROCCAN.map(([title, protein, carb, veg], i) => makeRecipe({
    title,
    description: `${title} en version FitTrack: gout marocain, proteines solides et quantites controlees.`,
    category: i % 3 === 0 ? 'dinner' : i % 3 === 1 ? 'lunch' : 'budget_student',
    prepTimeMinutes: 12 + (i % 4) * 6,
    protein,
    carb,
    veg,
    ingredients: [
      ingredient(protein, protein === 'oeufs' ? 3 : protein === 'whey' ? 30 : 170, protein === 'oeufs' ? 'piece' : 'g'),
      carb ? ingredient(carb, 160, 'g') : null,
      ingredient(veg, 120, 'g'),
      ingredient('huile d olive', 5, 'ml'),
    ].filter(Boolean),
    tags: ['moroccan', 'meal-prep'],
  }));
}

const RICH_RECIPE_SEEDS = [
  ...breakfastRecipes(),
  ...comboRecipes('lunch', 40, 'Dejeuner sport', { tags: ['lunch', 'meal-prep'] }),
  ...comboRecipes('dinner', 40, 'Diner fit', { tags: ['dinner', 'fat-loss'] }),
  ...comboRecipes('snack', 30, 'Snack proteine', { proteins: ['thon', 'oeufs', 'whey', 'yaourt grec', 'skyr', 'fromage blanc'], carbs: ['pain complet', 'avoine', null], prepTimes: [5, 6, 8, 10, 12], tags: ['snack'] }),
  ...comboRecipes('post_training', 20, 'Post-workout', { proteins: ['whey', 'poulet', 'thon', 'skyr'], carbs: ['banane', 'riz', 'pates', 'pain complet'], prepTimes: [5, 8, 10, 12], tags: ['post-workout', 'muscle-gain'] }),
  ...comboRecipes('budget_student', 20, 'Budget etudiant', { proteins: ['oeufs', 'thon', 'lentilles', 'pois chiches', 'poulet'], carbs: ['riz', 'pates', 'pain complet', 'pommes de terre'], prepTimes: [8, 10, 15, 18], tags: ['budget', 'student'] }),
  ...moroccanRecipes(),
].map((recipe, index) => ({ ...recipe, title: recipe.title.replace(/\s+/g, ' ').trim(), sortOrder: index }));

async function seedRecipes(client = prisma) {
  const seen = new Set();
  const recipes = RICH_RECIPE_SEEDS.filter((recipe) => {
    const key = slug(recipe.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  for (const recipe of recipes) {
    const existing = await client.recipe.findFirst({
      where: { title: recipe.title, isPublic: true, createdBy: null },
    });

    const { ingredients, sortOrder, ...data } = recipe;

    if (existing) {
      await client.recipe.update({
        where: { id: existing.id },
        data: {
          ...data,
          ingredients: {
            deleteMany: {},
            create: ingredients,
          },
        },
      });
    } else {
      await client.recipe.create({
        data: {
          ...data,
          ingredients: { create: ingredients },
        },
      });
    }
  }

  const missingRichFields = (await client.recipe.findMany()).filter((recipe) => (
    !recipe.tips || !recipe.alternatives || !recipe.mistakesToAvoid || !recipe.mealPrepAdvice
  ));

  for (const recipe of missingRichFields) {
    await client.recipe.update({
      where: { id: recipe.id },
      data: {
        tips: recipe.tips || [
          'Commence par respecter les quantites, puis ajuste selon ta faim et ton objectif.',
          recipe.proteinG >= 30 ? 'Bonne option riche en proteines pour soutenir la recuperation.' : 'Ajoute une source proteinee si tu veux renforcer cette recette.',
        ],
        alternatives: recipe.alternatives || [
          'Remplace la proteine par poulet, thon, oeufs, dinde, sardines, lentilles ou pois chiches.',
          'Remplace la base par riz, pates, pommes de terre, pain complet, couscous ou semoule.',
        ],
        mistakesToAvoid: recipe.mistakesToAvoid || [
          'Ne chauffe pas trop fort des le debut, surtout avec les oeufs, le poulet ou le thon.',
          'Ne rajoute pas l huile sans mesurer, car les calories montent vite.',
        ],
        mealPrepAdvice: recipe.mealPrepAdvice || [
          'Conserve au refrigerateur 2 a 3 jours dans une boite hermetique.',
          'Prepare les proteines et glucides a l avance, puis ajoute les legumes frais le jour meme.',
        ],
      },
    });
  }

  return recipes.length;
}

if (require.main === module) {
  seedRecipes()
    .then((count) => console.log(`Seeded ${count} recipes.`))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => prisma.$disconnect());
}

module.exports = { RICH_RECIPE_SEEDS, seedRecipes };
