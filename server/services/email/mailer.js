/**
 * Shared mailer: the single entry point for all lifecycle emails.
 *
 * - Renders a branded template from the registry
 * - Sends via the Nodemailer transport with automatic retry (up to 3 attempts)
 * - Persists an EmailLog (recipient, subject, template, status, provider,
 *   messageId, sentAt, error, retryCount) to the shared `emailLogs` collection
 * - NEVER throws — a delivery failure is logged, never propagated, so it can
 *   never roll back the business action that triggered it.
 */
const { env } = require('../../config/env');
const logger = require('../../config/logger');
const EmailLog = require('../../models/EmailLog');
const { sendMail, verifyTransport } = require('./transporter');
const { renderLifecycleTemplate } = require('./templates');

const MAX_ATTEMPTS = 3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeId() {
  return `eml-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

/**
 * Send with automatic retry. Returns the final result plus how many retries
 * were consumed (0 = succeeded first try). Never throws.
 */
async function sendWithRetry(args, maxAttempts = MAX_ATTEMPTS) {
  let last = { status: 'failed', previewUrl: null, error: 'not attempted', messageId: null };
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    last = await sendMail(args);
    if (last.status === 'sent') {
      return { ...last, retryCount: attempt - 1 };
    }
    if (attempt < maxAttempts) {
      logger.warn('Email send attempt failed, retrying', { attempt, to: args.to, error: last.error });
      await sleep(attempt * 500);
    }
  }
  return { ...last, retryCount: maxAttempts - 1 };
}

/**
 * Render + send + log a lifecycle template email. Best-effort: returns the
 * persisted EmailLog (status 'sent' | 'failed') and never throws.
 *
 * opts: { to, toName, template, data, attachments, cc, applicationId, actor, subjectOverride }
 */
async function sendTemplateEmail(opts) {
  const rendered = renderLifecycleTemplate(opts.template, opts.data || {});
  const subject = opts.subjectOverride || (rendered && rendered.subject) || opts.template;
  const html = (rendered && rendered.html) || `<p>${subject}</p>`;
  const text = (rendered && rendered.text) || subject;

  let outcome;
  try {
    outcome = await sendWithRetry({
      to: opts.to,
      cc: opts.cc,
      subject,
      html,
      text,
      attachments: opts.attachments,
    });
  } catch (err) {
    // sendWithRetry already swallows provider errors; this is a final safety net.
    outcome = {
      status: 'failed',
      previewUrl: null,
      error: err instanceof Error ? err.message : 'Unknown email error',
      messageId: null,
      retryCount: MAX_ATTEMPTS - 1,
    };
  }

  const log = {
    id: makeId(),
    recipient: opts.to,
    recipientName: opts.toName || '',
    applicationId: opts.applicationId || '',
    template: opts.template,
    subject,
    sentBy: (opts.actor && opts.actor.userId) || 'system',
    sentByName: (opts.actor && opts.actor.userName) || 'System',
    sentAt: new Date().toISOString(),
    deliveryStatus: outcome.status,
    previewUrl: outcome.previewUrl,
    error: outcome.error,
    provider: env.email.provider,
    messageId: outcome.messageId,
    retryCount: outcome.retryCount,
  };

  try {
    await EmailLog.create(log);
  } catch (err) {
    logger.error('Email log append failed', { error: err.message, template: opts.template, to: opts.to });
  }

  if (outcome.status === 'sent') {
    logger.info('Email sent', { template: opts.template, to: opts.to, retryCount: outcome.retryCount });
  } else {
    logger.error('Email delivery failed after retries', { template: opts.template, to: opts.to, error: outcome.error });
  }

  return log;
}

/** Startup connectivity check — logs status, never throws. */
async function verifyEmailTransport() {
  const ok = await verifyTransport();
  if (ok) {
    logger.info('Email transport verified', { provider: env.email.provider, from: env.email.from });
  } else {
    logger.warn('Email transport verification failed — email sending is disabled until fixed', {
      provider: env.email.provider,
    });
  }
  return ok;
}

module.exports = { sendWithRetry, sendTemplateEmail, verifyEmailTransport };
