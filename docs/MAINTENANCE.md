# Student Portal — Maintenance Notes

The Student Portal is **feature-complete and frozen**. This file tracks deferred
work, known limitations, and technical debt for future maintainers.

## Reserved (planned) infrastructure — intentionally retained, not yet used
| Dependency | Where | Why retained |
|---|---|---|
| `nodemailer` | backend | Planned direct email infrastructure (email is currently sent by the owning backend on business events). |
| `socket.io` | backend | Planned realtime notifications. |
| `socket.io-client` | frontend | Client half of the planned realtime feature. |
| `@tanstack/react-query` | frontend | Provider is mounted; reserved for a future data-fetching layer (no hooks used yet). |

> Per project decision these are kept for roadmap use. Remove them if the
> realtime/email/data-layer roadmap items are dropped.

## Deferred work
- **Password-change session invalidation** — needs a `tokenVersion` claim or a
  refresh-token denylist (session store). Deferred; bounded by the 15m access TTL.
- **Frontend silent refresh** — wire an `apiClient` interceptor to call
  `POST /auth/refresh` on 401 and retry, so sessions survive access-token expiry
  without a manual re-login.
- **Attendance Form generation** — owned by the Coordinator backend (not built).
  The download button surfaces a "not available yet" error until it exists.
- **Coordinator/TEC split** — training and application reads are currently served
  by the Student backend as a read gateway. When the Coordinator backend exists,
  point `VITE_COORDINATOR_API_URL`/`VITE_TEC_API_URL` at the owners (frontend is
  already owner-aware; no code change beyond env).

## Known limitations
- **Unique-index migration** — deploying the new unique indexes requires clean
  data; dedupe existing `users.email` / `students.enrollmentNumber` first.
- **`/me/documents`** endpoint exists but is not consumed by any page (documents
  are downloaded directly via the TEC endpoint). Kept as a valid read endpoint.
- **No automated tests** — verification to date is manual + `node --check`
  (backend) and static analysis (frontend). Add unit/integration tests.
- **No CI build verification performed in-repo** — run `npm install`,
  `tsc`/`vite build`, and `npm audit` in CI.

## Technical debt
- **Duplicate `genId` helpers** — small ID generators are duplicated across
  `authService.js` and `auditService.js` (and mirrored in the TEC backend).
  Consolidating into one util is behavior-neutral but was deferred to avoid
  untested refactors during the freeze.
- **Status vocabulary translation** — the DB stores the TEC 8-value status
  vocabulary; the UI uses a 14-value canonical enum, bridged by
  `server/utils/mappers.js`. A single end-to-end vocabulary would remove the
  translation but requires cross-portal changes.

## Future enhancements (roadmap candidates, out of current scope)
- Realtime notifications (socket.io) replacing polling.
- Direct transactional email (nodemailer) for confirmations.
- React Query adoption for caching/refetching.
- Session revocation store enabling true logout / password-change invalidation.

No new feature development should occur after the freeze — only bug fixes,
dependency updates, and maintenance.
