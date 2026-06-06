const jwt = require('jsonwebtoken');
const env = require('../config/env');

const getCookieValue = (cookieHeader, name) => {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const cookie = cookies.find((item) => item.startsWith(`${name}=`));
  if (!cookie) return null;

  return decodeURIComponent(cookie.slice(name.length + 1));
};

const getRequestToken = (req) => {
  return getCookieValue(req.headers.cookie, 'token');
};

const auth = (req, res, next) => {
  try {
    const token = getRequestToken(req);

    if (!token) {
      return res.status(401).json({
        error: 'Acces non autorise - token manquant',
      });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expire - veuillez vous reconnecter',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token invalide',
      });
    }

    return res.status(401).json({
      error: 'Authentification echouee',
    });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Acces non autorise - token manquant',
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      error: 'Acces reserve aux administrateurs',
    });
  }

  next();
};

module.exports = { auth, adminOnly };
