# Parul University — Student Internship Portal

The student-facing application of the four-portal Internship Management System
(Student · Coordinator · TEC Cell · Admin), all sharing one MongoDB database
(`parul_internship_system`).

Students self-register, browse and apply for internship advertisements, track
application status, view training, manage their personal profile, and download
generated documents.

- **Frontend:** Vite + React 19 + TypeScript (`src/`)
- **Backend:** Node + Express + Mongoose (`server/`)
- **Auth:** JWT in httpOnly cookies

## Status

**Feature-complete and frozen.** No further feature development — only bug
fixes, dependency updates, and maintenance.

## Quick start

```
# Backend
cd server && npm install && cp .env.example .env   # set MONGODB_URI + JWT secrets
npm run dev                                         # http://localhost:5000

# Frontend
cd .. && npm install && cp .env.example .env        # set VITE_TEC_API_URL
npm run dev                                          # http://localhost:5173
```
The TEC backend must also run (default `:4000`) for apply/withdraw/documents,
with its `STUDENT_JWT_ACCESS_SECRET` equal to this backend's `JWT_ACCESS_SECRET`.

## Documentation

| Doc | Contents |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Overview, responsibilities, ownership, flows, folder structure, deployment |
| [docs/API.md](docs/API.md) | Every endpoint: method, route, auth, owner, request/response, errors |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | Every environment variable |
| [docs/DATABASE.md](docs/DATABASE.md) | Collections, indexes, relationships, transactions, event sync |
| [docs/SECURITY.md](docs/SECURITY.md) | Auth, authorization, JWT, cookies, rate limiting, validation, headers, audit, residual risks |
| [docs/MAINTENANCE.md](docs/MAINTENANCE.md) | Deferred work, known limitations, technical debt, roadmap |
