const prisma = require('../config/prismaClient');
const { parseDateOnly } = require('../utils/dateUtils');
const { invalidateCoachCache } = require('./coachSnapshotService');

const FOOD_CATEGORIES = ['protein', 'grain', 'vegetable', 'fruit', 'dairy', 'fat', 'other', 'scanned'];

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, Number(value || 0)));
const roundMacro = (value) => Math.round(clampNumber(value, 0, 100) * 10) / 10;
const roundCalories = (value) => Math.round(clampNumber(value, 0, 1000));
const roundOptionalMacro = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(clampNumber(number, 0, 1000) * 10) / 10;
};

function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function createCodedError(message, statusCode, errorCode) {
  const err = createError(message, statusCode);
  err.errorCode = errorCode;
  return err;
}

function normalizeFoodPayload(data) {
  return {
    name: String(data.name || '').trim(),
    caloriesPer100g: roundCalories(data.caloriesPer100g),
    proteinPer100g: roundMacro(data.proteinPer100g),
    carbsPer100g: roundMacro(data.carbsPer100g),
    fatPer100g: roundMacro(data.fatPer100g),
    category: FOOD_CATEGORIES.includes(data.category) ? data.category : 'other',
  };
}

async function searchFoods(userId, searchStr = '', category = null) {
  const whereClause = {
    AND: [
      {
        OR: [
          { isPublic: true },
          { createdBy: userId },
        ],
      },
    ],
  };

  if (searchStr) {
    whereClause.AND.push({
      name: { contains: searchStr, mode: 'insensitive' },
    });
  }

  if (category) {
    whereClause.AND.push({ category });
  }

  return prisma.food.findMany({
    where: whereClause,
    orderBy: { name: 'asc' },
    take: 50,
  });
}

async function getFoodById(userId, foodId) {
  const food = await prisma.food.findUnique({
    where: { id: foodId },
  });

  if (!food) throw createError('Aliment non trouve', 404);

  if (!food.isPublic && food.createdBy !== userId) {
    throw createError('Acces non autorise a cet aliment', 403);
  }

  return food;
}

async function createCustomFood(userId, data) {
  const food = normalizeFoodPayload(data);
  if (!food.name) throw createError('Le nom est requis', 400);

  return prisma.food.create({
    data: {
      ...food,
      createdBy: userId,
      isPublic: false,
    },
  });
}

function inferCategoryFromText(text) {
  const normalized = String(text || '').toLowerCase();
  const match = ESTIMATE_LIBRARY.find((item) => item.keys.some((key) => normalized.includes(key)));
  return match?.category || 'other';
}

function mapOpenFoodFactsProduct(product) {
  const nutriments = product.nutriments || {};
  const name = product.product_name || product.product_name_fr || product.product_name_en;
  const calories = nutriments['energy-kcal_100g'] ?? (nutriments.energy_100g ? nutriments.energy_100g / 4.184 : null);
  const protein = nutriments.proteins_100g;
  const carbs = nutriments.carbohydrates_100g;
  const fat = nutriments.fat_100g;

  if (!name || calories === null || protein === undefined || carbs === undefined || fat === undefined) {
    return null;
  }

  return normalizeFoodPayload({
    name: product.brands ? `${name} (${product.brands})` : name,
    caloriesPer100g: calories,
    proteinPer100g: protein,
    carbsPer100g: carbs,
    fatPer100g: fat,
    category: inferCategoryFromText(`${name} ${product.categories || ''}`),
  });
}

function normalizeBarcode(value) {
  return String(value || '').trim().replace(/\D/g, '');
}

function mapOpenFoodFactsBarcodeProduct(product, barcode) {
  const nutriments = product.nutriments || {};
  const name = product.product_name || product.product_name_fr || product.product_name_en;
  const calories = nutriments['energy-kcal_100g'] ?? (nutriments.energy_100g ? nutriments.energy_100g / 4.184 : null);
  const protein = nutriments.proteins_100g;
  const carbs = nutriments.carbohydrates_100g;
  const fat = nutriments.fat_100g;
  const nutriScore = String(product.nutriscore_grade || '').trim().toUpperCase();

  if (!name || calories === null || protein === undefined || carbs === undefined || fat === undefined) {
    return null;
  }

  return {
    ...normalizeFoodPayload({
      name,
      caloriesPer100g: calories,
      proteinPer100g: protein,
      carbsPer100g: carbs,
      fatPer100g: fat,
      category: 'scanned',
    }),
    barcode,
    brand: product.brands ? String(product.brands).slice(0, 255) : null,
    imageUrl: product.image_url || null,
    source: 'openfoodfacts',
    nutriScore: ['A', 'B', 'C', 'D', 'E'].includes(nutriScore) ? nutriScore : null,
    sugarsPer100g: roundOptionalMacro(nutriments.sugars_100g),
    saturatedFatPer100g: roundOptionalMacro(nutriments['saturated-fat_100g']),
    fiberPer100g: roundOptionalMacro(nutriments.fiber_100g),
    saltPer100g: roundOptionalMacro(nutriments.salt_100g),
    sodiumPer100g: roundOptionalMacro(nutriments.sodium_100g),
  };
}

function hasNutritionDetails(food) {
  return Boolean(
    food?.nutriScore
    || food?.sugarsPer100g != null
    || food?.saturatedFatPer100g != null
    || food?.fiberPer100g != null
    || food?.saltPer100g != null
    || food?.sodiumPer100g != null
  );
}

async function fetchOpenFoodFactsBarcode(barcode) {
  const url = new URL(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
  url.searchParams.set('fields', 'status,product_name,product_name_fr,product_name_en,brands,image_url,nutriscore_grade,nutriments');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  let response;

  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FitTrack/1.0 (contact: dev@fittrack.local)',
      },
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw createError('Recherche produit trop lente', 502);
    }
    throw createError('Recherche produit indisponible', 502);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw createError('Recherche produit indisponible', 502);
  }

  return response.json();
}

async function getFoodByBarcode(barcodeValue) {
  const barcode = normalizeBarcode(barcodeValue);
  if (!barcode || barcode.length < 6 || barcode.length > 32) {
    throw createCodedError('Code-barres invalide', 400, 'INVALID_BARCODE');
  }

  const existing = await prisma.food.findUnique({
    where: { barcode },
  });

  if (existing && hasNutritionDetails(existing)) return existing;

  const payload = await fetchOpenFoodFactsBarcode(barcode);
  if (payload.status !== 1 || !payload.product) {
    if (existing) return existing;
    throw createCodedError('Produit introuvable', 404, 'PRODUCT_NOT_FOUND');
  }

  const food = mapOpenFoodFactsBarcodeProduct(payload.product, barcode);
  if (!food) {
    if (existing) return existing;
    throw createCodedError('Produit introuvable ou nutrition incomplete', 404, 'PRODUCT_NOT_FOUND');
  }

  if (existing) {
    return prisma.food.update({
      where: { id: existing.id },
      data: food,
    });
  }

  return prisma.food.create({
    data: {
      ...food,
      createdBy: null,
      isPublic: true,
    },
  });
}

async function externalSearchAndImport(userId, searchStr = '') {
  const query = String(searchStr || '').trim();
  if (query.length < 2) return [];

  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
  url.searchParams.set('search_terms', query);
  url.searchParams.set('search_simple', '1');
  url.searchParams.set('action', 'process');
  url.searchParams.set('json', '1');
  url.searchParams.set('page_size', '8');
  url.searchParams.set('fields', 'product_name,product_name_fr,product_name_en,brands,categories,nutriments');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  let response;

  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FitTrack/1.0 (contact: dev@fittrack.local)',
      },
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw createError('Recherche externe trop lente', 502);
    }
    throw createError('Recherche externe indisponible', 502);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw createError('Recherche externe indisponible', 502);
  }

  const payload = await response.json();
  const candidates = (payload.products || []).map(mapOpenFoodFactsProduct).filter(Boolean);
  const imported = [];

  for (const candidate of candidates) {
    const existing = await prisma.food.findFirst({
      where: {
        createdBy: userId,
        name: candidate.name,
      },
    });

    const food = existing || await prisma.food.create({
      data: {
        ...candidate,
        createdBy: userId,
        isPublic: false,
      },
    });

    imported.push({ ...food, source: 'openfoodfacts' });
  }

  return imported;
}

const ESTIMATE_LIBRARY = [
  { keys: ['poulet', 'chicken'], calories: 165, protein: 28, carbs: 0, fat: 5, category: 'protein' },
  { keys: ['thon', 'tuna'], calories: 135, protein: 26, carbs: 0, fat: 3, category: 'protein' },
  { keys: ['kefta', 'viande hachee', 'viande hachée', 'steak'], calories: 230, protein: 20, carbs: 2, fat: 16, category: 'protein' },
  { keys: ['oeuf', 'omelette'], calories: 155, protein: 13, carbs: 1, fat: 11, category: 'protein' },
  { keys: ['riz'], calories: 130, protein: 3, carbs: 28, fat: 0.3, category: 'grain' },
  { keys: ['pomme de terre', 'patate'], calories: 88, protein: 2, carbs: 20, fat: 0.2, category: 'grain' },
  { keys: ['pain', 'sandwich'], calories: 260, protein: 9, carbs: 48, fat: 4, category: 'grain' },
  { keys: ['mayo', 'mayonnaise'], calories: 680, protein: 1, carbs: 1, fat: 75, category: 'fat' },
  { keys: ['huile', 'olive'], calories: 884, protein: 0, carbs: 0, fat: 100, category: 'fat' },
  { keys: ['tajine', 'couscous'], calories: 155, protein: 9, carbs: 17, fat: 6, category: 'other' },
  { keys: ['fromage'], calories: 310, protein: 22, carbs: 3, fat: 24, category: 'dairy' },
  { keys: ['yaourt', 'skyr'], calories: 65, protein: 9, carbs: 5, fat: 1, category: 'dairy' },
  { keys: ['salade', 'legume', 'légume'], calories: 35, protein: 2, carbs: 6, fat: 0.5, category: 'vegetable' },
];

function estimateFood(description = '') {
  const text = String(description || '').toLowerCase().trim();
  if (text.length < 2) {
    throw createError('Description trop courte', 400);
  }

  const matches = ESTIMATE_LIBRARY.filter((item) => item.keys.some((key) => text.includes(key)));
  const selected = matches.length ? matches : [ESTIMATE_LIBRARY[ESTIMATE_LIBRARY.length - 1]];
  const divisor = selected.length;
  const weightMatch = text.match(/(\d{2,4})\s?g/);

  return {
    ...normalizeFoodPayload({
      name: description.trim(),
      caloriesPer100g: selected.reduce((sum, item) => sum + item.calories, 0) / divisor,
      proteinPer100g: selected.reduce((sum, item) => sum + item.protein, 0) / divisor,
      carbsPer100g: selected.reduce((sum, item) => sum + item.carbs, 0) / divisor,
      fatPer100g: selected.reduce((sum, item) => sum + item.fat, 0) / divisor,
      category: selected[0]?.category || 'other',
    }),
    approximate: true,
    confidence: matches.length >= 2 ? 'medium' : matches.length === 1 ? 'low' : 'very_low',
    suggestedQuantityG: weightMatch ? Number(weightMatch[1]) : 100,
    note: 'Estimation approximative basee sur des aliments similaires. Verifie les valeurs avant validation.',
  };
}

async function getFoodEntriesByDate(userId, dateStr) {
  const targetDate = parseDateOnly(dateStr, 'date');

  return prisma.foodEntry.findMany({
    where: {
      userId,
      entryDate: targetDate,
    },
    include: {
      food: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}

async function addFoodEntry(userId, data) {
  await getFoodById(userId, data.foodId);

  const created = await prisma.foodEntry.create({
    data: {
      userId,
      foodId: data.foodId,
      quantityG: data.quantityG,
      mealType: data.mealType,
      entryDate: parseDateOnly(data.entryDate, 'entryDate'),
    },
    include: {
      food: true,
    },
  });
  await invalidateCoachCache(userId);
  return created;
}

async function updateFoodEntry(userId, entryId, data) {
  const entry = await prisma.foodEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.userId !== userId) {
    throw createError('Entree non trouvee ou non autorisee', 404);
  }

  const updated = await prisma.foodEntry.update({
    where: { id: entryId },
    data: {
      quantityG: data.quantityG !== undefined ? data.quantityG : entry.quantityG,
      mealType: data.mealType !== undefined ? data.mealType : entry.mealType,
    },
    include: {
      food: true,
    },
  });
  await invalidateCoachCache(userId);
  return updated;
}

async function deleteFoodEntry(userId, entryId) {
  const entry = await prisma.foodEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.userId !== userId) {
    throw createError('Entree non trouvee ou non autorisee', 404);
  }

  await prisma.foodEntry.delete({ where: { id: entryId } });
  await invalidateCoachCache(userId);
  return { success: true };
}

async function getDailySummary(userId, dateStr) {
  const entries = await getFoodEntriesByDate(userId, dateStr);
  const summary = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  entries.forEach((entry) => {
    const ratio = entry.quantityG / 100;
    summary.calories += entry.food.caloriesPer100g * ratio;
    summary.protein += entry.food.proteinPer100g * ratio;
    summary.carbs += entry.food.carbsPer100g * ratio;
    summary.fat += entry.food.fatPer100g * ratio;
  });

  return {
    calories: Math.round(summary.calories),
    protein: Math.round(summary.protein),
    carbs: Math.round(summary.carbs),
    fat: Math.round(summary.fat),
  };
}

module.exports = {
  searchFoods,
  getFoodById,
  getFoodByBarcode,
  createCustomFood,
  externalSearchAndImport,
  estimateFood,
  getFoodEntriesByDate,
  addFoodEntry,
  updateFoodEntry,
  deleteFoodEntry,
  getDailySummary,
};
