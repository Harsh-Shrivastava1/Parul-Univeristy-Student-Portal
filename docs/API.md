# Student Portal — API Reference

Two backends serve the Student Portal frontend, addressed via owner-aware base
URLs (`src/lib/apiClient.ts`):

- **Student backend** (`VITE_STUDENT_API_URL`, default `http://localhost:5000/api`)
- **TEC backend** (`VITE_TEC_API_URL`, default `http://localhost:4000/api`) — owns applications + documents

All responses use the envelope `{ success: boolean, data?, error? }`.
Auth is via the httpOnly `student_access` cookie (sent automatically,
`credentials: 'include'`).

Common error codes: **400** validation, **401** unauthenticated/expired,
**403** wrong role / not your resource, **404** not found, **409** conflict
(duplicate/withdraw-not-allowed), **429** rate limited, **500** internal.

## Auth — Student backend

| Method | Route | Auth | Purpose | Request | Response | Errors |
|---|---|---|---|---|---|---|
| POST | `/auth/register` | public (rate-limited) | Create account + auto-login | `{fullName, enrollmentNumber, department, semester, email, password}` | `201 {data: profile}` | 400, 409, 429 |
| POST | `/auth/login` | public (rate-limited) | Login | `{enrollmentNumber, password}` | `{data: profile}` | 400, 401, 403, 429 |
| POST | `/auth/refresh` | refresh cookie | Rotate access+refresh | — | `{data: profile}` | 401 |
| GET | `/auth/me` | student | Current profile | — | `{data: profile}` | 401, 404 |
| POST | `/auth/logout` | student | Clear session | — | `{success}` | 401 |
| POST | `/auth/change-password` | student (rate-limited) | Change password | `{currentPassword, newPassword}` | `{success}` | 400, 401, 429 |

`profile` = `{id, role, name, email, enrollmentNumber, department, semester, contact, address, cgpa, skills[], linkedIn, portfolio, emergencyContact}`.

## Me (self-service) — Student backend

| Method | Route | Auth | Purpose | Request | Response |
|---|---|---|---|---|---|
| GET | `/me/profile` | student | Merged profile | — | `{data: profile}` |
| PATCH | `/me/profile` | student | Update personal fields only | `{contact?, email?, address?, skills?[], linkedIn?, portfolio?, emergencyContact?}` | `{data: profile}` |
| GET | `/me/applications` | student | Own applications | — | `{data: Application[]}` |
| GET | `/me/training` | student | Own training (read gateway) | — | `{data: TrainingInfo\|null}` |
| GET | `/me/notifications` | student | Own notifications | — | `{data: Notification[]}` |
| GET | `/me/documents` | student | Document references | — | `{data: DocumentRef[]}` |

## Advertisements (read gateway, TEC-owned data) — Student backend

| Method | Route | Auth | Purpose | Response |
|---|---|---|---|---|
| GET | `/advertisements?q=` | student | List published internships | `{data: Internship[]}` |
| GET | `/advertisements/:id` | student | One internship | `{data: Internship}` |

## Applications (reads gateway) — Student backend

| Method | Route | Auth | Purpose | Response |
|---|---|---|---|---|
| GET | `/applications/:id` | student | Own application (scoped) | `{data: Application}` |

## Notifications (recipient-scoped writes on shared collection) — Student backend

| Method | Route | Auth | Purpose |
|---|---|---|---|
| PATCH | `/notifications/read-all` | student | Mark all own read |
| PATCH | `/notifications/:id/read` | student | Mark one own read |
| DELETE | `/notifications/:id` | student | Delete one own |

## Departments — Student backend

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/departments` | public | Registration dropdown (Admin-owned, read-only) |

## Applications + Documents (WRITES) — **TEC backend** (owner)

| Method | Route | Auth | Owner | Purpose | Errors |
|---|---|---|---|---|---|
| POST | `/applications` | student | TEC | Apply — `{advertisementId, formData?}` → `201 {data:{id,status,...}}` | 400, 404, 409 |
| DELETE | `/applications/:id` | student | TEC | Withdraw (only while `Applied`) | 403, 404, 409 |
| GET | `/applications/:id/documents/:type` | student | TEC | Download PDF (`application-pdf` / `offer-letter` / `completion-certificate`; `attendance-form` = Coordinator, pending) | 403, 404 |

## Health

| Method | Route | Auth |
|---|---|---|
| GET | `/api/health` | public |
