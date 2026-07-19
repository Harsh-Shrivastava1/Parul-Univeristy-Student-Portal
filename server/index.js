const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { env } = require('./config/env');
const connectDB = require('./config/db');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { verifyEmailTransport } = require('./services/email/mailer');

const app = express();

// Correct client IPs when behind a reverse proxy (needed for rate limiting).
app.set('trust proxy', 1);

// ─── Middleware ───────────────────────────────────────────────────────────────
// Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
// HSTS (prod), etc. (JSON API — no CSP needed for HTML it does not serve.)
app.use(helmet());
app.use(
  cors({
    origin: env.frontendOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Parul Student Portal API is running', db: env.mongoDbName });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.path}` });
});

// Central error handler (last)
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error('❌  Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
  // Non-fatal: surface SMTP status at startup. Email is graceful/optional, so
  // a failed verification never aborts the boot (server keeps serving).
  verifyEmailTransport().catch(() => {});
  app.listen(env.port, () => {
    console.log(`🚀  Student Portal API on http://localhost:${env.port}`);
    console.log(`📡  API base: http://localhost:${env.port}/api`);
  });
};

start();
