// Simple in-memory rate limiting for song requests (one shared counter for the cafe).
// Note: counters reset when the server restarts — good enough for a cafe.
const timestamps = [];

function checkRateLimit(maxPerHour) {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  while (timestamps.length && timestamps[0] < oneHourAgo) timestamps.shift();
  if (timestamps.length >= maxPerHour) {
    const waitMs = timestamps[0] + 60 * 60 * 1000 - now;
    return { ok: false, waitMinutes: Math.max(1, Math.ceil(waitMs / 60000)) };
  }
  return { ok: true };
}

function recordRequest() {
  timestamps.push(Date.now());
}

module.exports = { checkRateLimit, recordRequest };
