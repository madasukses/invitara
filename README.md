# 💍 Invitara — Undangan Digital Pernikahan

## Struktur File
```
invitara/
├── index.html                  ← Landing page
├── auth.html                   ← Login & Register
├── dashboard-customer.html     ← Dashboard customer
├── dashboard-admin.html        ← Dashboard admin
├── undangan.html               ← Tampilan undangan untuk tamu
├── filter-ig.html              ← Generator filter Instagram Story
├── vercel.json                 ← URL routing
├── database.sql                ← Schema Supabase (jalankan sekali)
├── css/
│   └── style.css               ← Global CSS
├── js/
│   ├── supabase-config.js      ← ⚠️ Isi SUPABASE_URL & SUPABASE_KEY
│   ├── utils.js                ← Helper functions
│   ├── auth.js                 ← Login/register/logout
│   ├── customer.js             ← Logika dashboard customer
│   ├── admin.js                ← Logika dashboard admin
│   └── filter-ig.js            ← Canvas rendering filter IG
├── templates/                  ← Template undangan per tema
│   ├── sakura.html
│   ├── royal-gold.html
│   └── ...
└── images/
    ├── ornamen/                ← SVG ornamen dekoratif
    └── filter-ig-frames/       ← SVG frame story 1080×1920
```

## Setup

### 1. Supabase
1. Buka [supabase.com](https://supabase.com) → New Project
2. SQL Editor → paste isi `database.sql` → Run
3. Authentication → Providers → aktifkan Email + Google
4. Settings → API → copy URL dan anon key

### 2. Konfigurasi
Edit `js/supabase-config.js`:
```js
const SUPABASE_URL = 'https://xxxx.supabase.co'
const SUPABASE_KEY = 'eyJhbGci...'
```

### 3. Set Admin
Di Supabase SQL Editor:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'email-anda@gmail.com';
```

### 4. GitHub + Vercel
```bash
git init
git add .
git commit -m "init: invitara"
git remote add origin https://github.com/username/invitara.git
git push -u origin main
```
Lalu di [vercel.com](https://vercel.com) → New Project → Import dari GitHub.

## Paket
| Paket   | Harga     | Fitur |
|---------|-----------|-------|
| Gratis  | Rp 0      | Dasar + watermark |
| Standar | Rp 69.000 | Tanpa watermark, musik, galeri, filter IG |
| Premium | Rp 120.000| Semua + streaming, kado digital |

## URL Undangan
Setiap undangan punya URL unik: `invitara.id/nama-pasangan`

Diatur lewat `vercel.json` — semua path yang bukan halaman utama diarahkan ke `undangan.html`.
