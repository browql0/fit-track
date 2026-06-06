const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../config/prismaClient');
const { recordActivity } = require('./activityService');
const { sendVerificationEmail } = require('./emailService');

const SALT_ROUNDS = 12;
const VERIFICATION_TTL_HOURS = 24;
const RESEND_COOLDOWN_MINUTES = 5;

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeEmail(email) {
  return String(email || '').toLowerCase().trim();
}

function hashVerificationToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function createVerificationToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  return {
    rawToken,
    hashedToken: hashVerificationToken(rawToken),
    expires: new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000),
  };
}

async function issueVerificationEmail(user) {
  const verification = createVerificationToken();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: verification.hashedToken,
      emailVerificationExpires: verification.expires,
    },
  });

  await sendVerificationEmail({
    to: user.email,
    token: verification.rawToken,
  });
}

async function register(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    throw createError('Cet email est deja utilise', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      emailVerified: false,
    },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      role: true,
      createdAt: true,
    },
  });

  await issueVerificationEmail(user);
  await recordActivity(user.id, 'register');

  return { user };
}

async function login(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      profile: true,
    },
  });

  if (!user) {
    throw createError('Email ou mot de passe incorrect', 401);
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw createError('Email ou mot de passe incorrect', 401);
  }

  if (!user.emailVerified) {
    throw createError('Veuillez confirmer votre email avant de vous connecter.', 403);
  }

  const token = generateToken(user);
  await recordActivity(user.id, 'login');

  const { passwordHash, emailVerificationToken, emailVerificationExpires, ...userWithoutPrivateFields } = user;
  return { user: userWithoutPrivateFields, token };
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      role: true,
      createdAt: true,
      profile: true,
    },
  });

  if (!user) {
    throw createError('Utilisateur non trouve', 404);
  }

  return user;
}

async function verifyEmail(token) {
  const rawToken = String(token || '').trim();
  if (!rawToken) {
    throw createError('Lien de verification invalide ou expire', 400);
  }

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: hashVerificationToken(rawToken),
      emailVerificationExpires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw createError('Lien de verification invalide ou expire', 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
  });

  await recordActivity(user.id, 'email_verified');
  return { message: 'Email confirme avec succes' };
}

async function resendVerification(email) {
  const normalizedEmail = normalizeEmail(email);
  const response = {
    message: 'Si un compte non confirme existe, un email de confirmation sera envoye.',
  };

  if (!normalizedEmail) return response;

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || user.emailVerified) return response;

  const cooldownThreshold = new Date(Date.now() + (VERIFICATION_TTL_HOURS * 60 - RESEND_COOLDOWN_MINUTES) * 60 * 1000);
  if (user.emailVerificationExpires && user.emailVerificationExpires > cooldownThreshold) {
    return response;
  }

  await issueVerificationEmail(user);
  return response;
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN, algorithm: 'HS256' }
  );
}

module.exports = {
  register,
  login,
  getMe,
  verifyEmail,
  resendVerification,
};
