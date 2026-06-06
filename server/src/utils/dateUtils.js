function createValidationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function parseDateOnly(value, fieldName = 'date') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createValidationError(`${fieldName} invalide`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw createValidationError(`${fieldName} invalide`);
  }

  return date;
}

function parsePositiveLimit(value, fallback = 30, max = 100) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), max);
}

module.exports = {
  parseDateOnly,
  parsePositiveLimit,
};
