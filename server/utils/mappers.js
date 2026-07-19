/**
 * Translators from the shared MongoDB document shapes (owned by TEC /
 * Coordinator / Admin) into the exact TypeScript shapes the existing Student
 * Portal frontend already consumes. Keeping these mappings here means the
 * frontend pages never change.
 */

// Normalize a value that may be an array, a newline/comma-separated string, or
// null into a clean string[] (the frontend Internship shape expects arrays and
// calls .map on them). TEC stores some of these fields as free-text strings.
function toStringArray(v) {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  if (typeof v === 'string') {
    return v
      .split(/\r?\n|,|;|•|·/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

// advertisements (TEC) → frontend Internship
function toInternship(ad) {
  if (!ad) return null;
  const status = ad.status === 'Published' || ad.status === 'Open' ? 'Open' : 'Closed';
  const responsibilities = toStringArray(ad.responsibilities);
  return {
    id: ad.id,
    postName: ad.title || ad.internshipTitle || ad.postName || '',
    department: ad.department || ad.companyDepartment || '',
    stipend: String(ad.stipend != null ? ad.stipend : ''),
    duration: String(ad.duration != null ? ad.duration : ''),
    skills: toStringArray(ad.requiredSkills || ad.skills),
    vacancy: Number(ad.vacancy || 0),
    interviewDate: ad.interviewDate || '',
    interviewTime: ad.interviewTime || '',
    venue: ad.venue || '',
    status,
    tasks: responsibilities.length ? responsibilities : toStringArray(ad.tasks),
    postedDate: ad.createdAt || ad.postedDate || '',
    description: ad.description || '',
    responsibilities,
    category: ad.category || ad.department || '',
    minCGPA: ad.minCGPA,
    eligibility: ad.eligibilityCriteria || ad.eligibility || '',
    contactPerson: ad.createdByName || ad.contactPerson || '',
    contactEmail: ad.contactEmail || '',
  };
}

// Shared/TEC application status vocabulary → frontend ApplicationStatus vocabulary.
const STATUS_MAP = {
  Applied: 'Applied',
  Pending: 'Applied',
  'Under Review': 'Under Review',
  Shortlisted: 'Interview Scheduled',
  'Interview Scheduled': 'Interview Scheduled',
  'Interview Completed': 'Interview Completed',
  'Selected For Training': 'Selected',
  Selected: 'Selected',
  'Assigned to Respective Cell': 'Assigned to Respective Cell',
  'Training Assigned': 'Training Assigned',
  'Training In Progress': 'Training Starts',
  'Training Starts': 'Training Starts',
  'Training Completed': 'Training Completed',
  'Returned to TEC Cell': 'Returned to TEC Cell',
  'Ready To Join': 'Internship Starts',
  'Internship Starts': 'Internship Starts',
  'Internship Running': 'Internship Starts',
  Joined: 'Internship Starts',
  'Internship Completed': 'Internship Completed',
  'Final Completion': 'Final Completion',
  Rejected: 'Rejected',
};

function mapStatus(s) {
  return STATUS_MAP[s] || 'Applied';
}

function minimalInternship(app) {
  return {
    id: app.advertisementId || '',
    postName: app.advertisementTitle || 'Internship',
    department: app.department || '',
    stipend: '',
    duration: '',
    skills: [],
    vacancy: 0,
    interviewDate: (app.interviewDetails && app.interviewDetails.date) || '',
    interviewTime: (app.interviewDetails && app.interviewDetails.time) || '',
    venue: (app.interviewDetails && app.interviewDetails.venue) || '',
    status: 'Closed',
    tasks: [],
    postedDate: app.createdAt || '',
  };
}

// applications (TEC) → frontend Application (with embedded Internship + timeline)
function toApplication(app, ad) {
  const internship = toInternship(ad) || minimalInternship(app);
  const status = mapStatus(app.status || app.applicationStatus);
  const timeline =
    Array.isArray(app.timeline) && app.timeline.length
      ? app.timeline.map((t) => ({
          status: mapStatus(t.currentStatus || t.status || t.title),
          timestamp: t.at || t.timestamp || app.createdAt || '',
          notes: t.description || t.remarks || t.title || undefined,
        }))
      : [
          {
            status,
            timestamp: app.appliedDate || app.createdAt || '',
            notes: 'Application submitted successfully.',
          },
        ];

  return {
    id: app.id,
    internshipId: app.advertisementId || (ad && ad.id) || '',
    internship,
    userId: app.userId || app.studentId || '',
    appliedDate: app.appliedDate || app.createdAt || '',
    status,
    lastUpdated: app.updatedAt || app.appliedDate || app.createdAt || '',
    formData: app.formData || undefined,
    timeline,
  };
}

// notifications (shared) → frontend Notification
function mapNotifType(t) {
  if (t === 'rejection' || t === 'error') return 'error';
  if (['offer_letter_sent', 'ready_to_join', 'interview_completed', 'success'].includes(t)) return 'success';
  if (t === 'warning') return 'warning';
  return 'info';
}

function toNotification(n, fallbackUserId) {
  return {
    id: n.id,
    userId: n.recipientId || n.userId || fallbackUserId,
    title: n.title || '',
    message: n.message || '',
    date: n.createdAt || n.date || '',
    read: !!n.read,
    type: mapNotifType(n.type),
    link: n.link || undefined,
  };
}

// trainings (Coordinator) → cleaned read-only view
function toTraining(t) {
  if (!t) return null;
  return {
    id: t.id || t.trainingId || '',
    applicationId: t.applicationId || '',
    mentorName: t.mentorName || '',
    trainingModule: t.trainingModule || t.module || '',
    reportingLocation: t.reportingLocation || '',
    joiningDate: t.joiningDate || t.startDate || '',
    reportingTime: t.reportingTime || '',
    duration: t.duration || '',
    status: t.status || t.trainingStatus || '',
  };
}

module.exports = {
  toInternship,
  toApplication,
  toNotification,
  toTraining,
  mapStatus,
};
