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
    title: 'Returned to TEC Cell',
    message: (app) => `Training is complete. You have been returned to the TEC Cell for final internship placement for "${appTitle(app)}".`,
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
};

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

/**
 * Start watching the applications collection.
 * Call once, after MongoDB is connected.
 * Non-fatal: failures are logged but never crash the server.
 */
function startApplicationWatcher() {
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

    stream.on('change', async (change) => {
      try {
        const doc = change.fullDocument;
        if (!doc) return;

        const newStatus = doc.status || doc.applicationStatus;
        if (!newStatus) return;

        const info = STATUS_MESSAGES[newStatus];
        if (!info) return; // unknown status — skip silently

        // De-duplicate: skip if a notification for this (applicationId, status)
        // was already created (e.g. by TEC / Coordinator backend).
        const appId = doc.id;
        const keys = recipientKeys(doc);
        const enrollment = doc.enrollmentNumber || '';

        const existing = await Notification.findOne({
          applicationId: appId,
          status: newStatus,
          $or: [
            { recipientId: { $in: keys } },
            { userId: { $in: keys } },
            { studentId: { $in: keys } },
            ...(enrollment ? [{ enrollmentNumber: enrollment }] : []),
          ],
        }).lean();

        if (existing) return; // already notified — skip

        const now = new Date().toISOString();
        const primaryKey = keys[0] || '';

        // Determine the navigation link based on status.
        let link = '/notifications';
        if (['Internship Starts', 'Internship Running', 'Ready To Join', 'Joined',
             'Internship Completed', 'Final Completion'].includes(newStatus)) {
          link = '/profile'; // attendance form becomes available
        } else if (['Applied', 'Under Review', 'Pending', 'Shortlisted',
                    'Interview Scheduled', 'Interview Completed', 'Selected',
                    'Selected For Training', 'Assigned to Respective Cell',
                    'Training Assigned', 'Training In Progress', 'Training Starts',
                    'Training Completed', 'Returned to TEC Cell', 'Rejected'].includes(newStatus)) {
          link = '/status';
        }

        await Notification.create({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          recipientId: primaryKey,
          userId: doc.userId || primaryKey,
          studentId: doc.studentId || primaryKey,
          enrollmentNumber: enrollment,
          title: info.title,
          message: typeof info.message === 'function' ? info.message(doc) : info.message,
          type: info.type,
          read: false,
          createdAt: now,
          date: now,
          link,
          applicationId: appId,
          status: newStatus,
        });

        console.log(`[appWatcher] Created notification: ${info.title} for app ${appId} (status: ${newStatus})`);
      } catch (err) {
        console.warn('[appWatcher] Failed to create notification from change event:', err && err.message);
      }
    });

    stream.on('error', (err) => {
      // On Atlas free tier or replica sets, change streams may disconnect. Log + continue.
      console.warn('[appWatcher] Change stream error:', err && err.message);
    });

    console.log('🔔  Application status watcher started — notifications will be auto-created for all workflow events.');
  } catch (err) {
    // Standalone MongoDB (no replicaset) does not support change streams.
    // This is non-fatal — all other functionality still works normally.
    console.warn('[appWatcher] Could not start change stream (replica set required):', err && err.message);
    console.warn('[appWatcher] Notifications for status changes will only be created on application submission.');
  }
}

module.exports = { startApplicationWatcher };
