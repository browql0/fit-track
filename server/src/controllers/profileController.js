// ══════════════════════════════════════════════════════════════
// FitTrack — Contrôleur du Profil
// ══════════════════════════════════════════════════════════════

const profileService = require('../services/profileService');

/**
 * GET /api/profile
 * Récupère le profil de l'utilisateur connecté et ses objectifs actuels.
 */
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await profileService.getProfile(userId);

    if (!data) {
      return res.status(404).json({ error: 'Profil non trouvé' });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/profile
 * Crée le profil de l'utilisateur connecté.
 */
const createProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await profileService.createProfile(userId, req.body);

    res.status(201).json({
      message: 'Profil créé avec succès',
      profile: data.profile,
      targets: data.targets,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/profile
 * Met à jour le profil de l'utilisateur connecté.
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = await profileService.updateProfile(userId, req.body);

    res.json({
      message: 'Profil mis à jour avec succès',
      profile: data.profile,
      targets: data.targets,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  createProfile,
  updateProfile,
};
