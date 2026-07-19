const mongoose = require('mongoose');
const { env } = require('./env');

/**
 * Connect to the shared MongoDB Atlas database (parul_internship_system).
 * Idempotent — safe to call multiple times.
 */
let connecting = null;

// Resilience tuning for the shared Atlas cluster (M0 is TLS-flaky under load):
// small pool = fewer concurrent handshakes; retryReads recovers transient blips;
// a relaxed heartbeat reduces background connection churn.
const CONNECT_OPTIONS = {
  serverSelectionTimeoutMS: 15000,
  retryReads: true,
  maxPoolSize: 5,
  minPoolSize: 0,
  heartbeatFrequencyMS: 30000,
};

const MAX_CONNECT_ATTEMPTS = 8;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (connecting) return connecting;

  if (!env.mongoUri) {
    throw new Error('MONGODB_URI is not set. Configure it in server/.env');
  }

  // Retry with exponential backoff + jitter so a single flaky TLS handshake at
  // startup doesn't kill the process (Atlas M0 rejects handshakes under load).
  connecting = (async () => {
    for (let attempt = 1; attempt <= MAX_CONNECT_ATTEMPTS; attempt++) {
      try {
        const m = await mongoose.connect(env.mongoUri, {
          dbName: env.mongoDbName,
          ...CONNECT_OPTIONS,
        });
        console.log(`✅  MongoDB connected → ${env.mongoDbName}`);
        return m;
      } catch (err) {
        await mongoose.disconnect().catch(() => {});
        if (attempt >= MAX_CONNECT_ATTEMPTS) {
          connecting = null;
          throw err;
        }
        const delay = Math.min(1000 * 2 ** (attempt - 1), 15000) + Math.floor(Math.random() * 500);
        console.warn(
          `⚠️  MongoDB connect attempt ${attempt}/${MAX_CONNECT_ATTEMPTS} failed (${err.message?.slice(0, 60)}); retrying in ${delay}ms`,
        );
        await sleep(delay);
      }
    }
    throw new Error('MongoDB connection: exhausted retries');
  })();

  return connecting;
}

module.exports = connectDB;
