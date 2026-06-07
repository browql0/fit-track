const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const authController = require('../controllers/authController');
const env = require('../config/env');

const router = express.Router();
const verificationDisabledResponse = (_req, res) => res.json({
  success: true,
  message: 'Email verification temporarily disabled',
});

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

router.post(
  '/verify-email',
  ...(env.EMAIL_VERIFICATION_ENABLED ? [
  [
    body('email')
      .isEmail()
      .withMessage('Email invalide')
      .normalizeEmail(),
    body('code')
      .matches(/^\d{6}$/)
      .withMessage('Code de verification invalide'),
  ],
  validate,
  authController.verifyEmail,
  ] : [verificationDisabledResponse])
);

router.post(
  '/resend-code',
  ...(env.EMAIL_VERIFICATION_ENABLED ? [
  [
    body('email')
      .isEmail()
      .withMessage('Email invalide')
      .normalizeEmail(),
  ],
  validate,
  authController.resendCode,
  ] : [verificationDisabledResponse])
);

router.get('/me', auth, authController.getMe);
router.post('/logout', authController.logout);

module.exports = router;
