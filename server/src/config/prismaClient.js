// ══════════════════════════════════════════════════════════════
// FitTrack — Singleton PrismaClient
// ══════════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
