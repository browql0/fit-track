const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../config/prismaClient');
const { recordActivity } = require('./activityService');
const { sendVerificationCodeEmail } = require('./emailService');

const SALT_ROUNDS = 12;
const OTP_TTL_MINUTES = 15;
const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const RESEND_CODE_MESSAGE = 'Si ce compte existe, un code de verification a ete envoye.';
const EMAIL_VERIFICATION_DISABLED_RESPONSE = {
  success: true,
  message: 'Email verification temporarily disabled',
};

function createError(message, statusCode, errorCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (errorCode) error.errorCode = errorCode;
  return error;
}

function normalizeEmail(email) {
  return String(email || '').toLowerCase().trim();
}

function normalizeCode(code) {
  return String(code || '').replace(/\D/g, '').slice(0, 6);
}

function createVerificationCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function hashVerificationCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function isSameHash(a, b) {
  const left = Buffer.from(String(a || ''), 'hex');
  const right = Buffer.from(String(b || ''), 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

async function createAndSendVerificationCode(user) {
  const code = createVerificationCode();
  const codeHash = hashVerificationCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.$transaction([
    prisma.emailVerificationCode.deleteMany({
      where: { userId: user.id },
    }),
    prisma.emailVerificationCode.create({
      data: {
        userId: user.id,
        code: codeHash,
        expiresAt,
      },
    }),
  ]);

  await sendVerificationCodeEmail({
    to: user.email,
    code,
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
      emailVerified: !env.EMAIL_VERIFICATION_ENABLED,
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

  if (env.EMAIL_VERIFICATION_ENABLED) {
    await createAndSendVerificationCode(user);
  }

  await recordActivity(user.id, 'register');

  const { profile, ...publicUser } = user;
  const token = env.EMAIL_VERIFICATION_ENABLED ? null : generateToken(user);
  return { user: publicUser, token };
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

  if (env.EMAIL_VERIFICATION_ENABLED && !user.emailVerified) {
    throw createError(
      'Votre email doit etre verifie avant de vous connecter. Entrez le code recu par email ou demandez un nouveau code.',
      403,
      'EMAIL_NOT_VERIFIED'
    );
  }

  const token = generateToken(user);
  await recordActivity(user.id, 'login');

  const { passwordHash, ...userWithoutPrivateFields } = user;
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

async function verifyEmail(email, code) {
  if (!env.EMAIL_VERIFICATION_ENABLED) {
    return EMAIL_VERIFICATION_DISABLED_RESPONSE;
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = normalizeCode(code);

  if (!normalizedEmail || normalizedCode.length !== 6) {
    throw createError('Code de verification invalide', 400, 'INVALID_VERIFICATION_CODE');
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      emailVerificationCode: true,
    },
  });

  if (!user || user.emailVerified) {
    throw createError('Code de verification invalide ou expire', 400, 'INVALID_VERIFICATION_CODE');
  }

  const verification = user.emailVerificationCode;
  if (!verification || verification.expiresAt <= new Date()) {
    if (verification) {
      await prisma.emailVerificationCode.delete({ where: { id: verification.id } });
    }
    throw createError('Code de verification invalide ou expire', 400, 'INVALID_VERIFICATION_CODE');
  }

  if (verification.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.emailVerificationCode.delete({ where: { id: verification.id } });
    throw createError('Trop de tentatives. Demandez un nouveau code.', 429, 'OTP_ATTEMPTS_EXCEEDED');
  }

  const codeHash = hashVerificationCode(normalizedCode);
  if (!isSameHash(codeHash, verification.code)) {
    if (verification.attempts + 1 >= OTP_MAX_ATTEMPTS) {
      await prisma.emailVerificationCode.delete({ where: { id: verification.id } });
      throw createError('Trop de tentatives. Demandez un nouveau code.', 429, 'OTP_ATTEMPTS_EXCEEDED');
    }

    await prisma.emailVerificationCode.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 } },
    });
    throw createError('Code de verification invalide ou expire', 400, 'INVALID_VERIFICATION_CODE');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    }),
    prisma.emailVerificationCode.delete({
      where: { id: verification.id },
    }),
  ]);

  await recordActivity(user.id, 'email_verified');

  return { message: 'Email confirme avec succes. Vous pouvez maintenant vous connecter.' };
}

async function resendCode(email) {
  if (!env.EMAIL_VERIFICATION_ENABLED) {
    return EMAIL_VERIFICATION_DISABLED_RESPONSE;
  }

  const normalizedEmail = normalizeEmail(email);
  const response = { message: RESEND_CODE_MESSAGE };

  if (!normalizedEmail) return response;

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      profile: {
        select: { name: true },
      },
      emailVerificationCode: true,
    },
  });

  if (!user || user.emailVerified) return response;

  const latestCode = user.emailVerificationCode;
  const cooldownDate = new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000);
  if (latestCode && latestCode.createdAt > cooldownDate) {
    return response;
  }

  try {
    await createAndSendVerificationCode(user);
  } catch (error) {
    console.error('[auth] Failed to resend verification code:', error.message);
  }

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
  resendCode,
};
