const authService = require('../services/authService');
const { clearCsrfToken, issueCsrfToken } = require('../middleware/csrf');

const getCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.register(email, password);

    res.status(201).json({
      message: 'Inscription reussie. Verifiez votre email pour activer votre compte.',
      user: result.user,
    });
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
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  clearCsrfToken(res);
  res.json({ message: 'Deconnexion reussie' });
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    const csrfToken = issueCsrfToken(res);

    res.json({ user, csrfToken });
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const result = await authService.verifyEmail(req.query.token);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const resendVerification = async (req, res, next) => {
  try {
    const result = await authService.resendVerification(req.body.email);
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
  resendVerification,
};
