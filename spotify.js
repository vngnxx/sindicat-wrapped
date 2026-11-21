// Minimal Spotify Web API client with automatic token refresh.
// Tokens are stored in .env (SPOTIFY_REFRESH_TOKEN / SPOTIFY_ACCESS_TOKEN).
const fs = require("fs");
const path = require("path");

const ENV_FILE = path.join(__dirname, "..", ".env");
const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI = "http://localhost:3000/callback",
  SPOTIFY_REFRESH_TOKEN = "",
  SPOTIFY_ACCESS_TOKEN = "",
} = process.env;

const SCOPES = [
  "playlist-read-private",
  "playlist-modify-public",
  "user-read-playback-state",
  "user-modify-playback-state",
].join(" ");

let accessToken = SPOTIFY_ACCESS_TOKEN;
let tokenExpiresAt = 0;

function requireCredentials() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error("Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET in .env");
  }
}

function getRefreshToken() {
  return SPOTIFY_REFRESH_TOKEN;
}

function saveRefreshToken(token) {
  let env = "";
  try { env = fs.readFileSync(ENV_FILE, "utf8"); } catch {}
  env = env
    .replace(/^SPOTIFY_REFRESH_TOKEN=.*$/m, "")
    .replace(/\n{3,}/g, "\n\n");
  fs.writeFileSync(ENV_FILE, env.trimEnd() + `\nSPOTIFY_REFRESH_TOKEN=${token}\n`);
  process.env.SPOTIFY_REFRESH_TOKEN = token;
}

async function token() {
  if (accessToken && Date.now() < tokenExpiresAt - 60000) return accessToken;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN || SPOTIFY_REFRESH_TOKEN;
  if (!refreshToken) throw new Error("Spotify not connected — visit /login first");
  console.log(`[spotify] refresh attempt: token length = ${refreshToken.length}, starts "${refreshToken.slice(0, 5)}", ends "${refreshToken.slice(-5)}"`);

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64"),
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error(`Token refresh failed (${res.status}). Reconnect at /login (sent token: ${refreshToken.length} chars)`);
  const data = await res.json();
  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  if (data.refresh_token) process.env.SPOTIFY_REFRESH_TOKEN = data.refresh_token;
  return accessToken;
}

async function api(pathname, options = {}) {
  const tok = await token();
  const res = await fetch("https://api.spotify.com/v1" + pathname, {
    ...options,
    headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify API ${res.status}: ${text.slice(0, 300)}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("json") ? res.json() : res.text();
}

async function exchangeCode(code) {
  requireCredentials();
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);
  return res.json();
}

function authUrl() {
  requireCredentials();
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: SCOPES,
  });
  return "https://accounts.spotify.com/authorize?" + params.toString();
}

module.exports = { api, authUrl, exchangeCode, getRefreshToken, saveRefreshToken };
