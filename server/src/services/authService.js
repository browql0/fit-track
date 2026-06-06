const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../config/prismaClient');
const { recordActivity } = require('./activityService');
const { sendVerificationEmail } = require('./emailService');

const SALT_ROUNDS = 12;
const VERIFICATION_TOKEN_BYTES = 32;
const VERIFICATION_TTL_HOURS = 24;
const RESEND_COOLDOWN_MINUTES = 5;

function createError(message, statusCode, errorCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (errorCode) error.errorCode = errorCode;
  return error;
}

function normalizeEmail(email) {
  return String(email || '').toLowerCase().trim();
}

function hashVerificationToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function createVerificationToken() {
  const rawToken = crypto.randomBytes(VERIFICATION_TOKEN_BYTES).toString('hex');

  return {
    rawToken,
    tokenHash: hashVerificationToken(rawToken),
    expiresAt: new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000),
  };
}

async function createAndSendVerificationToken(user) {
  const verification = createVerificationToken();

  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    }),
    prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: verification.tokenHash,
        expiresAt: verification.expiresAt,
      },
    }),
  ]);

  await sendVerificationEmail({
    to: user.email,
    token: verification.rawToken,
    displayName: user.profile?.name,
  });
}

async function register(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    throw createError('Cet email est deja utilise', 409, 'EMAIL_ALREADY_USED');
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
      profile: {
        select: { name: true },
      },
    },
  });

  await createAndSendVerificationToken(user);
  await recordActivity(user.id, 'register');

  const { profile, ...publicUser } = user;
  return { user: publicUser };
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
    throw createError('Email ou mot de passe incorrect', 401, 'INVALID_CREDENTIALS');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw createError('Email ou mot de passe incorrect', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.emailVerified) {
    throw createError(
      'Votre email doit etre verifie avant de vous connecter. Consultez votre boite mail ou demandez un nouveau lien.',
      403,
      'EMAIL_NOT_VERIFIED'
    );
  }

  const token = generateToken(user);
  await recordActivity(user.id, 'login');

  const {
    passwordHash,
    ...userWithoutPrivateFields
  } = user;

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
    throw createError('Utilisateur non trouve', 404, 'USER_NOT_FOUND');
  }

  return user;
}

async function verifyEmail(token) {
  const rawToken = String(token || '').trim();
  if (!rawToken) {
    throw createError('Lien de verification invalide ou expire', 400, 'INVALID_VERIFICATION_TOKEN');
  }

  const tokenHash = hashVerificationToken(rawToken);
  const verification = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          emailVerified: true,
        },
      },
    },
  });

  if (!verification || verification.usedAt || verification.expiresAt <= new Date()) {
    throw createError('Lien de verification invalide ou expire', 400, 'INVALID_VERIFICATION_TOKEN');
  }

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    }),
    prisma.emailVerificationToken.deleteMany({
      where: {
        userId: verification.userId,
        id: { not: verification.id },
        usedAt: null,
      },
    }),
    prisma.user.update({
      where: { id: verification.userId },
      data: {
        emailVerified: true,
      },
    }),
  ]);

  if (!verification.user.emailVerified) {
    await recordActivity(verification.userId, 'email_verified');
  }

  return { message: 'Email confirme avec succes. Vous pouvez maintenant vous connecter.' };
}

async function resendVerification(email) {
  const normalizedEmail = normalizeEmail(email);
  const response = {
    message: 'Si un compte non confirme existe, un nouvel email de verification sera envoye.',
  };

  if (!normalizedEmail) return response;

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      profile: {
        select: { name: true },
      },
      emailVerificationTokens: {
        where: { usedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!user || user.emailVerified) return response;

  const latestToken = user.emailVerificationTokens[0];
  const cooldownDate = new Date(Date.now() - RESEND_COOLDOWN_MINUTES * 60 * 1000);
  if (latestToken && latestToken.createdAt > cooldownDate) {
    return response;
  }

  await createAndSendVerificationToken(user);
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
