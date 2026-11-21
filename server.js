// Cafe Jukebox — guest song-request system backed by one shared Spotify playlist.
// Guests: search songs, request them. Owner: connects Spotify once via /login.
const express = require("express");
require("dotenv").config();

const spotify = require("./lib/spotify");
const store = require("./lib/store");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const {
  SPOTIFY_PLAYLIST_ID,
  PORT = 3000,
  MAX_SONGS_PER_HOUR = 10,
} = process.env;

if (!SPOTIFY_PLAYLIST_ID) {
  console.error("Missing SPOTIFY_PLAYLIST_ID in .env — see README.md");
  process.exit(1);
}

// ---------- Spotify OAuth (owner connects once) ----------
app.get("/login", (req, res) => res.redirect(spotify.authUrl()));
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing code");
  try {
    const tokens = await spotify.exchangeCode(code);
    spotify.saveRefreshToken(tokens.refresh_token);
    res.send("<h2>Spotify connected!</h2>You can close this tab and restart the server.");
  } catch (e) {
    res.status(500).send("Spotify login failed: " + e.message);
  }
});

// ---------- Guest API ----------
app.get("/api/info", (req, res) => {
  res.json({
    name: process.env.CAFE_NAME || "SINDICATE WRAPPED",
    connected: !!spotify.getRefreshToken(),
    debug: {
      refreshTokenLength: (process.env.SPOTIFY_REFRESH_TOKEN || "").length,
      refreshTokenStart: (process.env.SPOTIFY_REFRESH_TOKEN || "").slice(0, 6),
      refreshTokenEnd: (process.env.SPOTIFY_REFRESH_TOKEN || "").slice(-6),
      clientIdStart: (process.env.SPOTIFY_CLIENT_ID || "").slice(0, 6),
      clientIdEnd: (process.env.SPOTIFY_CLIENT_ID || "").slice(-6),
      clientIdLength: (process.env.SPOTIFY_CLIENT_ID || "").length,
      secretStart: (process.env.SPOTIFY_CLIENT_SECRET || "").slice(0, 6),
      secretEnd: (process.env.SPOTIFY_CLIENT_SECRET || "").slice(-6),
      secretLength: (process.env.SPOTIFY_CLIENT_SECRET || "").length,
      playlistIdSet: !!process.env.SPOTIFY_PLAYLIST_ID,
    },
  });
});

app.get("/api/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (q.length < 2) return res.json({ tracks: [] });
  try {
    const data = await spotify.api(`/search?type=track&limit=10&q=${encodeURIComponent(q)}`);
    res.json({
      tracks: data.tracks.items.map((t) => ({
        id: t.id,
        uri: t.uri,
        name: t.name,
        artists: t.artists.map((a) => a.name).join(", "),
        album: t.album.name,
        image: t.album.images[t.album.images.length - 1]?.url,
      })),
    });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.get("/api/queue", async (req, res) => {
  try {
    const data = await spotify.api(`/playlists/${SPOTIFY_PLAYLIST_ID}/tracks?limit=20&fields=next,items(track(uri,id,name,artists(name),album(name,images(url))))`);
    res.json({
      tracks: data.items.map((it) => it.track).filter(Boolean).map((t) => ({
        id: t.id,
        uri: t.uri,
        name: t.name,
        artists: (t.artists || []).map((a) => a.name).join(", "),
        image: t.album?.images?.[t.album.images.length - 1]?.url,
      })),
    });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.post("/api/request", async (req, res) => {
  const { uri } = req.body || {};
  if (!uri || !uri.startsWith("spotify:track:")) return res.status(400).json({ error: "Lagu tidak valid" });
  if (!spotify.getRefreshToken()) return res.status(503).json({ error: "Kafe belum menghubungkan Spotify" });

  try {
    // Duplicate prevention: is the track already in the playlist?
    const data = await spotify.api(`/playlists/${SPOTIFY_PLAYLIST_ID}/tracks?limit=100&fields=next,items(track(uri))`);
    const existing = new Set(data.items.map((it) => it.track?.uri).filter(Boolean));
    if (existing.has(uri)) {
      return res.status(409).json({ error: "Lagu itu sudah ada di antrean!" });
    }

    // Simple rate limit: max N requests per rolling hour
    const check = store.checkRateLimit(Number(MAX_SONGS_PER_HOUR));
    if (!check.ok) {
      return res.status(429).json({ error: `Terlalu banyak permintaan sekarang — coba lagi dalam ${check.waitMinutes} menit` });
    }

    await spotify.api(`/playlists/${SPOTIFY_PLAYLIST_ID}/tracks?uris=${encodeURIComponent(uri)}`, { method: "POST" });
    store.recordRequest(uri);
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// ---------- Host/admin API ----------
app.get("/api/admin/devices", async (req, res) => {
  try {
    const data = await spotify.api("/me/player/devices");
    res.json({ devices: data.devices });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.post("/api/admin/play", async (req, res) => {
  try {
    const { deviceId, uri } = req.body || {};
    const body = uri ? { uris: [uri] } : {};
    await spotify.api(`/me/player/play?device_id=${encodeURIComponent(deviceId || "")}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.post("/api/admin/pause", async (req, res) => {
  try {
    const { deviceId } = req.body || {};
    await spotify.api(`/me/player/pause?device_id=${encodeURIComponent(deviceId || "")}`, { method: "PUT" });
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.post("/api/admin/skip", async (req, res) => {
  try {
    await spotify.api("/me/player/next", { method: "POST" });
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`SINDICATE WRAPPED berjalan di http://localhost:${PORT}`);
    if (!spotify.getRefreshToken()) {
      console.log(`⚠  Spotify belum terhubung — buka http://localhost:${PORT}/login di browser.`);
    }
  });
}
