# Student Portal — Database

One shared MongoDB database: `parul_internship_system`. Documents use a string
`id` field (Mongo `_id` is hidden via `toJSON`/`toObject`). Read models over
sibling-owned collections use `strict:false` to preserve the canonical shape.

## Collections the Student Portal touches

| Collection | Access from Student Portal | Owner |
|---|---|---|
| `users` | **create** (role=student), read | Admin (governance) / Student (self-create) |
| `students` | **create** + **update personal fields**, read | Student (personal) / Admin (academic master) |
| `departments` | read | Admin |
| `advertisements` | read | TEC |
| `applications` | read (writes via TEC API) | TEC |
| `trainings` | read | Coordinator |
| `notifications` | read + recipient `read`/delete | shared model |
| `auditLogs` | append | shared (Admin-governed) |

## Indexes (defined in `server/models/*`)

| Collection | Field | Type |
|---|---|---|
| `users` | `id` | unique |
| `users` | `email` | **unique** |
| `users` | `studentId`, `isDeleted` | index |
| `students` | `id` | unique |
| `students` | `enrollmentNumber` | **unique** |
| `students` | `studentId`, `userId`, `email` | index |
| `departments` | `id` | index |
| `auditLogs` | *(strict:false; timestamped)* | — |

> **Migration note:** the two unique indexes must be built against clean data.
> Dedupe any existing duplicate `users.email` / `students.enrollmentNumber`
> **before** deploying, or the index build fails.

## Relationships

- `users.studentId` ↔ `students.id` — **1:1** (every student user has exactly
  one profile; both set atomically at registration). `students.userId` is the
  reverse link. Non-student users have neither.
- `applications.advertisementId` → `advertisements.id` (N:1).
- `applications.studentId`/`userId`/`enrollmentNumber` → the student (resolved
  by any of the three in `utils/identity.js`).
- `trainings.applicationId`/`studentId` → the application/student.
- `notifications.recipientId`/`userId`/`studentId` → the recipient.

## Transactions

**Registration** creates `users` + `students` in one MongoDB transaction
(`authService.createLinkedAtomic`) so there is never an orphan user or profile.
A standalone-Mongo fallback performs sequential creates with a compensating
rollback (delete the student if the user insert fails). Duplicate-key (E11000)
errors are mapped to friendly 409 responses.

## Event synchronization (cross-portal)

Application workflow status is a **physical, event-synchronized** field on
`applications`, written only by its owner:
- The Coordinator writes `trainings.status`; a change-stream event is projected
  by the TEC backend onto `applications.status` (`Training In Progress` /
  `Training Completed`).
- The Student Portal **reads** the resulting status via the gateway and maps the
  stored value to the canonical UI vocabulary (`utils/mappers.js`, single
  translation point). It never writes application status.
