# AGENTS.md — Student portal (`Parul-Student-Portal`)

**Read [`SYSTEM.md`](SYSTEM.md) first.** It describes all four portals, the
shared database, the application lifecycle, deployment and the decision log.
This file adds what is specific to this repo. Where `docs/` or `README.md`
disagree with the code, they are stale: the code wins, then `SYSTEM.md`.

## What this portal owns

* **Student self-signup:** creates `users` (role `student`) and `students`,
  handles email verification and password reset, and lets students edit their
  own profile.
* **Student notifications:** the `applications` change-stream watcher creates
  in-app notifications.
* **It does NOT write `applications`.** Apply, withdraw and document
  downloads go **directly from the SPA to the Internship Cell (TEC) backend**.
  Training documents come from the Coordinator backend.
* Production URL: `https://student.internship.paruluniversity.ac.in`.

## Layout and commands

```
src/      Vite + React 19 + TS SPA (pages/, components/, services/, lib/apiClient.ts)
server/   CommonJS Express (index.js → routes/ → controllers/ → services/; models/, utils/)
```

```bash
npm ci && npm run dev                   # SPA :5173 (vite proxies /api → :5002)
cd server && npm ci && npm run dev      # API :5002 (nodemon) — NOT 5000 (macOS AirPlay)
npm run build                           # tsc -b && vite build → dist/ (Nginx serves it directly)
```

**Frontend env** (`.env` / `.env.production`):

| Variable | Points to | Notes |
|---|---|---|
| `VITE_STUDENT_API_URL` | this portal's backend | `/api` in production |
| `VITE_TEC_API_URL` | Internship Cell backend | **required**, no fallback |
| `VITE_COORDINATOR_API_URL` | Coordinator backend | **required**, no fallback |

## Key files

| Concern | File |
|---|---|
| Signup, verify, re-signup 24 h rule, login order, reset | `server/services/authService.js` |
| Env (`JWT_ACCESS_SECRET` = TEC/Coordinator `STUDENT_JWT_ACCESS_SECRET`) | `server/config/env.js` |
| Origin guard (POST without an allowed Origin → 403) | `server/middleware/csrf.js` |
| Rate limit (500/15 min, Mongo-shared across cluster workers) | `server/middleware/rateLimit.js`, `middleware/mongoRateStore.js` |
| Status vocabulary for the UI | `server/utils/mappers.js` (`STATUS_MAP`), `src/components/shared/StatusBadge.tsx` |
| Notification watcher (instance 0 only) | `server/utils/applicationWatcher.js` |
| API clients for 3 backends, token refresh | `src/lib/apiClient.ts` |
| Login / Register / Verify pages | `src/pages/Login.tsx`, `Register.tsx`, `VerifyEmail.tsx` |
| Client-side application PDF | `src/utils/generatePDF.ts` |

## Gotchas

* **PM2 cluster × 2.** Anything stateful must be shared through Mongo (rate
  limit) or gated to `NODE_APP_INSTANCE=0` (the watcher).
* **Signup accepts only `@paruluniversity.ac.in`.** The Institute →
  Department pair is validated against Admin's `institutes`.
* **Unactivated accounts:**
  * Re-signup is refused while the link is live.
  * After the link expires, the old account is hard-deleted and replaced.
  * Login with the right password says "not activated".
* **Known bug:** `STATUS_MAP` lacks `Rejected by Department` and `Terminated`,
  so these show as "Applied" (`SYSTEM.md` §13 #1).
* **Status key `Returned to TEC Cell` stays as is** (it is data). It is
  displayed as "Returned to Internship Cell".
* **Test emails go only to the owner's own address.**
