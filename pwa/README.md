# Tracker Pengeluaran Bulanan — PWA Mandiri

Versi PWA (Progressive Web App) mandiri dari Tracker Pengeluaran Bulanan.
Bisa di-install ke home screen HP Android dan iOS, lalu dibuka seperti
aplikasi, termasuk saat offline.

## Data

- Data tersimpan di `localStorage` browser HP yang meng-install PWA ini.
- Terpisah dari app Muse dan dari versi fullstack (server + SQLite).
- **Tidak sinkron antar perangkat.** Data di satu HP tidak pindah ke HP
  lain atau ke laptop.
- **Peringatan:** menghapus data browser / data situs akan menghapus
  seluruh data tracker di perangkat itu. Tidak ada cadangan di server.

## Cara mengaktifkan (GitHub Pages)

1. Pastikan folder `pwa/` beserta isinya sudah ada di repo
   `monthly-tracker-expenses`, branch `main`.
2. Di GitHub, buka repo → **Settings → Pages**.
3. Source: **Deploy from a branch**, branch `main`, folder **/(root)**.
4. Simpan, lalu tunggu beberapa menit. PWA bisa dibuka di:

   https://testarossa-mykisah.github.io/monthly-tracker-expenses/pwa/

## Cara install di HP

- **Android (Chrome):** buka URL di atas → menu ⋮ → **Install app** /
  **Tambahkan ke Layar Utama**.
- **iOS (Safari):** buka URL di atas di Safari → tombol **Share** →
  **Add to Home Screen**. Install PWA di iOS hanya bisa lewat Safari,
  bukan dari browser lain.

## Tes lokal

Dari folder induk repo (yang berisi folder `pwa/`), jalankan:

```sh
python3 -m http.server 8000
```

Lalu buka `http://127.0.0.1:8000/pwa/` di browser komputer. Untuk
install dari HP sungguhan, pakai URL GitHub Pages (HTTPS) di atas,
bukan alamat lokal.

## Catatan ikon PNG

Empat file ikon PNG di `pwa/icons/` dibuat secara lokal:

- `apple-touch-icon.png` (180×180)
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)
- `icon-maskable-512.png` (512×512)

File-file ini **harus di-upload manual lewat web GitHub** ke folder
`pwa/icons/` di repo, karena konektor GitHub yang dipakai Muse tidak
bisa push file biner. Sampai keempat PNG itu ter-upload, service worker
tetap bekerja (ikon PNG ditoleransi gagal saat install) dan aplikasi
tetap bisa dibuka, tetapi ikon install mungkin memakai ikon bawaan
browser.

## Isi folder

| File | Keterangan |
| --- | --- |
| `index.html` | Halaman aplikasi (dari versi statis + tag PWA) |
| `styles.css` | Gaya flat lime/hitam (dari versi statis + safe-area) |
| `app.js` | Logika aplikasi (dari versi statis + registrasi service worker) |
| `manifest.webmanifest` | Manifest PWA |
| `sw.js` | Service worker, cache `tracker-pwa-v1` |
| `icons/` | Ikon aplikasi (SVG + 4 PNG) |
