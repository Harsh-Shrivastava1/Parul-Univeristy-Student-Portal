/**
 * Branded, data-driven email template registry for the shared email service.
 *
 * Every portal ships an identical copy of this registry so that a "Welcome" or
 * "Offer Letter" email looks the same regardless of which backend sent it. Each
 * builder takes a plain data object (no coupling to any DB entity) and returns a
 * subject + branded HTML body. Missing fields degrade gracefully.
 *
 * Ported VERBATIM from the TEC (TypeScript) registry, converted to CommonJS JS.
 */

const BRAND = 'Internship Management System';
const ORG = 'Parul University · Technical Events Cell';
const ACCENT = '#4f46e5';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Branded HTML shell shared by every template. */
function layout(opts) {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
  <body style="margin:0;background:#f4f5f7;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2430;">
    ${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</div>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:92%;background:#ffffff;border:1px solid #e6e8eb;border-radius:14px;overflow:hidden;">
          <tr><td style="background:${ACCENT};padding:22px 30px;">
            <div style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:.2px;">${BRAND}</div>
            <div style="color:#dfe1ff;font-size:12px;margin-top:2px;">${ORG}</div>
          </td></tr>
          <tr><td style="padding:30px;">
            <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;line-height:1.3;">${esc(opts.title)}</h1>
            ${opts.bodyHtml}
          </td></tr>
          <tr><td style="padding:18px 30px;border-top:1px solid #eef0f2;color:#8a93a2;font-size:12px;line-height:1.6;">
            This is an automated message from the ${BRAND}. Please do not reply to this email.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function p(html) {
  return `<p style="margin:0 0 14px;font-size:14px;line-height:1.65;">${html}</p>`;
}

function greeting(data) {
  return p(`Dear ${esc(data.name || 'Student')},`);
}

function signoff() {
  return p(`Warm regards,<br/><strong>Technical Events Cell</strong><br/>Parul University`);
}

/** Definition-list style table of key/value rows; blank values are skipped. */
function infoTable(rows) {
  const cells = rows
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;">${esc(k)}</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${esc(v)}</td></tr>`,
    )
    .join('');
  if (!cells) return '';
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;border-collapse:collapse;">${cells}</table>`;
}

function callout(html, tone = 'accent') {
  const bg = tone === 'success' ? '#ecfdf5' : tone === 'warn' ? '#fff7ed' : '#eef2ff';
  const bd = tone === 'success' ? '#a7f3d0' : tone === 'warn' ? '#fed7aa' : '#c7d2fe';
  return `<div style="margin:0 0 18px;padding:14px 16px;background:${bg};border:1px solid ${bd};border-radius:10px;font-size:14px;line-height:1.6;">${html}</div>`;
}

function button(label, url) {
  if (!url) return '';
  return `<div style="margin:6px 0 18px;"><a href="${esc(url)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:9px;">${esc(label)}</a></div>`;
}

const stripTags = (html) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();

/** The 12+ lifecycle templates, keyed by template id. */
const LIFECYCLE_TEMPLATES = {
  welcome: (d) => ({
    subject: 'Welcome to the Internship Management System',
    body:
      greeting(d) +
      p(`Your student account has been created successfully. You can now browse internship advertisements, apply to opportunities, and track your applications from your dashboard.`) +
      infoTable([
        ['Name', d.name],
        ['Enrollment No.', d.enrollmentNumber],
        ['Email', d.email],
        ['Department', d.department],
      ]) +
      button('Go to Portal', d.loginUrl) +
      signoff(),
  }),

  account_created: (d) => ({
    subject: 'Your account has been created',
    body:
      greeting(d) +
      p(`An account has been created for you on the ${BRAND}. Use the credentials below to sign in, and change your password after your first login.`) +
      infoTable([
        ['Email', d.email],
        ['Temporary Password', d.tempPassword],
      ]) +
      callout(`For your security, please change this temporary password immediately after signing in.`, 'warn') +
      button('Sign In', d.loginUrl) +
      signoff(),
  }),

  password_reset: (d) => ({
    subject: 'Your password has been reset',
    body:
      greeting(d) +
      p(`Your password has been reset by an administrator. Use the temporary password below to sign in, then set a new password from your profile.`) +
      infoTable([
        ['Email', d.email],
        ['Temporary Password', d.tempPassword],
      ]) +
      callout(`If you did not expect this change, contact the Technical Events Cell right away.`, 'warn') +
      button('Sign In', d.loginUrl || d.resetUrl) +
      signoff(),
  }),

  application_submitted: (d) => ({
    subject: `Application received — ${d.role || 'Internship'}`,
    body:
      greeting(d) +
      p(`We have received your application for the <strong>${esc(d.role || 'internship')}</strong>${d.company ? ` at <strong>${esc(d.company)}</strong>` : ''}. A confirmation copy is attached where available.`) +
      infoTable([
        ['Position', d.role],
        ['Company', d.company],
        ['Department', d.department],
      ]) +
      p(`Our team will review your application and keep you informed of the next steps.`) +
      signoff(),
  }),

  new_application: (d) => ({
    subject: `New application — ${d.name || 'Student'} · ${d.role || 'Internship'}`,
    body:
      p(`A new student application has been submitted and is awaiting review.`) +
      infoTable([
        ['Student', d.name],
        ['Enrollment No.', d.enrollmentNumber],
        ['Department', d.department],
        ['Position', d.role],
        ['Company', d.company],
        ['Email', d.email],
      ]) +
      p(`Open the Internship Cell portal to review and process this application.`),
  }),

  interview_scheduled: (d) => ({
    subject: `Interview scheduled — ${d.role || 'Internship'}`,
    body:
      greeting(d) +
      p(`Your interview for the <strong>${esc(d.role || 'internship')}</strong>${d.company ? ` at <strong>${esc(d.company)}</strong>` : ''} has been scheduled. Please find the details below.`) +
      infoTable([
        ['Date', d.interviewDate],
        ['Time', d.interviewTime],
        ['Venue', d.venue],
        ['Position', d.role],
      ]) +
      p(`Please carry a copy of your resume and a valid photo ID. Arrive at least 15 minutes early.`) +
      signoff(),
  }),

  interview_reminder: (d) => ({
    subject: `Reminder: interview tomorrow — ${d.role || 'Internship'}`,
    body:
      greeting(d) +
      callout(`This is a reminder that your interview is coming up soon.`, 'accent') +
      infoTable([
        ['Date', d.interviewDate],
        ['Time', d.interviewTime],
        ['Venue', d.venue],
        ['Position', d.role],
      ]) +
      p(`We wish you the very best. Please carry your resume and a valid photo ID.`) +
      signoff(),
  }),

  selected_for_training: (d) => ({
    subject: `Selected for training — ${d.role || 'Internship'}`,
    body:
      greeting(d) +
      callout(`Congratulations! You have been <strong>selected for training</strong>.`, 'success') +
      p(`Based on your performance, you have been selected to proceed to the training phase${d.company ? ` with <strong>${esc(d.company)}</strong>` : ''}.`) +
      infoTable([
        ['Position', d.role],
        ['Company', d.company],
        ['Mentor', d.mentorName],
        ['Start Date', d.startDate],
      ]) +
      p(`Further details about your training schedule will follow shortly.`) +
      signoff(),
  }),

  training_started: (d) => ({
    subject: `Your training has started — ${d.trainingModule || d.role || 'Internship'}`,
    body:
      greeting(d) +
      p(`Your training has officially commenced. Below are your training details. Please reach out to your mentor for any clarifications.`) +
      infoTable([
        ['Training Module', d.trainingModule || d.role],
        ['Mentor', d.mentorName],
        ['Reporting Location', d.reportingLocation],
        ['Reporting Time', d.reportingTime],
        ['Start Date', d.startDate],
        ['Duration', d.duration],
      ]) +
      p(`We wish you a productive and rewarding training experience.`) +
      signoff(),
  }),

  training_updated: (d) => ({
    subject: `Update to your training — ${d.trainingModule || d.role || 'Internship'}`,
    body:
      greeting(d) +
      p(`There has been an update to your training schedule. Please review the latest details below.`) +
      infoTable([
        ['Training Module', d.trainingModule || d.role],
        ['Mentor', d.mentorName],
        ['Reporting Location', d.reportingLocation],
        ['Reporting Time', d.reportingTime],
        ['Start Date', d.startDate],
        ['Duration', d.duration],
      ]) +
      (d.message ? p(esc(d.message)) : '') +
      signoff(),
  }),

  training_completed: (d) => ({
    subject: `Training completed — ${d.trainingModule || d.role || 'Internship'}`,
    body:
      greeting(d) +
      callout(`You have successfully <strong>completed your training</strong>. Well done!`, 'success') +
      infoTable([
        ['Training Module', d.trainingModule || d.role],
        ['Company', d.company],
        ['Mentor', d.mentorName],
      ]) +
      p(`Your completion certificate will be shared with you shortly. Thank you for your dedication.`) +
      signoff(),
  }),

  ready_to_join: (d) => ({
    subject: `Ready to join — ${d.company || d.role || 'Internship'}`,
    body:
      greeting(d) +
      callout(`You are now <strong>ready to join</strong>. Please review your joining details below.`, 'success') +
      infoTable([
        ['Company', d.company],
        ['Position', d.role],
        ['Joining Date', d.joiningDate],
        ['Reporting Location', d.reportingLocation],
        ['Reporting Time', d.reportingTime],
      ]) +
      p(`Please carry the necessary documents on your joining day. We wish you great success.`) +
      signoff(),
  }),

  offer_letter: (d) => ({
    subject: `Your offer letter — ${d.company || d.role || 'Internship'}`,
    body:
      greeting(d) +
      callout(`Congratulations! Your <strong>offer letter</strong> is attached.`, 'success') +
      p(`We are pleased to extend an offer for the <strong>${esc(d.role || 'internship')}</strong>${d.company ? ` at <strong>${esc(d.company)}</strong>` : ''}. Your official offer letter is attached to this email.`) +
      infoTable([
        ['Position', d.role],
        ['Company', d.company],
        ['Joining Date', d.joiningDate],
      ]) +
      signoff(),
  }),

  completion_certificate: (d) => ({
    subject: `Your completion certificate — ${d.role || 'Internship'}`,
    body:
      greeting(d) +
      callout(`Congratulations on completing your internship! Your <strong>completion certificate</strong> is attached.`, 'success') +
      p(`It has been a pleasure having you in the program. Your certificate of completion is attached to this email for your records.`) +
      infoTable([
        ['Position', d.role],
        ['Company', d.company],
      ]) +
      signoff(),
  }),
};

/** Render a lifecycle template by id. Returns null for unknown ids. */
function renderLifecycleTemplate(template, data) {
  const builder = LIFECYCLE_TEMPLATES[template];
  if (!builder) return null;
  const { subject, body } = builder(data || {});
  const html = layout({ title: subject, bodyHtml: body, preheader: subject });
  return { subject, html, text: stripTags(body) };
}

module.exports = {
  layout,
  p,
  infoTable,
  button,
  LIFECYCLE_TEMPLATES,
  renderLifecycleTemplate,
};
