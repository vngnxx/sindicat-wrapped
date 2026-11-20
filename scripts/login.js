// One-time Spotify login helper: starts a temporary server, opens the browser,
// and saves the refresh token into .env automatically.
// Usage: npm run login
const express = require("express");
const { exec } = require("child_process");
const spotify = require("../lib/spotify");
require("dotenv").config();

// Port harus sama dengan Redirect URI yang terdaftar di dashboard Spotify
// (mis. http://127.0.0.1:3000/callback) — jadi kita pakai 3000.
// Pastikan "npm start" TIDAK sedang berjalan saat login (biar port 3000 bebas).
const PORT = 3000;
const REDIRECT = `http://127.0.0.1:${PORT}/callback`;
const app = express();

app.get("/callback", async (req, res) => {
  if (req.query.error) {
    res.send("<h2>❌ Spotify mengembalikan error: " + req.query.error + "</h2><p>Pastikan Redirect URI di dashboard Spotify tepat sama: http://127.0.0.1:3000/callback</p>");
    console.error("Spotify authorize error:", req.query.error);
    process.exit(1);
  }
  try {
    const tokens = await spotify.exchangeCode(req.query.code);
    if (!tokens.refresh_token) throw new Error("No refresh token returned (try removing app authorization at spotify.com/account/applications and retry)");
    spotify.saveRefreshToken(tokens.refresh_token);
    res.send("<h2>✅ Spotify connected! You can close this tab.</h2>");
    console.log("\n✅ Spotify connected! Refresh token saved to .env");
    console.log("   Now run: npm start");
    process.exit(0);
  } catch (e) {
    res.send("<h2>❌ Login failed: " + e.message + "</h2>");
    console.error(e);
    process.exit(1);
  }
});

if (!process.env.SPOTIFY_CLIENT_ID) {
  console.error("Fill in SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET in .env first. See README.md");
  process.exit(1);
}

// Temporarily override redirect URI for this flow
spotify.exchangeCode = (() => {
  return async (code) => {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64"),
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT }),
    });
    if (!res.ok) throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);
    return res.json();
  };
})();

const authParams = new URLSearchParams({
  client_id: process.env.SPOTIFY_CLIENT_ID,
  response_type: "code",
  redirect_uri: REDIRECT,
  scope: "playlist-read-private playlist-modify-public user-read-playback-state user-modify-playback-state",
});

app.listen(PORT, () => {
  const url = `https://accounts.spotify.com/authorize?${authParams.toString()}`;
  console.log(`Opening browser for Spotify login on port ${PORT}…`);
  const open = process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
  exec(`${open} "${url}"`);
  console.log("If the browser did not open, paste this URL manually:\n" + url);
});
