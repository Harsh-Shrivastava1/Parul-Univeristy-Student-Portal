const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Application = require('../models/Application');
const Advertisement = require('../models/Advertisement');
const { loadIdentity, studentMatch } = require('../utils/identity');
const { toApplication } = require('../utils/mappers');

/**
 * Read-only application access for the Student Portal.
 *
 * WRITES (create/withdraw) are NOT served here — the `applications` collection
 * is owned by the TEC Cell backend, which exposes the student-authenticated
 * POST /applications and DELETE /applications/:id. The Student Portal frontend
 * targets the TEC API (VITE_TEC_API_URL) for those writes and never mutates the
 * collection itself.
 */

// GET /api/applications/:id — own application (read-only)
const getOne = asyncHandler(async (req, res) => {
  const identity = await loadIdentity(req.user.sub);
  if (!identity) throw new ApiError(404, 'Account not found.');

  const app = await Application.findOne({
    id: req.params.id,
    ...studentMatch(identity.user, identity.student),
  }).lean();
  if (!app) throw new ApiError(404, 'Application not found.');

  const ad = app.advertisementId
    ? await Advertisement.findOne({ id: app.advertisementId }).lean()
    : null;
  res.json({ success: true, data: toApplication(app, ad) });
});

// The create and withdraw handlers that used to live here have been REMOVED.
//
// They were a second writer for a collection the TEC backend owns, and they
// enforced none of its rules: no Published/not-deleted check on apply, no
// status gate on withdraw, no advertisement counter, no audit. The SPA retried
// them whenever the TEC call threw — which apiClient does on every non-2xx —
// so a deliberate TEC refusal was silently converted into a successful write.
// The create handler also passed an uncast request value straight into a query
// predicate against a schemaless model, which made it an operator-injection
// sink that disclosed unpublished advertisements.
//
// Do not re-add them. If a write must be served from this portal, it has to
// carry the same gates, and the ownership model in docs/DATABASE.md has to
// change with it.

module.exports = { getOne };
