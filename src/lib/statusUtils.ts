import type { ApplicationStatus } from '../types';

/**
 * Workflow statuses that indicate the internship has officially started (or completed),
 * meaning the Attendance Form is now available for download.
 *
 * NOTE: The Attendance Form is NOT available during the training phase
 * (Training Assigned, Training Starts, Training Completed, Returned to TEC Cell).
 */
export const ATTENDANCE_FORM_AVAILABLE_STATUSES = [
  'Internship Starts',
  'Internship Active',
  'Internship In Progress',
  'Internship Running',
  'Ready To Join',
  'Joined',
  'Internship Completed',
  'Final Completion',
] as const;

/**
 * Checks whether an application has reached the internship phase
 * (on or after "Internship Starts") where the Attendance Form becomes downloadable.
 *
 * Normalizes input status (trimmed, lowercase, pattern matching) so future status
 * naming variations cannot break download availability.
 */
export function isAttendanceFormAvailable(status?: string | ApplicationStatus | null): boolean {
  if (!status) return false;
  const s = String(status).trim().toLowerCase();

  // Explicitly disallow any training phase or pre-internship statuses
  if (
    s.includes('training') ||
    s.includes('returned to tec') ||
    s.includes('assigned to') ||
    s.includes('interview') ||
    s.includes('under review') ||
    s.includes('applied') ||
    s.includes('pending') ||
    s.includes('shortlisted') ||
    s.includes('rejected')
  ) {
    return false;
  }

  return (
    s.includes('internship start') ||
    s.includes('internship active') ||
    s.includes('internship in progress') ||
    s.includes('internship running') ||
    s.includes('ready to join') ||
    s.includes('joined') ||
    s.includes('internship complete') ||
    s.includes('final completion') ||
    s === 'internship starts' ||
    s === 'internship completed' ||
    s === 'final completion'
  );
}
