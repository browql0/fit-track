const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const { csrfProtection } = require('./middleware/csrf');

const app = express();

// ─── Middlewares de sécurité ───
app.use(helmet());

// ─── Rate limiting global ───
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Augmenté pour éviter les blocages pendant le développement (hot reload)
  message: { error: 'Trop de requêtes, réessayez plus tard' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// ─── Rate limiting strict pour l'auth ───
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'production' ? 20 : 2000, // Increased for development
  message: { error: 'Trop de tentatives, réessayez dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Middlewares globaux ───
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health check ───
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes API ───
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api', csrfProtection);
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/goal-snapshots', require('./routes/goalSnapshotRoutes'));
app.use('/api/coach', require('./routes/coachRoutes'));
app.use('/api/missions', require('./routes/missionRoutes'));
app.use('/api/foods', require('./routes/foodRoutes'));
app.use('/api/food-entries', require('./routes/foodEntryRoutes'));
app.use('/api/hydration', require('./routes/hydrationRoutes'));
app.use('/api/exercises', require('./routes/exerciseRoutes'));
app.use('/api/workouts', require('./routes/workoutRoutes'));
app.use('/api/weight', require('./routes/weightRoutes'));
app.use('/api/measurements', require('./routes/measurementRoutes'));

// ─── 404 ───
app.use((req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
  });
});

// ─── Error handler (doit être le dernier middleware) ───
app.use(errorHandler);

module.exports = app;
