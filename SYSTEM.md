# Internship Management System — System Handbook

> **Read this first.** This is the one authoritative description of the whole
> system: four portals, one database, one server. It was written from the code
> as of 27 Oct 2026 and is meant for coding agents and new developers.
>
> * An **identical copy** lives at the root of all five repositories
>   (`internship_officer`, `admin-internshipcell`, `Parul-Student-Portal`,
>   `Parul-respective-cell-portal`, `deploy`). The copy in **`deploy/`** is the
>   master. When you change a cross-portal fact, update all five copies in the
>   same piece of work.
> * Each repo's `docs/` folder and `README.md` were written earlier, mostly in
>   July 2026, and are **stale in many places**. Where they disagree with this
>   file or with the code, **the code wins, then this file**.
> * Each repo also has an `AGENTS.md` with the facts specific to that portal.

---

## 1. What the system does

Parul University's **Internship Cell** runs internal internships: students
intern inside university departments (Admission Cell, HR, IQAC Cell, and so
on). The system takes a student from an advertisement to a completed
internship.

```
Internship Cell posts an ad ─► student applies ─► Internship Cell interviews
  ─► selects and routes the student to ONE placement department
  ─► that department's coordinator trains and evaluates the student
  ─► Internship Cell issues the offer letter (Ready To Join) ─► Joined
  ─► Internship Completed (certificate is issued physically, on paper)
```

Four user groups means four portals. Each portal is a **separate repository**
with its own backend and frontend. All four share **one MongoDB database**.

---

## 2. The four portals and the deploy repo

| | Internship Cell ("TEC") | Admin | Student | Coordinator |
|---|---|---|---|---|
| Repo | `internship_officer` | `admin-internshipcell` | `Parul-Student-Portal` | `Parul-respective-cell-portal` |
| GitHub | `arpit15006/…` | `arpit15006/…` | `Harsh-Shrivastava1/…` | `Harsh-Shrivastava1/…` |
| Who logs in | Internship Cell officers (role `internship_cell`) | Administrators (role `admin`) | Students (role `student`, self-signup) | Department coordinators (role `coordinator`) |
| Backend | TypeScript Express, `backend/` | TypeScript Express, `backend/` | CommonJS Express, `server/` | CommonJS Express, `server/` |
| Frontend | Next.js 16.2.9 + React 19, `frontend/` | Next.js 16.2.9 + React 19, `frontend/` | Vite + React 19 SPA, `src/` | Vite + React 19 SPA, `src/` |
| Shared code | `shared/` (`@icmp/shared`: Zod schemas, types, constants) | `shared/` (`@admin/shared`) | — | — |
| Dev ports (API / UI) | 4000 / 3000 | 4100 / 3100 | **5002** / 5173 | 5001 / 5174 |
| Production URL | `https://cell.internship.paruluniversity.ac.in` | `https://admin.internship.paruluniversity.ac.in` | `https://student.internship.paruluniversity.ac.in` | `https://coordinator.internship.paruluniversity.ac.in` |
| PM2 processes | `tec-backend` (fork ×1), `tec-frontend` | `admin-backend` (fork ×1), `admin-frontend` | `student-backend` (cluster ×2) | `coordinator-backend` (cluster ×2) |
| Realtime | Socket.IO + change stream | Socket.IO + change stream | change-stream watcher (notifications), UI polls | none |

* **"TEC"** is the old internal name of the Internship Cell portal ("Technical
  Events Cell"). It survives in identifiers such as `tec-backend`, the
  `Returned to TEC Cell` status key and env names. **User-facing text must say
  "Internship Cell"** (see §12).
* **`deploy`** (`arpit15006/deploy-internshipportal`) holds no app code. It
  contains the PM2 file, the Nginx config, `redeploy.sh`, `make-env.sh` and the
  runbooks. See §10.
* The Student portal uses port **5002**, not 5000, in dev because macOS
  AirPlay holds :5000.
* The repos are currently **public**, by the owner's choice. Never commit
  secrets, real `.env` files or personal data.

```
                         ┌───────────── one VPS (Nginx + PM2) ─────────────┐
 student.*  ──► Nginx ──►│ dist/ (Vite SPA)      /api ─► student-backend :5002│──┐
 coordinator.* ─► Nginx ─►│ dist/ (Vite SPA)      /api ─► coordinator-backend :5001│─┤
 cell.*     ──► Nginx ──►│ tec-frontend :3000    /api,/socket.io ─► tec-backend :4000│─┤──► MongoDB
 admin.*    ──► Nginx ──►│ admin-frontend :3100  /api,/socket.io ─► admin-backend :4100│─┘   replica set rs0
                         └──────────────────────────────────────────────────┘    DB internship_management
 The Student SPA also calls cell.*/api (apply, withdraw, document download)
 and coordinator.*/api (training documents) directly, with a Bearer token.
```

---

## 3. The shared database

* **Name:** `internship_management`, in **both** production and dev.
  * Every backend's code default is the old name `parul_internship_system`.
    **Always set `MONGODB_DB_NAME`.**
* **Production:** a self-hosted `mongod` on the VPS, run by the `devops` user,
  listening on `127.0.0.1:27018`. It is a **replica set `rs0`** with auth on
  (`authSource=internship_management`).
  * The replica set is mandatory: change streams and the Student signup
    transaction need it.
* **Dev:** a MongoDB Atlas cluster, also named `internship_management`. It is a
  free M0 tier, so expect occasional `SSL alert number 80` handshake flakes.
  Every backend retries the connection 8 times with backoff.
* **IDs** are string `id` fields such as `USR-…`, `ST-…` or `APP-…`, not
  ObjectIds. Users and students are linked 1:1 via `users.studentId` ↔
  `students.id` and `students.userId`.

### Collections, owners and writers

**Ownership law:** one business operation has one owner backend. A backend
writes only its own collections; other portals learn about changes through
change streams. The sanctioned exceptions are listed in the table.

| Collection | Owner | Other writers (sanctioned exceptions) | Readers |
|---|---|---|---|
| `users` | Admin (admin, `internship_cell`, coordinator accounts) | **Student** creates role=`student` at signup, sets verify/reset tokens and deletes abandoned unverified signups. **Every portal** writes its own user's `lastLoginAt` and own `passwordHash`. | all |
| `students` | Student (profile) | **Admin**: only `institute`/`department` (origin fix) and `enrollmentNumber` release on delete | all |
| `advertisements` | TEC | Admin: `status` → Closed/Archived only | all |
| `applications` | TEC (whole lifecycle) | **Coordinator**: only the commands `Rejected by Department`, `Terminated` and `Internship Completed`. TEC's change-stream projector never overwrites these. | all |
| `trainings` | Coordinator | — | TEC, Admin, Student |
| `departments` (78 administrative) | Admin | — | TEC (dropdown, routing), Student (fallback list) |
| `institutes` (39 → 211 academic departments) | Admin | — | Student (signup), Admin |
| `settings` (singleton `{_key:'singleton'}`) | Admin | — | all (SMTP config) |
| `notifications` | shared, one model | each portal creates rows for its recipients and marks only its own scope read | all |
| `auditLogs` | shared, append-only | all | Admin |
| `emailLogs` | shared, append-only | all | Admin (Email Monitoring) |
| `securityEvents`, `sessions` | Admin | — | Admin |
| `rateLimits` | Student, Coordinator (cluster-shared rate-limit counters, TTL) | — | — |
| `cells`, `internships` and alias collections | **legacy** — `cells` became `departments` and `internships` was merged into `applications` | — | compatibility read layers only |

Notes:

* **Legacy alias collections.** The TEC and Admin backends still read through
  compatibility layers in `utils/compatibility.ts`. These union legacy alias
  collections (`studentApplications`, `admins`, `cellUsers`, `alerts` and so
  on) and dedupe the results by `id`.
  * Writes always go to the primary collection.
  * TEC filters, sorts and paginates in memory after full scans. This is fine
    at current scale but will not scale indefinitely.
* **Schema strictness.**
  * TEC and Admin models in `backend/src/db/models.ts` are mostly **strict**.
    An undeclared field is **silently dropped** on write: declare it first.
    TEC `applications` and `students` are `strict:false`.
  * The Student and Coordinator models are mostly empty `strict:false`
    schemas over the same collections.
* **Audit retention.** `auditLogs` rows expire through a TTL index on
  `expireAt`. `AUDIT_RETENTION_DAYS` defaults to 730.
  * The old "keep last 500 rows" cap was **removed** because public endpoints
    could have used it to evict Admin audit rows.
  * **Successful student logins are deliberately not audited.**
* **Indexes worth knowing:**
  * `applications`: partial unique index on `{advertisementId, studentId}`
    (prevents double-apply).
  * `students.enrollmentNumber_unique`: partial unique index on string values,
    so released (`null`) numbers don't collide.
  * `users.email`: unique.

---

## 4. Identity and security

| | TEC | Admin | Student | Coordinator |
|---|---|---|---|---|
| Login | email + password, role `internship_cell` | email + password, role `admin` only | enrollment no. **or** email + password | email + password, role `coordinator` |
| Cookies (httpOnly) | `icmp_access` 15m / `icmp_refresh` 7d | `admin_access` / `admin_refresh` (+ impersonation cookie) | `student_access` / `student_refresh`; the SPA also keeps the access token in localStorage (`student_access_token`) and sends it as `Authorization: Bearer` | `coordinator_access` / `coordinator_refresh` |
| Sessions | stateless JWT | **session rows** (`sessions`): revocable, force-logout | stateless JWT | stateless JWT |
| Lockout | — | after N failures (`settings.security.accountLockThreshold`, default 5) the account is **suspended** until an admin reactivates it | — | — |
| Login rate limit (app) | 50 / 15 min / IP | 50 / 15 min / IP | 500 / 15 min / IP (campus NAT), Mongo-backed so it is shared across cluster workers | 100 / 15 min / IP, Mongo-backed |

* **Shared student JWT.** The Student backend signs access tokens with
  `JWT_ACCESS_SECRET`. The TEC and Coordinator backends verify them with
  `STUDENT_JWT_ACCESS_SECRET`, which **must hold the same value**. This lets a
  student call:
  * TEC: `POST /api/applications` (apply), `DELETE /api/applications/:id`
    (withdraw, only while `Applied`) and
    `GET /api/applications/:id/documents/:type` (`application-pdf`,
    `offer-letter`). All three check that the application belongs to the
    caller.
  * Coordinator: `GET /api/student/attendance-form/:applicationId` and
    `GET /api/student/training-application/:applicationId`.
* **CSRF / Origin guard (all four backends).** Every non-GET request must carry
  an `Origin` (or `Referer`) on the allowlist (`FRONTEND_ORIGIN(S)`,
  `STUDENT_ORIGIN`). A request **with no Origin is rejected with 403**, so
  `curl` tests need `-H 'Origin: <allowed origin>'`.
* **Cookie `SameSite`** comes from `COOKIE_SAMESITE`. Production uses `strict`
  because each portal is same-origin with its own `/api`, and the
  `*.paruluniversity.ac.in` subdomains are same-site. Render/Vercel testing used
  `none` (which forces `Secure`).
* **Nginx adds** per-IP limits (`/api` 30 r/s; auth paths 10 r/min) and the
  security headers.
* **Student signup and activation:**
  * **Signup rules.** Only `@paruluniversity.ac.in` addresses are accepted. The
    Institute → Department pair must exist in `institutes`.
  * **On signup.** `users` + `students` are created in one transaction with
    `emailVerified:false` and a **24 h** verification link, sent with the
    `welcome` template. The response is `202` and creates no session.
  * **Login of an unactivated account.** The password is checked **first**,
    then a 403 says "Your account is not activated yet…". The response never
    reveals whether the account is activated to someone without the password.
  * **Re-signup with the same email or enrollment while unactivated:**
    * While the link is live, the signup is refused with "…sign up again in
      about N hours" and the student is pointed to **Resend activation link**
      (`/verify-email` with no token).
    * Once the link has expired, the abandoned account is hard-deleted and the
      new signup replaces it.
  * **Resend** issues a fresh 24 h link.
  * **Forgot password** emails a 30-minute single-use reset link.
* **Admin user management:**
  * Admin creates admin, Internship Cell and coordinator users. Students are
    **never** created by Admin.
  * Deleting a user is a **soft delete** (`isDeleted`, `deletedAt`, suspended,
    sessions revoked).
  * Deleting a student also releases the enrollment number (`null`) so the
    person can sign up again. Lookups everywhere prefer live rows over deleted
    ones.
* **Break-glass admin.** `npm run seed:breakglass` creates an admin hidden from
  User Management. Its credentials are handed to the university directly.

---

## 5. Application lifecycle (the core cross-portal flow)

Canonical statuses (TEC `shared/constants.ts`): `Applied`,
`Interview Scheduled`, `Selected For Training`, `Training In Progress`,
`Training Completed`, `Rejected`, `Ready To Join`, `Joined`,
`Rejected by Department`, `Terminated`, `Internship Completed`.

| Step | Status change | Who / where | Side effects |
|---|---|---|---|
| Apply | → `Applied` | Student SPA → **TEC** `POST /api/applications` | Ad must be Published. `minCGPA` is checked against the self-reported CGPA. Duplicates are refused (409). Generates the application PDF. Emails `application_submitted` (PDF attached) to the student. |
| Withdraw | deleted | Student → TEC | Only while `Applied`; hard delete |
| Shortlist | `Applied` → `Interview Scheduled` | TEC officer | Stores interview details; optional `interview_scheduled` email. Bulk shortlist uses today + 7 days, 10:00, "Internship Cell Office". |
| Reject | → `Rejected` | TEC officer | Reason required (enum); optional email |
| Interview complete | `Interview Scheduled` → `Selected For Training` | TEC officer | **Sets `assignedDepartment`**: one of the ad's `placementDepartments`, chosen by radio and validated server-side. Emails `selected_for_training`. The student now appears in that department's Coordinator portal. |
| Training starts | → `Training In Progress` | **Coordinator** writes `trainings` (ACTIVE) → **TEC change stream** projects the status | The projector only advances statuses and never clobbers later ones |
| Training completes | → `Training Completed` | Coordinator writes `trainings` (COMPLETED, plus evaluation) → TEC projects | `training_completed` email to the Internship Cell inbox (`COORDINATOR_EMAIL`) |
| Ready to join | `Training Completed` → `Ready To Join` | TEC officer | Requires the training to be COMPLETED with feedback, attendance and a recommendation. Stores joining details. Emails the **offer letter PDF** (`offer_letter`). |
| Mark joined | `Ready To Join` → `Joined` | TEC officer | `student_joined` email to the Internship Cell inbox |
| Rejected by Department | from Selected For Training / Training In Progress / Training Completed / Ready To Join | **Coordinator** (pre-join; reason mandatory) | Cancels active trainings; notifies the student + Internship Cell, by email and in-app |
| Terminate | `Joined` → `Terminated` | **TEC or Coordinator** (reason mandatory) | Notifies the student + Internship Cell + department |
| Complete internship | `Joined` → `Internship Completed` | TEC or Coordinator | `internship_completed` email. The certificate is **physical**: the generator exists in TEC but is unused. |

After any closing status the student **may apply to other internships**.

### Who reacts to what (change streams)

* **TEC backend** (`backend/src/realtime/changeStream.ts`):
  * Watches applications, ads, notifications, emailLogs, students, auditLogs,
    securityEvents, departments and **trainings**.
  * Emits Socket.IO `data:changed {resource, action, id}` events.
  * On `trainings` changes it **persists** `applications.status`
    (`projectTrainingStatus`). It sets `status` only, not `applicationStatus`;
    reads use `applicationStatus ?? status` and also overlay the training
    state at read time.
* **Admin backend** (`backend/src/realtime/changeStream.ts`): watches most
  collections and emits `data:changed` for React Query invalidation. It does
  not watch `institutes` or `settings`.
* **Student backend** (`server/utils/applicationWatcher.js`):
  * Watches `applications` update/replace events and creates **in-app
    notifications only**, from one message per status (`STATUS_MESSAGES`).
  * Deduplicated by `dedupeKey` `app:<id>:<status>`.
  * Runs only on PM2 instance 0; `WATCHER_ENABLED` overrides this.
  * `GET /me/notifications` also reconciles missed notifications.
* **Coordinator** has no watcher. It reads `applications` where
  `assignedDepartment` equals the coordinator's `users.department`.

> **TEC and Admin backends must stay PM2 fork × 1.** Two instances would
> double-process change events (duplicate status writes and duplicate emails)
> and break Socket.IO without sticky sessions. Student and Coordinator are
> stateless (the watcher is instance-gated) and are clustered.

### Documents

| Document | Generated by | When / how the student gets it |
|---|---|---|
| Application form PDF | TEC (`documentService.ts`, pdf-lib) on apply; the Student SPA can also render it client-side (`src/utils/generatePDF.ts`) | Attached to the `application_submitted` email; downloadable |
| **Offer letter** | TEC, **regenerated on every download** | Emailed at Ready To Join. Download is allowed in status Ready To Join / Joined / Internship Completed, with an owner check. |
| Attendance form, training application letter | Coordinator (`server/services/documentService.js`) → `server/storage/documents/` | Student downloads them from the Coordinator API |
| Completion certificate | — | Physical, on paper (decision) |

**Offer letter content** (reviewed by the Internship Cell, Oct 2026):

* **Header and signatory:** "Internship Cell".
* **Reference format:** `PU/IC/INT/…`.
* **Rows:** Position / Department, Start Date / Reporting Time, Reporting
  Venue / Duration.
* **Department** is **where the internship happens**: `assignedDepartment`,
  else the ad's only placement department. It is **never** the student's
  academic department.
* **Seal:** reads "PU · INTERNSHIP CELL · OFFICIAL".
* **Removed:** Stipend, Status and Reporting Instructions.
* `offerLetterNotes` still prints.
* All server-rendered dates are in IST: PM2 sets `TZ=Asia/Kolkata`.

---

## 6. Email

* **SMTP source, in order:**
  1. **Admin → System Settings → Email**, stored in `settings.email`
     (`smtpHost`, `smtpPort`, `smtpUsername`, `smtpPassword`, `fromAddress`).
     All four portals read it; it is cached for 60 s and the pooled transport
     is rebuilt when it changes.
  2. The `SMTP_*` env vars.
  3. An **Ethereal** test inbox. This means **no real delivery**, which can be
     mistaken for "mail is working".
* **Production** uses Gmail SMTP (`smtp.gmail.com:587`, sender
  `collegepurposeparul@gmail.com`, Gmail App Password).
* **There is no "send test email" button in Admin.** `POST /api/test/email`
  exists only when `NODE_ENV !== 'production'`.
* **`sendTemplateEmail`** (in every backend) retries 3 times, **never throws**
  (fire-and-forget) and always appends to `emailLogs`. Admin → Email
  Monitoring lists those rows and can resend them, except mails that carried
  credentials.
* **Internship Cell inbox rule** (college decision):
  * The inbox (`COORDINATOR_EMAIL` in TEC, `TEC_NOTIFY_EMAIL` in Coordinator)
    receives **only** `training_completed`, `student_joined` and the
    reject/terminate alerts.
  * There is **no** mail to it for new applications.
* **Advertisement email was REMOVED** (decision, 26 Sep 2026). The college
  mails ads by hand. There is no audience targeting, no `sendEmail` toggle, no
  institute/department email aliases and no `new_advertisement` template.
  **Do not reintroduce any of this.** Institutes and departments remain pure
  signup and placement master data.
* **Testing mail:** send only to the project owner's own address (ask them).
  Never send to real students or college staff.

---

## 7. Master data

* **Institutes:** 39 institute **codes** (PIET, PIT, …) → **211 academic
  departments**, stored in `institutes`.
  * Used only for student signup (cascading dropdown) and the student profile.
  * An institute code or department name is **locked once students are
    registered under it**: Admin returns 409 on rename or delete.
* **Administrative departments:** 78 (ADMISSION CELL, HR DEPARTMENT, IQAC
  Cell, …), stored in `departments`.
  * This is where internships happen: ad `placementDepartments[]`, routing and
    coordinators.
  * **One department = one coordinator.** The Admin "create coordinator"
    dropdown shows only unclaimed departments. The link is stored as
    `departments.coordinatorId/coordinatorName` and `users.department`.
* **Seeding:** Admin `npm run seed:master` loads both lists from
  `backend/src/data/*.json`. It is insert-only and safe to re-run.
* **Source spreadsheets and the original college spec** (`CHANGE_REQUESTS.md`)
  are in the owner's local workspace, not in any repo. Part A3 and Part B.1b/2
  of that spec (email aliases, targeting) are **superseded**; see §6.
* **Display rule:** dropdowns must show full department names. The Select
  popups widen to fit and wrap long names.

---

## 8. Branding and naming

* **Name:** "Internship Cell" everywhere users can see it: UI, emails, PDFs.
  * Never "TEC Cell", "Technical Events Cell", "Training & Placement" or
    "T&P".
  * Internal identifiers keep their old names: `tec-backend`, the role
    `internship_cell`, and the status key `Returned to TEC Cell`, which is
    displayed as "Returned to Internship Cell".
* **Logo:** "Parul University | NAAC A++".
  * Masters (`parul-university-logo.svg`, `-white.svg`, `-icon.svg`) are in
    the owner's workspace root.
  * Copies are in each frontend's `public/` and in TEC
    `backend/src/assets/` as PNGs for the PDFs.
  * It is used for favicons, sidebars (`h-9`), login pages and PDFs.
* **Fonts:** Inter and JetBrains Mono are **self-hosted** via `next/font/local`
  in `frontend/src/app/fonts/` of both Next apps. Never use
  `next/font/google`: the production server cannot resolve DNS at build time
  (§10).

---

## 9. Local development

```bash
# backends (each from its own folder, needs its .env)
cd internship_officer/backend            && npm run dev   # :4000  (tsx watch)
cd admin-internshipcell/backend          && npm run dev   # :4100
cd Parul-Student-Portal/server           && npm run dev   # :5002  (nodemon)
cd Parul-respective-cell-portal/server   && npm run dev   # :5001
# frontends
cd internship_officer/frontend           && npm run dev   # :3000
cd admin-internshipcell/frontend         && npm run dev   # :3100
cd Parul-Student-Portal                  && npm run dev   # :5173
cd Parul-respective-cell-portal          && npm run dev   # :5174
```

* The Next apps proxy `/api` to their backend through rewrites (`API_ORIGIN`).
  `NEXT_PUBLIC_API_BASE_URL` makes the browser call the backend directly.
* The Student SPA needs `VITE_STUDENT_API_URL`, `VITE_TEC_API_URL` and
  `VITE_COORDINATOR_API_URL`. The TEC and Coordinator URLs are **required**,
  with no fallback.
* The Coordinator SPA needs `VITE_API_URL`.
* `GET /api/health` returns 200 **without** querying the DB, so a 200 does not
  prove Mongo is connected. Check the "MongoDB connected" log line.
* Next 16 keeps a dev lock in `.next/dev`. A stale lock blocks restart: delete
  that folder.
* TEC/Admin type builds: `npm run build` (`tsc && tsc-alias`) outputs to
  `dist/backend/src/server.js`. `models.ts` uses a loose-schema type escape to
  avoid a tsc out-of-memory crash; keep it.

---

## 10. Production deployment

### The server

* Ubuntu 24.04 VM, internal IP `10.3.0.39`, user **`devops`**, **no sudo**.
  * Nginx, TLS certificates, systemd and DNS belong to the university IT team.
* Node 22 via `nvm`; PM2 runs as `devops`.
* **Layout** (`APP_ROOT=/home/devops/app`):

  ```
  /home/devops/app/{deploy, internship_officer, admin-internshipcell,
                    Parul-Student-Portal, Parul-respective-cell-portal}
  ```

  Each is its own git clone on `main`.
* **Process file:** `deploy/ecosystem.config.js`. It defines 6 PM2 apps (4
  backends + 2 Next servers) and sets `NODE_ENV=production`,
  `TZ=Asia/Kolkata`, a 12 s `kill_timeout` and memory restarts.
* **Nginx** routes by hostname. The template is `deploy/nginx.conf`; the live
  config needs root to install, so it goes through IT.
  * The two **Vite SPAs are served straight from each repo's `dist/`**, so
    `deploy/redeploy.conf` on the server should set `STATIC_STUDENT=` and
    `STATIC_COORDINATOR=` **empty**. With the defaults (`/var/www/...`) the
    copy step fails without sudo.
  * `/api` and `/socket.io` are proxied to the backends.
* **Env files:** created once on the server by `deploy/make-env.sh`, which
  writes 8 `.env` files (4 backends + 4 frontend `.env.production`) and
  generates the secrets. They are `chmod 600` and never committed.
  `deploy/ENV_REFERENCE.md` lists every variable.

### Shipping a change

1. Build and test locally, then push to `main` in the portal's repo. **Whatever
   is on `main` ships.**
2. On the server: `cd ~/app/deploy && ./redeploy.sh`.
   * It pulls all repos and rebuilds **only the parts whose files changed**.
   * It builds before it reloads: a failed build leaves the running version
     untouched and rewinds the checkout.
   * It installs dependencies only when a lockfile or package manifest
     changed. Edits under TEC/Admin `shared/` source do **not** trigger
     `npm ci`.
   * It health-checks the backends.
   * Flags: `--dry-run`, `--force`, `--only <tec|admin|student|coordinator>`,
     `--rollback <portal>`. A `deploy/HOLD` file pauses runs.
   * Log: `LOG_FILE` in `redeploy.conf` (use `~/redeploy.log`; the default
     `/var/log/...` is not writable without sudo).
3. The automatic 6-hourly cron is documented but **not enabled**. Deploys are
   run by hand.

### Known server limitations (Oct 2026)

* **DNS on the server is broken** (`127.0.0.53` resolves nothing), although
  outbound HTTPS by IP works. Workarounds in place:
  * Git: `git config --global http.curloptResolve` pins GitHub's IPs. Remove it
    once IT fixes DNS: `git config --global --unset-all http.curloptResolve`.
  * Builds must need **no network**, hence the self-hosted fonts.
  * **Adding or upgrading an npm dependency will fail on the server** until
    DNS is fixed (`npm ci` cannot reach the registry).
* **`pm2 startup` needs sudo, so it is not configured.** After a reboot run
  `pm2 resurrect`, and run `pm2 save` after changing processes.
* **Backups:** only manual `mongodump` archives to `~/backups/`. There is no
  scheduled backup yet. Take one before any destructive step.
* **SMTP:** port 587 to Gmail works; the server sends mail.

### Data maintenance scripts (Admin backend, `cd ~/app/admin-internshipcell/backend`)

| Command | Effect | Guard |
|---|---|---|
| `npm run seed:mongo` | Creates the first admin, an optional officer and the `settings` singleton | Never resets an existing password unless `SEED_ADMIN_FORCE_PASSWORD=true` |
| `npm run seed:master` | Institutes + administrative departments | Insert-only |
| `npm run seed:breakglass` | Hidden emergency admin | Strong-password checks |
| `SEED_WIPE_CONFIRM=WIPE-DEMO-DATA [SEED_WIPE_LOGS=true] npm run seed:wipe-demo` | **Destructive.** Deletes students, applications, ads, trainings, notifications, emailLogs, sessions, and **student + coordinator users**. With `SEED_WIPE_LOGS=true` it also deletes auditLogs, securityEvents and rateLimits. Keeps admin/officer users, departments, institutes and settings. | Confirm token + `MONGODB_DB_NAME` must match the connected DB |
| `npm run repair:deleted-students [-- --apply]` | Releases enrollment numbers of deleted students | Report-only by default |
| `npm run cleanup:ad-email [-- --apply]` | Strips ad-email leftovers (aliases, targeting) | Report-only by default; already applied in production |

* **After a wipe:** delete generated PDFs with
  `find …/storage/{documents,resumes} -type f ! -name .gitkeep -delete`, then
  log in again and **re-create coordinators** in Admin.
* **Never run TEC's `npm run seed` (`backend/src/seed.ts`) against
  production.** It deletes and re-inserts ads, applications and logs.
* `createUser.ts` (TEC and Admin) falls back to a weak default password; avoid
  it.

---

## 11. Decision log (why things are the way they are)

| When | Decision | Why |
|---|---|---|
| Jul 2026 | Four separate repos and backends, **one shared MongoDB**, single-writer ownership law, sync through change streams | Teams and portals evolved separately; merging was rejected |
| Jul 2026 | `applications.status` is a **physical, persisted** field. TEC projects the training state into it. | The Student portal reads stored status |
| Jul 2026 | Production on **one VPS with PM2 + Nginx**; TEC/Admin fork ×1; Student/Coordinator clustered | Simplicity; the change-stream and socket constraints |
| Jul 2026 | `COOKIE_SAMESITE` made env-driven | Render ↔ Vercel cross-site testing needed `none` |
| 22 Jul 2026 | College restructure (`CHANGE_REQUESTS.md`): **Cell → Department**; 78 admin departments with one coordinator each; 39 institutes / 211 academic departments for signup, **locked after signup**; ads visible to all students; routing radio at interview-complete; **Rejected by Department** and **Terminated** statuses; the Internship Cell inbox gets only milestone mails | College requirements |
| Jul–Sep 2026 | Audit 500-row cap → **TTL retention (730 d)**; student logins not audited | Public endpoints could evict Admin audit rows |
| Sep 2026 | SMTP configured in **Admin System Settings**, shared by all portals, with env as fallback | One place to change mail credentials |
| Sep 2026 | Student **email verification** before first login | Proves ownership of the college address |
| 26 Sep 2026 | **Ad email, aliases and targeting removed**; the data was cleaned (`cleanup:ad-email`) | "Major decision": the college sends ad mail manually |
| 26 Sep 2026 | Unified Parul NAAC A++ logo; **"Internship Cell" naming** everywhere; T&P / Training & Placement mentions removed | Branding |
| 5 Oct 2026 | Offer letter reworked: fields, wording, department = placement department, PU seal | Reviewed by the Internship Cell |
| 5 Oct 2026 | Fonts self-hosted; `redeploy.sh` never uses sudo and never prompts for git credentials | The server has no sudo, no DNS and no TTY |
| 5 Oct 2026 | **Go-live wipe** of test data (logs too) | Clean slate |
| 6 Oct 2026 | Unactivated signups free up 24 h after the last link; login says "not activated" | Students whose mail failed were locked out forever |
| 7 Oct 2026 | An outside security test hit production: `sectest_*` / `ratelimit*` signups, and brute force on a non-existent `admin@paruluniversity.ac.in`. Role injection was blocked, unverified accounts could not log in, and the unknown email gave no foothold. | Signup rate limits are lenient **by design** (campus NAT); a separate stricter signup limit is a possible improvement |

---

## 12. Rules for coding agents

1. **Ask before behavioural or "major" changes**, and when anything is
   unclear. The owner (Arpit) often writes in Hinglish. Keep other features
   untouched when asked to change one.
2. **Commits:** never add AI co-author or "Generated with" trailers. Push only
   when the owner asks.
3. **Do not edit `.env` files or secrets** unless explicitly asked. Never
   commit them. The repos are public.
4. **Test email only to the owner's own address.** Never mail real students
   or college staff from tests.
5. **Production:** you have no access, and you never run destructive commands
   for the owner without an explicit request. Give the owner commands to run,
   with a backup step first.
6. **Respect ownership** (§3). If a feature needs another portal's collection,
   go through that portal's API or a change stream, or ask.
7. **Adding a status, email template, audit action or notification type**
   means updating every map, or values silently fall back:
   * TEC: `shared/constants.ts`, `STATUS_FROM_SHARED` (mappers), `AUDIT_ACTIONS`
     (TEC `recordAudit` **throws** on unknown actions → 500 after a partial
     write), `EMAIL_TEMPLATE_LABELS`, `NOTIFICATION_TYPES`.
   * Student: `server/utils/mappers.js` `STATUS_MAP`,
     `applicationWatcher.js` `STATUS_MESSAGES`, `StatusBadge`.
   * Coordinator: `utils/mappers.js` `deriveStatus`.
   * Admin: the analytics/report status mapping.
8. **New field on a strict TEC/Admin model** → declare it in
   `backend/src/db/models.ts` first, or it is dropped silently.
9. **Next.js 16** has breaking changes: read `frontend/AGENTS.md` and
   `node_modules/next/dist/docs/` before writing Next code. No build-time
   network fetches.
10. **Never** reintroduce ad email or aliases (§6). Never cluster TEC/Admin
    backends (§5). Never use "TEC Cell" or "T&P" in user-facing text (§8).
11. Keep this file true: if you change something listed here, update all five
    copies.

---

## 13. Known issues and tech debt (verified against the code, 27 Oct 2026)

| # | Where | Issue |
|---|---|---|
| 1 | Student `server/utils/mappers.js` | `STATUS_MAP` has no `Rejected by Department` or `Terminated`, so it falls back to **`Applied`**. The student sees the wrong status after a department rejection or termination. |
| 2 | Admin settings page | Saving the Email card without retyping the password sends `smtpPassword:""`, which clears the stored password. Mail then silently falls back to env `SMTP_PASS`. The backend ignores only `********`. |
| 3 | TEC, Student, Coordinator `/auth/refresh` | They don't re-check `status` / `isDeleted`, so a suspended or deleted user keeps a session for up to 7 days. Admin is safe because it is session-backed. |
| 4 | Coordinator SPA | Never calls `/auth/refresh`, so sessions end when the 15-minute access cookie expires |
| 5 | Student `/me/profile` | Lets students edit institute, department and semester, contradicting "locked after signup". `degree` and `passingYear` are accepted but dropped by validation. |
| 6 | TEC projector | Writes `status` but not `applicationStatus`; reads rely on `applicationStatus ?? status` plus the read-time training overlay |
| 7 | TEC data layer | Compatibility reads do full collection scans with in-memory filter and pagination |
| 8 | Email | `emailLogs.provider` reflects env only. Coordinator ignores `settings.fromAddress`. |
| 9 | Socket.IO (TEC, Admin) | No socket auth. Payloads are only `{resource, action, id}`. |
| 10 | TEC notifications | `audience` is not in the strict schema and is dropped; officer feed works through a shape fallback |
| 11 | Admin root `npm run seed` | Broken: there is no backend `seed` script |
| 12 | Student and Coordinator notifications | Training notifications to students carry `assignedDepartment`, so they also show in the coordinator feed |
| 13 | Ops | No scheduled backups, no `pm2 startup`, server DNS broken, auto-deploy cron off (§10) |
