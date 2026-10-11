import nodemailer from 'nodemailer';
import config from '../config/index.js';
import logger from './logger.js';

let cachedTransporter = null;
let etherealAccount = null;

/**
 * Returns a configured Nodemailer transporter.
 * If real SMTP credentials are provided, uses standard SMTP (or Gmail).
 * If in test mode or if credentials are empty, creates an Ethereal test inbox
 * so local development and tests NEVER fail and provide instant preview URLs!
 */
export async function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const emailConfig = config.email || {};
  const hasAuth = Boolean(emailConfig.smtpUser && emailConfig.smtpPass);

  if (hasAuth && !config.isTest) {
    const isGmail =
      (emailConfig.smtpHost && emailConfig.smtpHost.includes('gmail')) ||
      (emailConfig.smtpUser && emailConfig.smtpUser.includes('@gmail.com'));

    logger.info(
      {
        host: isGmail ? 'Gmail Service' : emailConfig.smtpHost,
        user: emailConfig.smtpUser,
        fromEmail: emailConfig.fromEmail,
      },
      '📧 Initializing production/staging Nodemailer SMTP transporter',
    );

    const transportOpts = isGmail
      ? {
          service: 'gmail',
          auth: {
            user: emailConfig.smtpUser,
            pass: emailConfig.smtpPass,
          },
        }
      : {
          host: emailConfig.smtpHost || 'smtp-relay.brevo.com',
          port: Number(emailConfig.smtpPort) || 587,
          secure: Boolean(emailConfig.smtpSecure || Number(emailConfig.smtpPort) === 465),
          auth: {
            user: emailConfig.smtpUser,
            pass: emailConfig.smtpPass,
          },
          tls: {
            rejectUnauthorized: config.isProd,
          },
        };

    cachedTransporter = nodemailer.createTransport(transportOpts);
    return cachedTransporter;
  }

  // Fallback: Automatic Ethereal Email test inbox for development and testing
  try {
    if (!etherealAccount) {
      etherealAccount = await nodemailer.createTestAccount();
      logger.info(
        { user: etherealAccount.user },
        '🧪 Ethereal test email account created for development/testing',
      );
    }

    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: etherealAccount.user,
        pass: etherealAccount.pass,
      },
    });

    return cachedTransporter;
  } catch (err) {
    logger.warn({ err: err.message }, 'Failed to create Ethereal account, using JSON/stream transport fallback');
    cachedTransporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return cachedTransporter;
  }
}

/**
 * Base email dispatching function.
 */
export const sendEmail = async ({ to, subject, html, text, from }) => {
  const emailConfig = config.email || {};
  const senderAddress =
    from ||
    `"${emailConfig.fromName || 'Skyline Student Association'}" <${emailConfig.fromEmail || 'noreply@campus-tech-society.dev'}>`;

  if (config.isTest) {
    logger.debug({ to, subject }, 'Mock Email dispatched (Test Mode)');
    return { success: true, messageId: 'mock-id-test' };
  }

  try {
    const transporter = await getTransporter();
    let info;
    try {
      info = await transporter.sendMail({
        from: senderAddress,
        to,
        subject,
        html,
        text: text || (html ? html.replace(/<[^>]*>?/gm, '') : ''),
      });
    } catch (smtpErr) {
      if (smtpErr.code === 'EAUTH') {
        logger.warn(
          { user: config.email?.smtpUser, error: smtpErr.message },
          '⚠️ SMTP Authentication rejected (Bad credentials). Please check SMTP_USER and SMTP_PASS (e.g. Gmail App Password). Falling back to Ethereal preview.',
        );
        const testAccount = await nodemailer.createTestAccount();
        const fallbackTransporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        info = await fallbackTransporter.sendMail({
          from: senderAddress,
          to,
          subject,
          html,
          text: text || (html ? html.replace(/<[^>]*>?/gm, '') : ''),
        });
      } else {
        throw smtpErr;
      }
    }

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      logger.info({ previewUrl, to, subject }, '🔗 [ETHEREAL EMAIL PREVIEW] View rendered email in browser');
    } else {
      logger.info({ messageId: info.messageId, to, subject }, '✅ Email delivered via Nodemailer');
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || null,
    };
  } catch (error) {
    logger.error({ err: error.message, to, subject }, '❌ Nodemailer email delivery failed');
    throw error;
  }
};

/**
 * Sends a high-contrast, responsive password reset email.
 */
export async function sendPasswordResetEmail({ to, name = '', resetUrl, resetToken }) {
  const brandTitle = 'Skyline Student Association';
  const firstName = name ? name.split(' ')[0] : 'Member';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0E17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E5E7EB;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0B0E17; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #121624; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <!-- Top Header Strip -->
          <tr>
            <td style="padding: 32px 36px; background: linear-gradient(135deg, #1E1B4B 0%, #172554 100%); border-bottom: 1px solid rgba(255,255,255,0.08);">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 4px 10px; background: rgba(99, 102, 241, 0.2); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 100px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #818CF8; text-transform: uppercase;">
                      Security Verification
                    </span>
                    <h1 style="margin: 12px 0 0 0; font-size: 24px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.02em;">
                      ${brandTitle}
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #F3F4F6;">
                Password Reset Request
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #9CA3AF;">
                Hello <strong>${firstName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #9CA3AF;">
                We received a request to reset your password for your Skyline Student Association account. Click the button below to choose a new password:
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="border-radius: 12px; background: #4F46E5;">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 12px; letter-spacing: 0.02em;">
                      Reset Password Now &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry Alert -->
              <div style="background-color: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; padding: 14px 18px; margin: 24px 0;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #FCA5A5;">
                  ⏱ <strong>Time Sensitive:</strong> This reset link will expire in <strong>1 hour</strong>. If you did not request this change, you can safely ignore this email — your account remains protected.
                </p>
              </div>

              <!-- Direct Link Fallback -->
              <p style="margin: 24px 0 8px 0; font-size: 12px; color: #6B7280;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0; font-size: 11px; word-break: break-all; color: #818CF8; font-family: monospace; background: rgba(0,0,0,0.25); padding: 10px; border-radius: 8px;">
                ${resetUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px 32px 36px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #6B7280; line-height: 1.5;">
                &copy; ${new Date().getFullYear()} ${brandTitle}. All rights reserved.<br>
                Empowering students across collegiate clubs, chapters, and events.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to,
    subject: '🔐 Reset Your Skyline Account Password',
    html,
    text: `Hello ${firstName},\n\nYou requested a password reset for your Skyline Student Association account.\n\nClick the link below to set a new password (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.\n\n— Skyline Student Association`,
  });
}

/**
 * Sends a rich broadcast announcement email to members.
 */
export async function sendBroadcastEmail({
  to,
  recipientName = '',
  subject,
  announcementTitle,
  content,
  clubName = 'Skyline Student Association',
  announcementId = null,
}) {
  const firstName = recipientName ? recipientName.split(' ')[0] : 'Member';
  const portalUrl = `${config.clientUrl || 'http://localhost:5173'}/announcements`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${announcementTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0E17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E5E7EB;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0B0E17; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #121624; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <!-- Top Header Strip -->
          <tr>
            <td style="padding: 28px 36px; background: linear-gradient(135deg, #1E1B4B 0%, #172554 100%); border-bottom: 1px solid rgba(255,255,255,0.08);">
              <span style="display: inline-block; padding: 4px 10px; background: rgba(99, 102, 241, 0.2); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 100px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #818CF8; text-transform: uppercase;">
                ${clubName}
              </span>
              <h1 style="margin: 12px 0 0 0; font-size: 22px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.02em;">
                📢 Official Announcement
              </h1>
            </td>
          </tr>

          <!-- Main Announcement Body -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <p style="margin: 0 0 16px 0; font-size: 13px; font-weight: 600; color: #818CF8; text-transform: uppercase; letter-spacing: 0.05em;">
                Dear ${firstName},
              </p>
              <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; line-height: 1.3; color: #F9FAFB;">
                ${announcementTitle}
              </h2>
              <div style="font-size: 14px; line-height: 1.7; color: #D1D5DB; white-space: pre-line; margin-bottom: 28px;">
                ${content}
              </div>

              <!-- Button to view in portal -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px 0 12px 0;">
                <tr>
                  <td align="center" style="border-radius: 12px; background: #4F46E5;">
                    <a href="${portalUrl}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 13px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 12px;">
                      Open Announcement in Portal &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer & Unsubscribe -->
          <tr>
            <td style="padding: 24px 36px; border-top: 1px solid rgba(255,255,255,0.06); background-color: rgba(0,0,0,0.2);">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #6B7280; line-height: 1.5;">
                You received this email because you are a member of <strong>${clubName}</strong> on the Skyline Student Association platform.
              </p>
              <p style="margin: 0; font-size: 11px; color: #4B5563;">
                To update notification preferences, visit your profile settings on the student portal.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to,
    subject: subject || `📢 [${clubName}] ${announcementTitle}`,
    html,
    text: `[${clubName}] ${announcementTitle}\n\nDear ${firstName},\n\n${content}\n\nView more on the Skyline portal: ${portalUrl}\n\n— ${clubName}`,
  });
}

/**
 * Diagnostic helper: Verifies the email transporter connection.
 */
export async function verifyTransporter() {
  try {
    const transporter = await getTransporter();
    if (transporter.verify) {
      await transporter.verify();
    }
    return {
      connected: true,
      mode: etherealAccount ? 'ethereal_preview' : 'live_smtp',
      account: etherealAccount ? etherealAccount.user : config.email?.smtpUser,
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message,
    };
  }
}
