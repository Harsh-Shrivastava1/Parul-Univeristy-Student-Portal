/**
 * Application Status Change Watcher
 *
 * Watches the shared `applications` collection (via MongoDB Change Streams)
 * for any status update — by ANY portal (TEC, Coordinator, Admin, or this
 * Student Portal itself) — and automatically creates a Notification document
 * addressed to the affected student.
 *
 * This is the complete, self-contained solution for the notification
 * requirement: it covers every workflow event without depending on other
 * portals implementing their own notification logic.
 *
 * Covered events:
 *   Applied → Under Review → Interview Scheduled → Interview Completed →
 *   Selected → Assigned to Respective Cell → Training Assigned →
 *   Training Starts → Training Completed → Returned to TEC Cell →
 *   Internship Starts → Internship Completed → Final Completion → Rejected
 *
 * De-duplication: before inserting, we check whether a notification with the
 * same (applicationId, status) already exists (written by another portal).
 * If one is found, we skip creation silently.
 */

const mongoose = require('mongoose');
const Notification = require('../models/Notification');

// Human-readable titles + messages per status value.
// Keys are the canonical status strings stored in `application.status`.
// All known vocabulary (TEC + Coordinator + Student Portal mapped values).
const STATUS_MESSAGES = {
  // Student Portal writes this on application creation.
  Applied: {
    title: 'Application Submitted',
    message: (app) =>
      `Your application for "${appTitle(app)}" has been submitted successfully. Application ID: ${app.id || ''}`,
    type: 'success',
  },
  // TEC Portal transitions
  Pending: {
    title: 'Application Received',
    message: (app) => `Your application for "${appTitle(app)}" has been received and is under initial review.`,
    type: 'info',
  },
  'Under Review': {
    title: 'Application Under Review',
    message: (app) => `Your application for "${appTitle(app)}" is now being reviewed by the department coordinator.`,
    type: 'info',
  },
  Shortlisted: {
    title: 'You Have Been Shortlisted',
    message: (app) => `Great news! You have been shortlisted for "${appTitle(app)}". Interview details will follow shortly.`,
    type: 'success',
  },
  'Interview Scheduled': {
    title: 'Interview Scheduled',
    message: (app) => `Your interview for "${appTitle(app)}" has been scheduled. Please check your Application Status for details.`,
    type: 'info',
  },
  'Interview Completed': {
    title: 'Interview Completed',
    message: (app) => `Your interview for "${appTitle(app)}" has been completed. Results will be communicated shortly.`,
    type: 'info',
  },
  Selected: {
    title: 'Application Approved — You Are Selected!',
    message: (app) => `Congratulations! You have been selected for "${appTitle(app)}".`,
    type: 'success',
  },
  'Selected For Training': {
    title: 'Application Approved — You Are Selected!',
    message: (app) => `Congratulations! You have been selected for "${appTitle(app)}" and will be assigned to a training department.`,
    type: 'success',
  },
  'Assigned to Respective Cell': {
    title: 'Assigned to Your Training Cell',
    message: (app) => `You have been assigned to your respective training cell for "${appTitle(app)}". ${app.assignedDepartment ? `Department: ${app.assignedDepartment}.` : ''}`,
    type: 'info',
  },
  'Training Assigned': {
    title: 'Training Program Assigned',
    message: (app) => `A training program has been assigned to you for "${appTitle(app)}". Please check your Application Status for schedule details.`,
    type: 'info',
  },
  'Training In Progress': {
    title: 'Training Started',
    message: (app) => `Your training for "${appTitle(app)}" has started. Ensure regular attendance.`,
    type: 'info',
  },
  'Training Starts': {
    title: 'Training Started',
    message: (app) => `Your training for "${appTitle(app)}" has commenced. Ensure regular attendance.`,
    type: 'info',
  },
  'Training Completed': {
    title: 'Training Completed',
    message: (app) => `Training for "${appTitle(app)}" has been completed successfully. Awaiting internship placement.`,
    type: 'success',
  },
  'Returned to TEC Cell': {
    title: 'Returned to Internship Cell',
    message: (app) => `Training is complete. You have been returned to the Internship Cell for final internship placement for "${appTitle(app)}".`,
    type: 'info',
  },
  Rejected: {
    title: 'Application Not Selected',
    message: (app) => `Your application for "${appTitle(app)}" was not selected this time. Do not be discouraged — other opportunities are available.`,
    type: 'error',
  },
  'Ready To Join': {
    title: 'Internship Starting — Ready to Join',
    message: (app) => `Your internship for "${appTitle(app)}" is officially starting. You can now download your Training Attendance Application Form.`,
    type: 'success',
  },
  'Internship Starts': {
    title: 'Internship Started',
    message: (app) => `Your internship for "${appTitle(app)}" has officially started! You can now download your Training Attendance Application Form from your profile.`,
    type: 'success',
  },
  'Internship Running': {
    title: 'Internship Updated',
    message: (app) => `Your internship record for "${appTitle(app)}" has been updated by the internship cell.`,
    type: 'info',
  },
  Joined: {
    title: 'Internship Started — Joined',
    message: (app) => `You have officially joined your internship for "${appTitle(app)}". Best of luck!`,
    type: 'success',
  },
  'Internship Completed': {
    title: 'Internship Completed',
    message: (app) => `Congratulations! Your internship for "${appTitle(app)}" has been completed successfully. Collect your certificate from the Internship Cell office.`,
    type: 'success',
  },
  'Final Completion': {
    title: 'Internship Journey Complete',
    message: (app) => `Your full internship journey for "${appTitle(app)}" is now complete. Collect your certificate from the Internship Cell office.`,
    type: 'success',
  },
  'Rejected by Department': {
    title: 'Not Selected by Department',
    message: (app) => `The department did not select your application for "${appTitle(app)}" this time. Other opportunities are still available.`,
    type: 'error',
  },
  Terminated: {
    title: 'Internship Terminated',
    message: (app) => `Your internship for "${appTitle(app)}" has been terminated. Please contact the Internship Cell for more details.`,
    type: 'error',
  },
};

/** Navigation target for a given status. */
function linkForStatus(status) {
  if (['Internship Starts', 'Internship Running', 'Ready To Join', 'Joined',
       'Internship Completed', 'Final Completion'].includes(status)) {
    return '/profile'; // attendance form / documents become available
  }
  return '/status';
}

/**
 * Build a Notification document for an application at a given status, or null if
 * the status has no message template. Shared by the change-stream watcher and
 * the on-fetch reconciliation so both produce identical notifications.
 */
function buildNotificationDoc(app, status, when) {
  const info = STATUS_MESSAGES[status];
  if (!info || !app || !app.id) return null;
  const keys = recipientKeys(app);
  const primaryKey = keys[0] || '';
  const ts = when || new Date().toISOString();
  return {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    recipientId: primaryKey,
    userId: app.userId || primaryKey,
    studentId: app.studentId || primaryKey,
    enrollmentNumber: app.enrollmentNumber || '',
    title: info.title,
    message: typeof info.message === 'function' ? info.message(app) : info.message,
    type: info.type,
    read: false,
    createdAt: ts,
    date: ts,
    link: linkForStatus(status),
    applicationId: app.id,
    status,
    // Deterministic key for the unique index below. Two processes racing the
    // same change event produce the SAME key, so only one insert can win.
    // Namespaced so it never collides with notifications from other portals.
    dedupeKey: dedupeKeyFor(app.id, status),
  };
}

/** Stable per-(application, status) identity used for atomic de-duplication. */
function dedupeKeyFor(applicationId, status) {
  return `app:${applicationId}:${status}`;
}

/**
 * Create the notification for (application, status) exactly once, even when
 * several processes (PM2 cluster workers) handle the same change event.
 *
 * Two layers:
 *   1. a read check, which also catches legacy notifications written before
 *      `dedupeKey` existed (and those written by sibling portals), and
 *   2. an atomic upsert on the unique `dedupeKey` index, which is what makes
 *      concurrent workers safe — a read-then-insert alone is not.
 *
 * Returns true if this call actually created the notification.
 */
async function createNotificationOnce(app, status, when) {
  const doc = buildNotificationDoc(app, status, when);
  if (!doc) return false;
  if (await notificationExists(app, status)) return false;
  try {
    const res = await Notification.updateOne(
      { dedupeKey: doc.dedupeKey },
      { $setOnInsert: doc },
      { upsert: true },
    );
    return Boolean(res.upsertedCount);
  } catch (err) {
    // 11000 = another worker inserted first. That is the expected outcome of a
    // race, not an error.
    if (err && err.code === 11000) return false;
    throw err;
  }
}

/**
 * Unique index backing createNotificationOnce(). Partial, so the many existing
 * notifications without a `dedupeKey` (and those written by sibling portals)
 * are unaffected.
 */
async function ensureNotificationIndex() {
  try {
    await Notification.collection.createIndex(
      { dedupeKey: 1 },
      { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } }, name: 'dedupeKey_unique' },
    );
  } catch (err) {
    console.warn('[appWatcher] Could not ensure dedupeKey index:', err && err.message);
  }
}

/** True if a notification for (applicationId, status) already exists for this student. */
async function notificationExists(app, status) {
  const keys = recipientKeys(app);
  const enrollment = app.enrollmentNumber || '';
  const found = await Notification.findOne({
    applicationId: app.id,
    status,
    $or: [
      { recipientId: { $in: keys } },
      { userId: { $in: keys } },
      { studentId: { $in: keys } },
      ...(enrollment ? [{ enrollmentNumber: enrollment }] : []),
    ],
  }).lean();
  return !!found;
}

/**
 * Safety net for missed change-stream events (Atlas M0 streams can drop): given
 * the student's application docs, ensure a notification exists for each app's
 * CURRENT status. Called on every notifications fetch — idempotent and cheap.
 */
async function reconcileNotifications(apps) {
  for (const app of apps || []) {
    const status = String(app.status || app.applicationStatus || '');
    if (!status || !STATUS_MESSAGES[status] || !app.id) continue;
    try {
      await createNotificationOnce(app, status, app.updatedAt || app.appliedDate);
    } catch (err) {
      console.warn('[appWatcher] reconcile failed for app', app.id, err && err.message);
    }
  }
}

function appTitle(app) {
  return (
    app.advertisementTitle ||
    (app.formData && app.formData.position) ||
    'Internship'
  );
}

function recipientKeys(app) {
  // Collect all candidate recipient identifiers.
  const keys = new Set();
  if (app.userId) keys.add(String(app.userId));
  if (app.studentId) keys.add(String(app.studentId));
  return [...keys];
}

// Guards against running more than one change stream in a single process. The
// restart path below used to be able to schedule two reconnects from one
// failure (close() itself emits 'close'), which doubled the live stream count
// on every Atlas drop.
let started = false;
let activeStream = null;

/**
 * Whether THIS process should own the change stream.
 *
 * In a PM2 cluster every worker runs this file, so without a gate each status
 * change would be processed N times. Writes are de-duplicated atomically
 * anyway (see createNotificationOnce), but running N streams is pure waste —
 * so only cluster worker 0 watches. PM2 sets NODE_APP_INSTANCE per worker;
 * outside a cluster it is undefined and the single process watches.
 *
 * Set WATCHER_ENABLED=false to disable entirely, or WATCHER_ENABLED=true to
 * force-enable on a specific instance.
 */
function shouldWatch() {
  const flag = process.env.WATCHER_ENABLED;
  if (flag === 'false') return false;
  if (flag === 'true') return true;
  const instance = process.env.NODE_APP_INSTANCE;
  return instance === undefined || instance === '' || instance === '0';
}

/**
 * Start watching the applications collection.
 * Call once, after MongoDB is connected.
 * Non-fatal: failures are logged but never crash the server.
 */
function startApplicationWatcher() {
  if (started) return; // already watching in this process
  if (!shouldWatch()) {
    console.log(`[appWatcher] Not the designated watcher instance (NODE_APP_INSTANCE=${process.env.NODE_APP_INSTANCE}) — skipping.`);
    return;
  }
  started = true;
  void ensureNotificationIndex();

  // Change streams require a replica set or Atlas. On a standalone dev MongoDB
  // this will throw "not implemented". We catch and log gracefully.
  try {
    const Application = mongoose.model('Application');
    // Watch only update and replace operations that touch the `status` field.
    const pipeline = [
      {
        $match: {
          operationType: { $in: ['update', 'replace'] },
        },
      },
    ];

    const stream = Application.watch(pipeline, {
      fullDocument: 'updateLookup', // always include the full post-update doc
    });
    activeStream = stream;

    stream.on('change', async (change) => {
      try {
        const doc = change.fullDocument;
        if (!doc) return;

        // Prefer the status field that actually changed in THIS event (the shared
        // doc carries both `status` and `applicationStatus`, sometimes out of
        // sync). Fall back to the live doc values for replace ops.
        const updated = (change.updateDescription && change.updateDescription.updatedFields) || {};
        const newStatus =
          updated.status || updated.applicationStatus || doc.status || doc.applicationStatus;
        if (!newStatus || !STATUS_MESSAGES[newStatus]) return; // unknown/none — skip

        // De-duplicate atomically: in a PM2 cluster every worker receives this
        // same event, so only the upsert winner logs/creates.
        const created = await createNotificationOnce(doc, newStatus);
        if (created) {
          console.log(`[appWatcher] Created notification for app ${doc.id} (status: ${newStatus})`);
        }
      } catch (err) {
        console.warn('[appWatcher] Failed to create notification from change event:', err && err.message);
      }
    });

    // Atlas M0 change streams can drop; auto-resume so notifications keep flowing.
    // close() itself emits 'close', so without this latch a single error would
    // schedule two restarts — and the watcher count would double on every drop.
    let restartScheduled = false;
    const scheduleRestart = (why) => {
      if (restartScheduled) return;
      restartScheduled = true;
      console.warn(`[appWatcher] Change stream ${why} — restarting in 5s.`);
      stream.removeAllListeners();
      try { stream.close(); } catch { /* ignore */ }
      if (activeStream === stream) activeStream = null;
      started = false; // allow exactly one restart
      setTimeout(() => startApplicationWatcher(), 5000);
    };
    stream.on('error', (err) => scheduleRestart(`error (${err && err.message})`));
    stream.on('close', () => scheduleRestart('closed'));

    console.log('🔔  Application status watcher started — notifications will be auto-created for all workflow events.');
  } catch (err) {
    // Standalone MongoDB (no replicaset) does not support change streams.
    // This is non-fatal — all other functionality still works normally.
    console.warn('[appWatcher] Could not start change stream (replica set required):', err && err.message);
    console.warn('[appWatcher] Notifications for status changes will only be created on application submission.');
  }
}

/**
 * Stop the change stream during shutdown. Without this the stream's 'close'
 * handler fires while the process is exiting and schedules a reconnect timer
 * on a dying process.
 */
function stopApplicationWatcher() {
  started = false;
  if (!activeStream) return;
  const stream = activeStream;
  activeStream = null;
  stream.removeAllListeners();
  try { stream.close(); } catch { /* ignore */ }
}

module.exports = { startApplicationWatcher, stopApplicationWatcher, reconcileNotifications };
