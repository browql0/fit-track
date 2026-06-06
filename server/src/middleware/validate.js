// ══════════════════════════════════════════════════════════════
// FitTrack — Middleware de validation (express-validator)
// ══════════════════════════════════════════════════════════════

const { validationResult } = require('express-validator');

/**
 * Middleware qui vérifie les résultats de validation.
 * Si des erreurs existent, renvoie 400 avec la liste des erreurs.
 * Sinon, passe au middleware suivant.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return res.status(400).json({
      error: 'Données invalides',
      details: formattedErrors,
    });
  }

  next();
};

module.exports = validate;
