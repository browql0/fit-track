const nodemailer = require('nodemailer');
const env = require('../config/env');

const hasSmtpConfig = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

const createTransporter = () => nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

async function sendVerificationEmail({ to, token }) {
  const verifyUrl = `${env.CLIENT_URL.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
  const subject = 'Confirme ton email FitTrack';
  const text = [
    'Bienvenue sur FitTrack.',
    '',
    'Confirme ton email en ouvrant ce lien dans les 24 heures :',
    verifyUrl,
    '',
    'Si tu n as pas cree de compte FitTrack, ignore ce message.',
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h1>Bienvenue sur FitTrack</h1>
      <p>Confirme ton email pour activer ton compte.</p>
      <p>
        <a href="${verifyUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#8cf765;color:#111827;text-decoration:none;font-weight:700;">
          Confirmer mon email
        </a>
      </p>
      <p>Ce lien expire dans 24 heures.</p>
      <p>Si tu n as pas cree de compte FitTrack, ignore ce message.</p>
    </div>
  `;

  if (!hasSmtpConfig) {
    console.warn(`[email] SMTP non configure. Lien de verification pour ${to}: ${verifyUrl}`);
    return { sent: false, previewUrl: verifyUrl };
  }

  await createTransporter().sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    text,
    html,
  });

  return { sent: true };
}

module.exports = {
  sendVerificationEmail,
};
