const dotenv = require('dotenv');
const path = require('path');

// Charger .env depuis la racine du serveur
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const emailVerificationEnabled = process.env.EMAIL_VERIFICATION_ENABLED === 'true';

// Variables requises
const requiredVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'CLIENT_URL',
];

if (emailVerificationEnabled) {
  requiredVars.push('RESEND_API_KEY', 'EMAIL_FROM');
}

// Validation
const missing = requiredVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`\n Variables d'environnement manquantes :`);
  missing.forEach((key) => console.error(`   → ${key}`));
  console.error(`\n Copiez .env.example en .env et remplissez les valeurs.\n`);
  process.exit(1);
}

const env = {
  // Serveur
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'production',

  // Base de données
  DATABASE_URL: process.env.DATABASE_URL,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // CORS + liens transactionnels
  CLIENT_URL: process.env.CLIENT_URL,

  // Email transactionnel
  EMAIL_VERIFICATION_ENABLED: emailVerificationEnabled,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,

  // Helpers
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
};

module.exports = env;
