const { Resend } = require('resend');
const env = require('../config/env');

const resend = env.EMAIL_VERIFICATION_ENABLED ? new Resend(env.RESEND_API_KEY) : null;

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatOtp(code) {
  return String(code).replace(/(\d{3})(\d{3})/, '$1 $2');
}

function buildVerificationCodeEmailHtml({ code, displayName }) {
  const name = escapeHtml(displayName || 'athlete');
  const formattedCode = escapeHtml(formatOtp(code));

  return `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <title>Code de verification FitTrack OS</title>
    <style>
      @media only screen and (max-width: 620px) {
        .container { width: 100% !important; padding: 24px 16px !important; }
        .card { padding: 28px 20px !important; }
        .title { font-size: 30px !important; }
        .otp { font-size: 42px !important; letter-spacing: 8px !important; }
      }
    </style>
  </head>
  <body style="margin:0;background:#050808;color:#f4fff9;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Votre code FitTrack OS expire dans 15 minutes.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:radial-gradient(circle at 18% 10%,rgba(0,229,255,.22),transparent 32%),radial-gradient(circle at 86% 20%,rgba(140,247,101,.18),transparent 30%),#050808;">
      <tr>
        <td align="center" class="container" style="padding:42px 20px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" class="card" style="width:600px;max-width:600px;background:linear-gradient(145deg,rgba(255,255,255,.09),rgba(255,255,255,.035));border:1px solid rgba(170,255,226,.18);border-radius:28px;padding:38px;box-shadow:0 28px 90px rgba(0,0,0,.42);">
            <tr>
              <td>
                <div style="width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,#061111,#0b201c);border:1px solid rgba(140,247,101,.28);box-shadow:0 0 28px rgba(0,229,255,.22);display:inline-block;text-align:center;line-height:64px;">
                  <span style="font-size:30px;font-weight:900;color:#8cf765;letter-spacing:0;">F</span>
                </div>
                <p style="margin:24px 0 8px;color:#8cf765;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;">FitTrack OS</p>
                <h1 class="title" style="margin:0;color:#f4fff9;font-size:40px;line-height:1.04;font-weight:900;letter-spacing:0;">Bienvenue, ${name}</h1>
                <p style="margin:18px 0 0;color:#b8c8c7;font-size:17px;line-height:1.7;">
                  Entrez ce code dans FitTrack OS pour activer votre compte et lancer votre coaching IA.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:34px 0 30px;">
                <div class="otp" style="display:inline-block;padding:22px 26px;border-radius:20px;background:linear-gradient(135deg,rgba(140,247,101,.16),rgba(0,229,255,.12));border:1px solid rgba(140,247,101,.32);box-shadow:0 0 34px rgba(0,229,255,.24),0 0 52px rgba(140,247,101,.14);color:#f7fff9;font-size:54px;font-weight:900;letter-spacing:12px;line-height:1;font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;">
                  ${formattedCode}
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08);padding:18px 0;">
                  <tr>
                    <td style="padding:18px 0;color:#dfffee;font-size:14px;line-height:1.7;">
                      <strong style="color:#8cf765;">Code valable 15 minutes.</strong><br>
                      Pour votre securite, ne partagez jamais ce code. FitTrack OS ne vous le demandera que dans l'ecran de verification.
                    </td>
                  </tr>
                </table>
                <p style="margin:22px 0 0;color:#7f9491;font-size:13px;line-height:1.6;">
                  Si vous n'avez pas cree de compte FitTrack OS, ignorez cet email. Aucune action ne sera effectuee.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendVerificationCodeEmail({ to, code, displayName }) {
  if (!env.EMAIL_VERIFICATION_ENABLED) {
    return { sent: false, disabled: true };
  }

  const subject = 'Votre code FitTrack OS';
  const text = [
    `Bienvenue ${displayName || 'sur FitTrack OS'}.`,
    '',
    `Votre code de verification : ${formatOtp(code)}`,
    '',
    'Ce code expire dans 15 minutes.',
    'Si vous n avez pas cree de compte FitTrack OS, ignorez ce message.',
  ].join('\n');

  const { data, error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: [to],
    subject,
    html: buildVerificationCodeEmailHtml({ code, displayName }),
    text,
  });

  if (error) {
    const sendError = new Error(error.message || 'Impossible d envoyer le code de verification');
    sendError.statusCode = 502;
    sendError.details = error;
    throw sendError;
  }

  return { sent: true, id: data?.id };
}

module.exports = {
  sendVerificationCodeEmail,
};
