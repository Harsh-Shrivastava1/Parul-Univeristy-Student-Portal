# Student Portal — Security

## Authentication
- Passwords hashed with **bcrypt** (`BCRYPT_ROUNDS`, default 12).
- **JWT** access (15m) + refresh (7d) tokens in **httpOnly cookies**
  (`student_access` / `student_refresh`).
- Secrets are **required at startup** — the server refuses to boot without
  `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (no dev fallback).
- `POST /auth/refresh` rotates both tokens. Login returns a **uniform** error to
  avoid credential enumeration.

## Authorization
- `requireAuth` (verify cookie) + `requireStudent` (role === 'student') guard
  every `/me/*`, `/notifications/*`, `/applications/:id`, `/advertisements/*`.
- Public: `/auth/login|register|refresh`, `/departments`, `/api/health`.
- All reads/mutations are **identity-scoped** (`utils/identity.js`
  `studentMatch` / recipient filters / `app.userId === sub`) — no IDOR.
- Cross-portal ownership enforced: the Student Portal never writes
  `applications`; the TEC backend verifies the shared student JWT for its
  student-facing write routes.

## Rate limiting
- `express-rate-limit`: 10 requests / 15 min / IP on `/auth/login`,
  `/auth/register`, `/auth/change-password`. Authenticated API is unthrottled.
- `trust proxy` enabled for correct client IPs behind a reverse proxy.

## Validation
- Backend is authoritative (`utils/validation.js`): trimming, email
  normalization, phone/URL format, max-lengths (name/email/address/URL/phone/
  emergency), skills-array cap. Applied to registration and `PATCH /me/profile`.
  Enrollment/department/semester/academic fields are immutable server-side.
- Frontend (zod) validation is UX-only.

## Headers
- **Helmet** default set: `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, HSTS (prod), etc. JSON API — no HTML CSP required. Request
  body capped at 1 MB.

## Cookies
- `httpOnly`, `SameSite` env-driven (default `strict`), `Secure` in production
  (forced when `SameSite=none`). Access-cookie `maxAge` (15m) and refresh (7d)
  match the token TTLs.

## Audit logs
- Appended to the shared `auditLogs` collection (`services/auditService.js`):
  `STUDENT_REGISTERED`, `AUTH_LOGIN`, `AUTH_LOGIN_FAILED`, `AUTH_LOGOUT`,
  `PASSWORD_CHANGED`, `PROFILE_UPDATED`. Best-effort (never blocks the action).
  Errors are logged internally via the structured JSON logger; generic 500s are
  returned to clients (no stack/DB detail leakage).

## Database constraints
- Unique indexes on `users.email` and `students.enrollmentNumber`; duplicate-key
  errors mapped to friendly 409s; registration is atomic.

## Security assumptions
- All traffic over **HTTPS** in production (required for Secure cookies).
- The four portals share the DB **and the student JWT secret** must be identical
  on the Student and TEC backends.
- CORS allowlists list exact origins (never `*`).

## Known residual risks (accepted / deferred)
1. **Stateless-JWT revocation** — logout clears cookies client-side but a stolen
   token stays valid until expiry; **password change does not invalidate
   existing access tokens**. Exposure is bounded by the 15-minute access TTL.
   Full revocation needs a `tokenVersion`/denylist (session store) — deferred.
2. **Frontend silent refresh not wired** — `/auth/refresh` exists but the SPA
   does not call it on 401; the access token expiring forces a re-login.
3. **Cross-site cookies** require `SameSite=None; Secure` — misconfiguration
   for a cross-site deployment breaks apply/withdraw/document flows.
