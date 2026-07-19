# Student Portal — Environment Variables

## Backend (`server/.env`)

| Variable | Purpose | Required | Default | Production recommendation |
|---|---|---|---|---|
| `PORT` | API port | No | `5000` | Set explicitly / behind proxy |
| `NODE_ENV` | Environment | No | `development` | `production` |
| `MONGODB_URI` | Shared Atlas connection string | **Yes** (to connect) | *(empty → throws)* | Least-privilege user, TLS |
| `MONGODB_DB_NAME` | Database name | No | `parul_internship_system` | Keep shared name |
| `JWT_ACCESS_SECRET` | Signs/verifies access tokens | **Yes — server won't boot without it** | *(none)* | Long random; **must equal TEC `STUDENT_JWT_ACCESS_SECRET`** |
| `JWT_REFRESH_SECRET` | Signs/verifies refresh tokens | **Yes — server won't boot without it** | *(none)* | Long random, distinct |
| `ACCESS_TOKEN_TTL` | Access token lifetime | No | `15m` | `15m` |
| `REFRESH_TOKEN_TTL` | Refresh token lifetime | No | `7d` | `7d` |
| `BCRYPT_ROUNDS` | Password hash cost | No | `12` | `12`+ |
| `FRONTEND_ORIGINS` | CORS allowlist (comma-separated) | No | localhost dev origins | Exact SPA origin(s), no `*` |
| `COOKIE_SAMESITE` | Cookie SameSite policy | No | `strict` | `strict` same-site; `none` cross-site (forces Secure) |
| `COOKIE_SECURE` | Override Secure flag | No | `true` in prod (`none`→always) | `true` (HTTPS) |

> The server calls `required()` for the two JWT secrets and `MONGODB_URI` is
> required to connect — **it fails fast rather than running with weak defaults.**

## Frontend (`.env`)

| Variable | Purpose | Required | Default | Production recommendation |
|---|---|---|---|---|
| `VITE_STUDENT_API_URL` | Student backend base | No | `http://localhost:5000/api` | Deployed Student API URL |
| `VITE_TEC_API_URL` | TEC backend base (apply/withdraw/documents) | **Yes for writes** | falls back to Student URL | Deployed TEC API URL |
| `VITE_COORDINATOR_API_URL` | Reserved (training served via Student gateway today) | No | falls back to Student URL | Set when the Coordinator API exists |

## Cross-backend coupling

`JWT_ACCESS_SECRET` (this backend) **must** equal the TEC backend's
`STUDENT_JWT_ACCESS_SECRET`, and the TEC backend's `STUDENT_ORIGIN` must include
the Student SPA origin (CORS). If either drifts, apply/withdraw/document flows
fail with 401/CORS errors.
