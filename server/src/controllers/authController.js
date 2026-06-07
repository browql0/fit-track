const authService = require('../services/authService');
const { clearCsrfToken, issueCsrfToken } = require('../middleware/csrf');
const env = require('../config/env');

const getCookieOptions = () => ({
  httpOnly: true,
  sameSite: env.isProd ? 'none' : 'lax',
  secure: env.isProd,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

const getClearCookieOptions = () => {
  const { maxAge, ...options } = getCookieOptions();
  return options;
};

const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.register(email, password);

    const responseBody = {
      message: env.EMAIL_VERIFICATION_ENABLED
        ? 'Inscription reussie. Verifiez votre email pour activer votre compte.'
        : 'Inscription reussie',
      user: result.user,
    };

    if (result.token) {
      responseBody.csrfToken = issueCsrfToken(res);
      res.cookie('token', result.token, getCookieOptions());
    }

    res.status(201).json(responseBody);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    const csrfToken = issueCsrfToken(res);
    res.cookie('token', result.token, getCookieOptions());
    res.json({
      message: 'Connexion reussie',
      user: result.user,
      csrfToken,
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (_req, res) => {
  res.clearCookie('token', getClearCookieOptions());
  clearCsrfToken(res);
  res.json({ message: 'Deconnexion reussie' });
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    const csrfToken = issueCsrfToken(res);

    res.json({ user, csrfToken });
  } catch (error) {
    if (error.errorCode === 'USER_NOT_FOUND') {
      res.clearCookie('token', getClearCookieOptions());
      clearCsrfToken(res);
      return res.status(401).json({ error: 'Session invalide. Veuillez vous reconnecter.' });
    }

    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const result = await authService.verifyEmail(req.body.email, req.body.code);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const resendCode = async (req, res, next) => {
  try {
    const result = await authService.resendCode(req.body.email);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  verifyEmail,
  resendCode,
};
