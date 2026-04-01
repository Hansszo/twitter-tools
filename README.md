# 🤖 X/Twitter Unfollow Bot

Bot otomatis untuk mendeteksi dan unfollow akun yang tidak follow back di X (Twitter).

---

## ✨ Fitur

- Deteksi akun yang tidak follow back
- Auto unfollow dengan delay antar request
- Skip akun yellow verified (Business / Government / Legacy)
- Dry run mode (cek dulu tanpa eksekusi unfollow)
- Tampilan tabel hasil yang rapi di terminal

---

## 📋 Prasyarat

- [Node.js](https://nodejs.org/) v18 atau lebih baru
- Akun X/Twitter yang aktif
- Browser Chrome / Firefox

---

## 🔑 Cara Ambil AUTH_TOKEN dan CT0

Token ini diambil dari cookie browser saat kamu login ke X. Ikuti langkah berikut:

### 1. Login ke X/Twitter
Buka [https://x.com](https://x.com) dan login ke akun kamu.

### 2. Buka Developer Tools
Tekan `F12` atau klik kanan halaman → **Inspect** → pilih tab **Application**.

### 3. Buka bagian Cookies
Di panel kiri, klik **Cookies** → pilih `https://x.com`.

### 4. Cari token yang dibutuhkan

| Nama Cookie | Keterangan |
|---|---|
| `auth_token` | Token autentikasi sesi login kamu |
| `ct0` | CSRF token untuk validasi request |

Klik pada nama cookie tersebut, lalu salin nilai di kolom **Value**.

> ⚠️ **Jangan pernah share token ini ke siapapun.** Token ini sama seperti password — siapapun yang punya token ini bisa mengakses akun kamu.

### 5. Ambil USER_ID
USER_ID adalah ID numerik akun Twitter kamu. Cara paling mudah mendapatkannya:

1. Buka [https://tweeterid.com](https://tweeterid.com)
2. Masukkan username Twitter kamu (contoh: `@OxHanss`)
3. Klik **Convert** — hasilnya adalah USER_ID kamu

---

## ⚙️ Cara Install & Menjalankan

### 1. Clone repository
```bash
git clone https://github.com/username/repo-name.git
cd repo-name
```

### 2. Install dependensi
```bash
npm install dotenv
```

### 3. Buat file `.env`
Salin file contoh lalu isi dengan data kamu:
```bash
cp .env.example .env
```

Buka file `.env` dan isi:
```
AUTH_TOKEN=isi_dengan_auth_token_kamu
CT0=isi_dengan_ct0_kamu
TW_USERNAME=isi_dengan_username_kamu
USER_ID=isi_dengan_user_id_kamu
```

### 4. Cek konfigurasi bot
Buka file `unfollow-bot.js` dan sesuaikan bagian `CONFIG` di baris atas:

```js
const CONFIG = {
  delayBetweenRequests: 2000, // jeda antar request (ms), jangan terlalu kecil
  dryRun: false,              // true = hanya tampilkan hasil, tidak unfollow
  autoUnfollow: true,         // true = langsung unfollow setelah scan
  skipYellowVerified: true,   // true = skip akun Business/Government/Legacy
};
```

> 💡 Disarankan jalankan dulu dengan `dryRun: true` untuk melihat siapa saja yang akan di-unfollow sebelum eksekusi.

### 5. Jalankan bot
```bash
node unfollow-bot.js
```

---

## 📊 Contoh Output

```
╔══════════════════════════════════════════════╗
║     Follow Checker Bot - X/Twitter           ║
╚══════════════════════════════════════════════╝

⚙️  Dry Run       : false
⚙️  Auto Unfollow : true
⚙️  Skip Yellow ✓ : true

📥 Fetching following list for @OxHanss...
✅ Total following: 320

👤 Not Following Back — 87 accounts:
────────────────────────────────────────────────────────────────────────
No      Username               Name                   Tweets  Followers
────────────────────────────────────────────────────────────────────────
1       @contohakun1           Nama Akun 1               142        530
2    🟡 @contohakun2           Nama Akun 2             4.2K       18K
...
```

---

## ⚠️ Disclaimer

- Penggunaan bot ini melanggar Terms of Service X/Twitter. Gunakan dengan risiko sendiri.
- Jangan set `delayBetweenRequests` terlalu kecil — bisa kena rate limit atau suspend.
- Token akan expired jika kamu logout dari browser. Ulangi langkah pengambilan token jika terjadi error autentikasi.

---

## 📄 Lisensi

MIT License — bebas digunakan dan dimodifikasi.
