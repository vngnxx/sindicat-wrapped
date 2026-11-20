# 🎧 SINDICATE WRAPPED

Tamu kafe memindai QR code di meja, memilih lagu lewat ponsel, dan lagunya
langsung masuk ke **satu playlist Spotify bersama** yang diputar di kafe.
Tanpa instal aplikasi, tanpa perlu WiFi kafe: QR mengarah ke situs publik.

## Isi proyek

- **Halaman tamu** (`/`) — cari lagu, tombol "＋ Minta", konfirmasi, dan tampilan antrean langsung
- **Tampilan host** (`/admin.html`) — lihat antrean, pilih perangkat pemutar, Putar / Jeda / Lewati
- **Cegah duplikat** — lagu yang sudah ada di playlist tidak bisa ditambahkan lagi
- **Batas laju** — maksimal `MAX_SONGS_PER_HOUR` permintaan per jam (bisa diatur di `.env`)
- **Pembuat QR** — `sindicat-wrapped-qr.png` + `sindicat-wrapped-qr.svg` siap cetak
- **Logo** — `public/logo.png` (versi ringan) dipakai di halaman; `logo-sindicate-wrapped.png` di folder induk adalah versi kualitas penuh untuk poster

## Persiapan sekali saja (sekitar 15 menit)

### 1. Buat aplikasi Spotify

1. Buka <https://developer.spotify.com/dashboard> dan masuk dengan akun Spotify.
2. Klik **Create app**. Namai misalnya "SINDICATE WRAPPED".
3. Di **Redirect URIs** tambahkan **keduanya**:
   - `http://localhost:3000/callback`
   - `https://URL-APLIKASIMU/callback` (tambahkan setelah deploy — lihat langkah 3)
4. Di **Which API/SDKs are you planning to use?** pilih **Web API**.
5. Salin **Client ID** dan **Client secret** (klik "View client secret").

### 2. Buat playlist kafe

Di aplikasi Spotify, buat playlist (misalnya "SINDICATE WRAPPED"). Salin ID-nya
dari URL — bagian setelah `playlist/`, contoh:
`https://open.spotify.com/playlist/3cYo...` → `3cYo...`

### 3. Isi `.env`

```bash
cp .env.example .env
```

Lalu edit `.env` dan masukkan `SPOTIFY_CLIENT_ID`,
`SPOTIFY_CLIENT_SECRET`, dan `SPOTIFY_PLAYLIST_ID`.
Jangan pernah commit `.env` — sudah masuk `.gitignore`.

### 4. Hubungkan akun Spotify (sekali saja)

```bash
npm install
npm run login
```

Browser terbuka — masuk dengan akun Spotify **kafe** dan setujui aksesnya.
Refresh token tersimpan otomatis ke `.env`. Ini cukup dilakukan sekali.

### 5. Jalankan

```bash
npm start
```

- Halaman tamu: <http://localhost:3000>
- Tampilan host: <http://localhost:3000/admin.html>

Coba halaman tamu: cari lagu dan minta — lagunya akan muncul di playlist
Spotify kamu.

## Deploy gratis ke Vercel (panduan pemula, tanpa pengalaman coding)

Vercel dipilih karena paket gratisnya cocok untuk aplikasi ini dan tidak perlu
kartu kredit. Ikuti langkah berikut dari browser.

### Langkah A — Buat akun GitHub dan unggah proyek

1. Buka <https://github.com/signup> dan buat akun gratis (butuh email).
2. Setelah masuk, buka <https://github.com/new>.
3. Isi **Repository name**: `sindicat-wrapped` (boleh nama lain).
4. Pilih **Public**, jangan centang apa pun, klik **Create repository**.
5. Di halaman yang muncul, klik tautan **uploading an existing file**.
6. Seret **seluruh isi** folder `cafe-jukebox` ke halaman itu
   (**JANGAN** ikutkan folder `node_modules` dan file `.env` — .env berisi
   kunci rahasia dan tidak boleh diunggah).
7. Klik **Commit changes**. Proyek sekarang ada di GitHub.

### Langkah B — Buat akun Vercel dan deploy

1. Buka <https://vercel.com/signup> dan pilih **Continue with GitHub**
   (pakai akun GitHub yang tadi dibuat).
2. Setelah masuk, klik **Add New… → Project**.
3. Di daftar repo, cari `sindicat-wrapped` dan klik **Import**.
4. Jangan ubah apa pun di pengaturan build — langsung klik
   **Deploy** dan tunggu ±1 menit.
5. Selesai — kamu mendapat URL seperti `https://sindicat-wrapped.vercel.app`.
   Itu adalah halaman tamu yang akan dibuka lewat QR.

### Langkah C — Isi Environment Variables di Vercel

1. Di dashboard proyek Vercel, buka tab **Settings → Environment Variables**.
2. Tambahkan satu per satu variabel berikut (nilainya diambil dari file `.env`
   di komputermu):

   | Name | Value |
   |---|---|
   | `SPOTIFY_CLIENT_ID` | Client ID dari dashboard Spotify |
   | `SPOTIFY_CLIENT_SECRET` | Client secret dari dashboard Spotify |
   | `SPOTIFY_REDIRECT_URI` | `https://nama-aplikasimu.vercel.app/callback` |
   | `SPOTIFY_REFRESH_TOKEN` | nilai `SPOTIFY_REFRESH_TOKEN` dari `.env` |
   | `SPOTIFY_PLAYLIST_ID` | ID playlist kafe |
   | `GUEST_URL` | `https://nama-aplikasimu.vercel.app` |
   | `MAX_SONGS_PER_HOUR` | `10` |

3. Klik **Save** setiap kali menambah satu variabel.
4. Buka tab **Deployments**, cari deploy paling atas, klik menu ⋯ →
   **Redeploy** supaya variabel baru ikut aktif.

### Langkah D — Daftarkan URL live di Spotify

1. Buka <https://developer.spotify.com/dashboard> → aplikasimu → **Settings**.
2. Di **Redirect URIs**, tambahkan `https://nama-aplikasimu.vercel.app/callback`
   lalu **Add** dan **Save**.

### Langkah E — Uji halaman live

Buka `https://nama-aplikasimu.vercel.app` di ponsel: cari lagu, minta, dan
pastikan lagunya masuk ke playlist Spotify. Kalau muncul "Kafe belum
menghubungkan Spotify", berarti `SPOTIFY_REFRESH_TOKEN` di Vercel belum benar —
jalankan `npm run login` di komputer, lalu salin ulang nilai token-nya ke
Vercel (Langkah C) dan Redeploy.

### Langkah F — Buat QR code yang mengarah ke situs live

Di komputer (folder proyek), jalankan:

```bash
node scripts/generate-qr.js https://nama-aplikasimu.vercel.app
```

`qr-code` PNG/SVG yang baru otomatis mengarah ke halaman tamu yang live.
Cetak dan taruh di meja.

> Catatan: batas laju per jam disimpan di memori (reset saat server restart).
> Untuk satu kafe itu cukup — data lagu dan antrean sebenarnya ada di Spotify.

## Cetak QR code

```bash
node scripts/generate-qr.js https://nama-aplikasimu.vercel.app
```

Ini membuat `sindicat-wrapped-qr.png` (1024 px, siap cetak, berlabel
"SINDICATE WRAPPED") dan `sindicat-wrapped-qr.svg` (bisa dicetak ukuran apa
saja). Cetak, letakkan di meja, selesai. Bisa dibuat ulang kapan pun URL-nya
berubah. Untuk poster berlogo, gunakan `logo-sindicate-wrapped.png`.

## Pemakaian harian di kafe

1. Buka Spotify di perangkat kafe (laptop/tablet/speaker), putar playlistmu.
2. Tamu memindai QR → cari → minta. Lagu baru masuk di akhir antrean.
3. Buka `/admin.html` di perangkat kafe untuk melihat antrean dan memakai
   Putar / Jeda / Lewati (butuh Spotify Premium di akun kafe).

## Menyelesaikan masalah

- **"Kafe belum menghubungkan Spotify"** — jalankan lagi `npm run login`.
- **Lagu tidak diputar / lewati gagal** — kontrol pemutaran butuh Spotify
  Premium dan perangkat aktif; pilih perangkatnya di `/admin.html`.
- **"Lagu itu sudah ada di antrean!"** — itu pencegah duplikat bekerja.
- Ganti password Spotify / mencabut akses? Jalankan `npm run login` lagi.
