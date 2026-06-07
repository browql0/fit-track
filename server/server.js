const app = require('./src/app');
app.set('trust proxy', 1);
const env = require('./src/config/env');
const prisma = require('./src/config/prismaClient');

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  console.log(`\n🚀 FitTrack API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 Client URL: ${env.CLIENT_URL}\n`);
});

// ─── Arrêt gracieux ───
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Signal ${signal} reçu. Arrêt gracieux...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });

  // Force exit après 10 secondes
  setTimeout(() => {
    console.error('⚠️ Arrêt forcé après timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
