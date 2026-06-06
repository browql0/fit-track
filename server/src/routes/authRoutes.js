const express = require('express');
const { body, query } = require('express-validator');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

router.post(
  '/register',
  [
    body('email')
      .isEmail()
      .withMessage('Email invalide')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Le mot de passe doit contenir entre 8 et 128 caracteres'),
  ],
  validate,
  authController.register
);

router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Email invalide')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Mot de passe requis'),
  ],
  validate,
  authController.login
);

router.get(
  '/verify-email',
  [
    query('token')
      .isLength({ min: 64, max: 128 })
      .withMessage('Token de verification invalide'),
  ],
  validate,
  authController.verifyEmail
);

router.post(
  '/resend-verification',
  [
    body('email')
      .isEmail()
      .withMessage('Email invalide')
      .normalizeEmail(),
  ],
  validate,
  authController.resendVerification
);

router.get('/me', auth, authController.getMe);
router.post('/logout', authController.logout);

module.exports = router;
