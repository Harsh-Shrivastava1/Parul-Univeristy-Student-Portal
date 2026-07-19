const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

async function hashPassword(plain) {
  return bcrypt.hash(plain, env.bcryptRounds);
}

async function comparePassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

function signAccess(claims) {
  return jwt.sign(claims, env.jwt.accessSecret, { expiresIn: env.jwt.accessTtl });
}

function signRefresh(claims) {
  return jwt.sign(claims, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshTtl });
}

function verifyAccess(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

function verifyRefresh(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

module.exports = {
  hashPassword,
  comparePassword,
  signAccess,
  signRefresh,
  verifyAccess,
  verifyRefresh,
};
