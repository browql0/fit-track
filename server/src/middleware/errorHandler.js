// ══════════════════════════════════════════════════════════════
// FitTrack — Middleware de gestion centralisée des erreurs
// ══════════════════════════════════════════════════════════════

const env = require('../config/env');

/**
 * Middleware Express de gestion des erreurs.
 * Doit être le dernier middleware monté sur l'app.
 *
 * Formate toutes les erreurs en JSON structuré.
 * En développement, inclut la stack trace.
 */
const errorHandler = (err, req, res, _next) => {
  // Log serveur
  console.error(`❌ [${req.method}] ${req.originalUrl} →`, err.message);
  if (env.isDev) {
    console.error(err.stack);
  }

  // Gestion des erreurs Prisma
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Cette valeur existe déjà (contrainte d\'unicité)',
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Ressource non trouvée',
    });
  }

  // Status HTTP
  const statusCode = err.statusCode || 500;

  // Réponse JSON — ne jamais exposer les détails internes en production
  const response = {
    error: statusCode === 500 && !env.isDev
      ? 'Erreur interne du serveur'
      : err.message || 'Erreur interne du serveur',
    ...(env.isDev && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
