const hydrationService = require('../services/hydrationService');

function parseId(value) {
  const id = parseInt(value, 10);
  if (Number.isNaN(id) || id < 1) {
    const error = new Error('ID invalide');
    error.statusCode = 400;
    throw error;
  }
  return id;
}

const getHydrationEntries = async (req, res, next) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
    const entries = await hydrationService.getHydrationEntries(req.user.id, dateStr);
    res.json(entries);
  } catch (error) {
    next(error);
  }
};

const getHydrationSummary = async (req, res, next) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
    const summary = await hydrationService.getHydrationSummary(req.user.id, dateStr);
    res.json(summary);
  } catch (error) {
    next(error);
  }
};

const addHydrationEntry = async (req, res, next) => {
  try {
    const entry = await hydrationService.addHydrationEntry(req.user.id, req.body);
    res.status(201).json({ message: 'Hydratation ajoutee', entry });
  } catch (error) {
    next(error);
  }
};

const deleteHydrationEntry = async (req, res, next) => {
  try {
    await hydrationService.deleteHydrationEntry(req.user.id, parseId(req.params.id));
    res.json({ message: 'Entree hydratation supprimee' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHydrationEntries,
  getHydrationSummary,
  addHydrationEntry,
  deleteHydrationEntry,
};
