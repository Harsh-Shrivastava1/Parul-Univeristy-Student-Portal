const mongoose = require('mongoose');

/**
 * MongoDB-backed store for express-rate-limit (v7).
 *
 * The default in-memory store counts per Node process, so under PM2 cluster
 * (multiple workers) each worker keeps its own tally and the effective limit is
 * multiplied by the worker count. This store keeps a single shared count in the
 * existing Atlas DB — cluster-safe, no Redis, no new service.
 *
 * It FAILS OPEN: any DB hiccup returns a permissive result so a Mongo blip can
 * never lock out legitimate auth traffic (pair with `passOnStoreError: true`).
 * Expired windows are auto-removed by a TTL index on `expireAt`.
 */
class MongoRateStore {
  constructor(prefix = 'rl') {
    this.prefix = prefix;
    this.windowMs = 60_000;
    this.collectionName = 'rateLimits';
    this.ttlEnsured = false;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  _coll() {
    const db = mongoose.connection && mongoose.connection.db;
    if (!db) return null;
    const c = db.collection(this.collectionName);
    if (!this.ttlEnsured) {
      this.ttlEnsured = true;
      c.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
    }
    return c;
  }

  async increment(key) {
    const now = Date.now();
    const resetDefault = new Date(now + this.windowMs);
    try {
      const c = this._coll();
      if (!c) return { totalHits: 1, resetTime: resetDefault }; // fail open
      const _id = `${this.prefix}:${key}`;
      // Atomic: if the window is still valid increment, else start a fresh window.
      const res = await c.findOneAndUpdate(
        { _id },
        [
          {
            $set: {
              count: {
                $cond: [{ $gt: ['$expireAt', new Date(now)] }, { $add: [{ $ifNull: ['$count', 0] }, 1] }, 1],
              },
              expireAt: {
                $cond: [{ $gt: ['$expireAt', new Date(now)] }, '$expireAt', resetDefault],
              },
            },
          },
        ],
        { upsert: true, returnDocument: 'after' },
      );
      const doc = res && (res.value !== undefined ? res.value : res);
      if (!doc || typeof doc.count !== 'number') return { totalHits: 1, resetTime: resetDefault };
      return { totalHits: doc.count, resetTime: doc.expireAt || resetDefault };
    } catch {
      return { totalHits: 1, resetTime: resetDefault }; // fail open
    }
  }

  async decrement(key) {
    try {
      const c = this._coll();
      if (c) await c.updateOne({ _id: `${this.prefix}:${key}`, count: { $gt: 0 } }, { $inc: { count: -1 } });
    } catch {
      /* best-effort */
    }
  }

  async resetKey(key) {
    try {
      const c = this._coll();
      if (c) await c.deleteOne({ _id: `${this.prefix}:${key}` });
    } catch {
      /* best-effort */
    }
  }
}

module.exports = { MongoRateStore };
