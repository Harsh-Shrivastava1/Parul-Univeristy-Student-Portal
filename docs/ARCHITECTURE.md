# Student Portal — Architecture & Overview

The Student Portal is one of **four independent applications** (Student, Coordinator,
TEC Cell, Admin) that share **one MongoDB database** (`parul_internship_system`).
It is the student-facing app: students self-register, browse internship
advertisements, apply, track status, view training, download documents, and
manage their own personal profile.

- **Frontend:** Vite + React 19 + TypeScript SPA (`src/`).
- **Backend:** Node + Express + Mongoose (CommonJS) in `server/`, default port `5000`.
- **Auth:** JWT in httpOnly cookies (`student_access` / `student_refresh`).

## Responsibilities

The Student Portal **owns** (writes):

| Domain | Collection(s) |
|---|---|
| Student account creation (self-registration) | `users` (role=student only) |
| Student profile — personal fields | `students` |
| Own auth/session | (cookies; no session collection) |
| Own notification `read`/delete | `notifications` (recipient-scoped) |
| Its own audit trail | `auditLogs` (append-only, shared) |

It **reads** (never writes) collections owned by sibling portals:
`advertisements` (TEC), `applications` (TEC — writes go to the TEC API),
`trainings` (Coordinator), `departments` (Admin).

## Ownership boundaries (the law)

> Only the owning backend writes a collection. No backend writes another
> domain's collection. Cross-domain effects flow through business events.

- The Student Portal **never writes `applications`** — "apply" and "withdraw"
  call the **TEC backend** (`VITE_TEC_API_URL`), which owns the applications
  collection and performs validation, duplicate checks, audit, notifications,
  and workflow status. Document generation/download is also TEC-owned.
- Student account creation writes `users(role=student)` + `students` — a
  disjoint operation from Admin's user governance (one operation, one owner).

## Flows

**Registration** → `POST /auth/register` (Student BE): validate → check unique
email/enrollment → bcrypt hash → **atomic transaction** creating `users`
(role=student) + `students`, linked `users.studentId ↔ students.id` → issue
session cookies (auto-login) → audit `STUDENT_REGISTERED`.

**Authentication** → `POST /auth/login` (uniform error, rate-limited) → cookies;
`POST /auth/refresh` rotates both tokens; `POST /auth/logout` clears cookies.
All audited.

**Profile** → `GET /me/profile` (merged users+students view). `PATCH /me/profile`
updates **only** personal fields (phone/email/address/skills/linkedIn/portfolio/
emergencyContact); enrollment/department/semester/academic are immutable
(rejected server-side, read-only in UI). Audited `PROFILE_UPDATED`.

**Application** → browse via `GET /advertisements` → apply via **TEC** `POST /applications`
(student-authenticated) → track via `GET /me/applications` + `GET /applications/:id`
(read gateway). Withdraw (while `Applied`) via **TEC** `DELETE /applications/:id`.

**Training** → `GET /me/training` (read gateway over Coordinator-owned `trainings`).
Displayed on the Training/Internship pages.

**Notification** → `GET /me/notifications` (recipient-scoped); mark read /
read-all / delete on the shared `notifications` collection.

**Document** → generated & stored by the **TEC backend** (references + metadata on
`applications.documents{}`; binaries on disk). Download via TEC
`GET /applications/:id/documents/:type`. Attendance Form is Coordinator-owned
(pending that backend).

## Folder structure

```
Parul-Student-Portal/
├── docs/                      # this documentation
├── server/                    # backend (Express + Mongoose, CommonJS)
│   ├── config/                # env.js (config + cookie policy), db.js, logger.js
│   ├── models/                # User, Student, Department, Advertisement,
│   │                          #   Application, Training, Notification, AuditLog
│   ├── controllers/           # auth, me, advertisement, application,
│   │                          #   notification, department
│   ├── services/              # authService, auditService
│   ├── routes/                # auth, me, advertisement, application,
│   │                          #   notification, department, index
│   ├── middleware/            # auth (requireAuth/requireStudent), rateLimit,
│   │                          #   errorHandler
│   ├── utils/                 # auth (bcrypt/JWT), ApiError, asyncHandler,
│   │                          #   identity, mappers, validation, http
│   └── index.js               # app bootstrap (helmet, cors, routes)
└── src/                       # frontend (Vite + React)
    ├── pages/                 # Login, Register, Dashboard, Internships,
    │                          #   InternshipDetails, ApplicationForm,
    │                          #   MyApplications, ApplicationStatus, Training,
    │                          #   Internship, Profile, Notifications, NotFound
    ├── components/            # shared/ (PageHeader, EmptyState, StatusBadge)
    │                          #   + ui/ (shadcn primitives)
    ├── layouts/               # AuthLayout, DashboardLayout
    ├── hooks/                 # useAuth
    ├── lib/                   # apiClient (owner-aware bases), utils (cn)
    ├── services/              # thin API clients (auth, profile, internship,
    │                          #   application, notification, training,
    │                          #   document, department)
    └── types/                 # index.ts (shared TS entities)
```

See [API.md](./API.md), [ENVIRONMENT.md](./ENVIRONMENT.md),
[DATABASE.md](./DATABASE.md), [SECURITY.md](./SECURITY.md),
[MAINTENANCE.md](./MAINTENANCE.md).

## Local development

```
# Backend
cd server && npm install && cp .env.example .env   # set MONGODB_URI + JWT secrets
npm run dev                                         # http://localhost:5000

# Frontend
cd .. && npm install && cp .env.example .env        # set VITE_TEC_API_URL
npm run dev                                          # http://localhost:5173
```
The **TEC backend must also be running** (default `:4000`) for apply/withdraw/
document downloads, and its `STUDENT_JWT_ACCESS_SECRET` must equal this
backend's `JWT_ACCESS_SECRET`.

## Production deployment

1. Set all required env vars (the server refuses to boot without JWT secrets).
2. **Migrate/dedupe** existing `users.email` / `students.enrollmentNumber`
   before the unique indexes build.
3. Configure cookies for your topology: same-site → `COOKIE_SAMESITE=strict`;
   cross-site (SPA and TEC API on different domains) → `COOKIE_SAMESITE=none`
   (forces Secure, requires HTTPS).
4. Serve over HTTPS behind a proxy (`trust proxy` is enabled for correct IPs).
5. Run `npm run build` (frontend) and deploy the static bundle + the Node API.
