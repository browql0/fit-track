const crypto = require('crypto');

const CSRF_COOKIE = 'csrfToken';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const getCookieValue = (cookieHeader, name) => {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const cookie = cookies.find((item) => item.startsWith(`${name}=`));
  if (!cookie) return null;

  return decodeURIComponent(cookie.slice(name.length + 1));
};

const createCsrfToken = () => crypto.randomBytes(32).toString('hex');

const csrfCookieOptions = () => ({
  httpOnly: false,
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

const issueCsrfToken = (res) => {
  const token = createCsrfToken();
  res.cookie(CSRF_COOKIE, token, csrfCookieOptions());
  return token;
};

const clearCsrfToken = (res) => {
  res.clearCookie(CSRF_COOKIE, csrfCookieOptions());
};

const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = getCookieValue(req.headers.cookie, CSRF_COOKIE);
  const headerToken = req.headers[CSRF_HEADER];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'Protection CSRF invalide' });
  }

  next();
};

module.exports = {
  clearCsrfToken,
  csrfProtection,
  issueCsrfToken,
};
