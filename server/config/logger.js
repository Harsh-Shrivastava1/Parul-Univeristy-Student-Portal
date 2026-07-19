/** Minimal structured JSON logger (stdout/stderr). No PII in messages. */
function emit(level, message, meta) {
  const entry = { level, message, time: new Date().toISOString(), ...(meta || {}) };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else console.log(line);
}

module.exports = {
  info: (message, meta) => emit('info', message, meta),
  warn: (message, meta) => emit('warn', message, meta),
  error: (message, meta) => emit('error', message, meta),
};
