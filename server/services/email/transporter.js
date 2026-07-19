const nodemailer = require('nodemailer');
const { env } = require('../../config/env');
const logger = require('../../config/logger');

/**
 * Nodemailer transport factory. If SMTP_* env vars are set it uses them;
 * otherwise it auto-creates a free Ethereal test inbox and returns a preview
 * URL per send. Mirrors the TEC provider design.
 *
 * getTransporter() lazily creates (and memoizes) the transport.
 * verifyTransport() checks connectivity/auth — never throws, returns a bool.
 */
let transporter = null;
let initializing = null;

async function getTransporter() {
  if (transporter) return transporter;
  if (initializing) return initializing;

  initializing = (async () => {
    if (env.email.host && env.email.user) {
      transporter = nodemailer.createTransport({
        host: env.email.host,
        port: env.email.port || 587,
        secure: env.email.secure,
        auth: { user: env.email.user, pass: env.email.pass },
      });
      logger.info('Email transport: configured SMTP', { host: env.email.host });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      logger.info('Email transport: Ethereal test account created', { user: testAccount.user });
    }
    return transporter;
  })();

  return initializing;
}

/**
 * Verify SMTP connectivity + auth. Used at startup so a misconfigured mailbox
 * surfaces immediately in the logs — but never throws, so the server keeps
 * serving with email gracefully disabled.
 */
async function verifyTransport() {
  try {
    const t = await getTransporter();
    await t.verify();
    return true;
  } catch (err) {
    logger.error('Email transport verify failed', { error: err.message });
    return false;
  }
}

/**
 * Send a single message. Returns a normalized result — never throws.
 * { status: 'sent'|'failed', previewUrl, error, messageId }
 */
async function sendMail(args) {
  try {
    const t = await getTransporter();
    const info = await t.sendMail({
      from: env.email.from,
      to: args.to,
      cc: args.cc,
      subject: args.subject,
      text: args.text,
      html: args.html,
      attachments: args.attachments,
    });
    const previewUrl = nodemailer.getTestMessageUrl(info) || null;
    return {
      status: 'sent',
      previewUrl: previewUrl ? String(previewUrl) : null,
      error: null,
      messageId: info.messageId || null,
    };
  } catch (err) {
    logger.error('Email send failed', { to: args.to, error: err.message });
    return {
      status: 'failed',
      previewUrl: null,
      error: err instanceof Error ? err.message : 'Unknown email error',
      messageId: null,
    };
  }
}

module.exports = { getTransporter, verifyTransport, sendMail };
