const { Resend } = require('resend');
const env = require('../config/env');

const resend = new Resend(env.RESEND_API_KEY);

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildVerificationUrl(token) {
  const clientUrl = env.CLIENT_URL.replace(/\/$/, '');
  return `${clientUrl}/verify-email?token=${encodeURIComponent(token)}`;
}

function buildVerificationEmailHtml({ verifyUrl, displayName }) {
  const name = escapeHtml(displayName || 'athlete');

  return `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <title>Verifier votre email FitTrack OS</title>
    <style>
      @media only screen and (max-width: 620px) {
        .container { width: 100% !important; padding: 24px 16px !important; }
        .card { padding: 28px 20px !important; }
        .title { font-size: 30px !important; }
        .cta { width: 100% !important; box-sizing: border-box !important; }
      }
      .cta:hover {
        box-shadow: 0 0 32px rgba(0, 229, 255, 0.42), 0 0 48px rgba(140, 247, 101, 0.24) !important;
        transform: translateY(-1px);
      }
    </style>
  </head>
  <body style="margin:0;background:#050808;color:#f4fff9;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Active votre compte FitTrack OS. Ce lien expire dans 24 heures.
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
                  Votre cockpit de performance est pret. Confirmez votre email pour activer votre compte, securiser vos donnees et lancer votre coaching IA.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:34px 0 28px;">
                <a class="cta" href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#8cf765,#00e5ff);color:#04100d;text-decoration:none;font-size:16px;font-weight:900;padding:17px 28px;border-radius:16px;box-shadow:0 0 24px rgba(0,229,255,.34),0 0 38px rgba(140,247,101,.2);transition:all .2s ease;">
                  Verifier mon email
                </a>
              </td>
            </tr>
            <tr>
              <td>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08);padding:18px 0;">
                  <tr>
                    <td style="padding:18px 0;color:#dfffee;font-size:14px;line-height:1.7;">
                      <strong style="color:#8cf765;">Lien valable 24h.</strong><br>
                      Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
                      <br>
                      <a href="${verifyUrl}" style="color:#00e5ff;word-break:break-all;text-decoration:none;">${verifyUrl}</a>
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

async function sendVerificationEmail({ to, token, displayName }) {
  const verifyUrl = buildVerificationUrl(token);
  const subject = 'Confirmez votre email FitTrack OS';
  const text = [
    `Bienvenue ${displayName || 'sur FitTrack OS'}.`,
    '',
    'Confirmez votre email pour activer votre compte :',
    verifyUrl,
    '',
    'Ce lien expire dans 24 heures.',
    'Si vous n avez pas cree de compte FitTrack OS, ignorez ce message.',
  ].join('\n');

  const { data, error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: [to],
    subject,
    html: buildVerificationEmailHtml({ verifyUrl, displayName }),
    text,
  });

  if (error) {
    const sendError = new Error(error.message || 'Impossible d envoyer l email de verification');
    sendError.statusCode = 502;
    sendError.details = error;
    throw sendError;
  }

  return { sent: true, id: data?.id };
}

module.exports = {
  sendVerificationEmail,
};
