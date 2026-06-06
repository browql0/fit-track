const DAY_MS = 24 * 60 * 60 * 1000;

function toDateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function todayKey() {
  return toDateKey(new Date());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfUtcDay(date = new Date()) {
  const key = toDateKey(date);
  return new Date(`${key}T00:00:00.000Z`);
}

function daysBetween(from, to) {
  return Math.max(1, Math.round((startOfUtcDay(to) - startOfUtcDay(from)) / DAY_MS));
}

function buildDateWindow(days = 30) {
  const end = startOfUtcDay(new Date());
  const start = addDays(end, -(days - 1));
  return { start, end, startKey: toDateKey(start), endKey: toDateKey(end) };
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(Number(value || 0) * factor) / factor;
}

function percent(value, target) {
  if (!target || target <= 0) return 0;
  return clamp(Math.round((Number(value || 0) / Number(target)) * 100), 0, 140);
}

function scoreRange(value, idealMin, idealMax, hardMin, hardMax) {
  if (value >= idealMin && value <= idealMax) return 100;
  if (value < idealMin) {
    return clamp(Math.round(((value - hardMin) / (idealMin - hardMin)) * 100), 0, 100);
  }
  return clamp(Math.round(((hardMax - value) / (hardMax - idealMax)) * 100), 0, 100);
}

function average(numbers) {
  const values = numbers.filter((value) => Number.isFinite(Number(value)));
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + Number(value), 0) / values.length;
}

function sum(numbers) {
  return numbers.reduce((total, value) => total + Number(value || 0), 0);
}

function groupByDate(items, dateField) {
  return items.reduce((map, item) => {
    const key = toDateKey(item[dateField]);
    if (!map[key]) map[key] = [];
    map[key].push(item);
    return map;
  }, {});
}

function macroTotals(entries) {
  return entries.reduce((totals, entry) => {
    const ratio = Number(entry.quantityG || 0) / 100;
    const food = entry.food || {};
    totals.calories += Number(food.caloriesPer100g || 0) * ratio;
    totals.protein += Number(food.proteinPer100g || 0) * ratio;
    totals.carbs += Number(food.carbsPer100g || 0) * ratio;
    totals.fat += Number(food.fatPer100g || 0) * ratio;
    return totals;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

function makeInsight({ id, category, priority = 2, tone = 'info', title, message, action, metric }) {
  return { id, category, priority, tone, title, message, action, metric };
}

function makeMission({ id, title, detail, category, xp, scoreBonus, done = false, progress = 0, target = 100, route }) {
  return {
    id,
    title,
    detail,
    category,
    xp,
    scoreBonus,
    done,
    progress: clamp(Math.round(progress), 0, target),
    target,
    route,
  };
}

module.exports = {
  average,
  buildDateWindow,
  clamp,
  daysBetween,
  groupByDate,
  macroTotals,
  makeInsight,
  makeMission,
  percent,
  round,
  scoreRange,
  sum,
  todayKey,
  toDateKey,
};
