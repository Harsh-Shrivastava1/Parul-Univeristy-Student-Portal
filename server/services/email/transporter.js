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
const mongoose = require('mongoose');

/**
 * SMTP comes from Admin > System Settings, shared by all four portals.
 *
 * All four read the same database, and the settings singleton lives in it. Admin
 * is the only writer; everyone else reads. That gives the university one place
 * to change the mailbox instead of four .env files on a server they cannot log
 * in to.
 *
 * The environment stays as a fallback, for an install whose settings row is
 * still blank and for the seconds before Mongo is connected — email must never
 * be the reason a portal fails to start.
 */
const SETTINGS_TTL_MS = 60_000;
let cachedSmtp = null;
let cachedAt = 0;

function fromEnv() {
  return {
    host: env.email.host,
    port: env.email.port || 587,
    secure: env.email.secure,
    user: env.email.user,
    pass: env.email.pass,
    from: env.email.from,
    source: 'environment',
  };
}

async function resolveSmtp() {
  // Re-read periodically so a change made in Admin reaches this portal without
  // a restart. Between reads the pooled connection is reused as before.
  if (cachedSmtp && Date.now() - cachedAt < SETTINGS_TTL_MS) return cachedSmtp;

  let resolved = fromEnv();
  try {
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      const doc = await mongoose.connection.db
        .collection('settings')
        .findOne({ _key: 'singleton' });
      const e = doc && doc.email;
      if (e && e.smtpHost && e.smtpUsername) {
        resolved = {
          host: e.smtpHost,
          port: e.smtpPort || 587,
          // 465 is implicit TLS; anything else upgrades with STARTTLS.
          secure: (e.smtpPort || 587) === 465,
          user: e.smtpUsername,
          // Blank stored password means "keep using the one in the environment",
          // so changing only the host does not require retyping it.
          pass: e.smtpPassword || env.email.pass,
          // Blank From keeps this portal's own name, which is friendlier than
          // every portal signing off identically.
          from: e.fromAddress || env.email.from,
          source: 'system settings',
        };
      }
    }
  } catch (err) {
    logger.warn('Could not read email settings — using environment', { error: err.message });
  }

  cachedSmtp = resolved;
  cachedAt = Date.now();
  return resolved;
}

/** Same credentials? Used to avoid tearing down a healthy pool for nothing. */
function sameSmtp(a, b) {
  if (!a || !b) return false;
  return (
    a.host === b.host && a.port === b.port && a.secure === b.secure &&
    a.user === b.user && a.pass === b.pass && a.from === b.from
  );
}

let activeSmtp = null;

let transporter = null;
let initializing = null;

async function getTransporter() {
  const smtp = await resolveSmtp();

  // Rebuild only when the credentials actually changed — otherwise a healthy
  // pooled connection would be thrown away every time the cache expired.
  if (transporter && sameSmtp(activeSmtp, smtp)) return transporter;
  if (transporter && !sameSmtp(activeSmtp, smtp)) {
    logger.info('Email settings changed — rebuilding transport', { host: smtp.host, source: smtp.source });
    try { transporter.close(); } catch { /* already gone */ }
    transporter = null;
    initializing = null;
  }
  if (initializing) return initializing;

  initializing = (async () => {
    activeSmtp = smtp;
    if (smtp.host && smtp.user) {
      transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: { user: smtp.user, pass: smtp.pass },
        // Reuse SMTP connections + rate-limit for fast multi-recipient sends.
        pool: true,
        maxConnections: env.email.poolMaxConnections,
        maxMessages: env.email.poolMaxMessages,
        rateDelta: env.email.poolRateDelta,
        rateLimit: env.email.poolRateLimit,
      });
      logger.info('Email transport: configured SMTP (pooled)', { host: smtp.host, source: smtp.source });
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
      from: (activeSmtp && activeSmtp.from) || env.email.from,
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
